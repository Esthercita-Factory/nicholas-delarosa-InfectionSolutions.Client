import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '../Services/api.config';
import { AuthService } from '../Services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('is.portal.session', JSON.stringify({
      token: 'jwt-vigente',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 'user-1', email: 'l@c.com', fullName: 'Laura', roles: ['Cliente'], customer: null }
    }));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  it('agrega Authorization: Bearer a las peticiones a la API', () => {
    http.get(`${API_URL}/products`).subscribe();

    expect(backend.expectOne(`${API_URL}/products`).request.headers.get('Authorization')).toBe('Bearer jwt-vigente');
  });

  it('no envia el token al login ni a otros dominios', () => {
    http.post(`${API_URL}/auth/login`, {}).subscribe();
    http.get('https://fonts.googleapis.com/css2').subscribe();

    expect(backend.expectOne(`${API_URL}/auth/login`).request.headers.has('Authorization')).toBe(false);
    expect(backend.expectOne('https://fonts.googleapis.com/css2').request.headers.has('Authorization')).toBe(false);
  });

  it('ante un 401 cierra la sesion como vencida', () => {
    const logout = vi.spyOn(auth, 'logout').mockImplementation(() => {});

    http.get(`${API_URL}/me/sales`).subscribe({ error: () => {} });
    backend.expectOne(`${API_URL}/me/sales`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(logout).toHaveBeenCalledWith('expired', expect.any(String));
  });

  it('un 401 del login no cierra nada: son credenciales incorrectas', () => {
    const logout = vi.spyOn(auth, 'logout');

    http.post(`${API_URL}/auth/login`, {}).subscribe({ error: () => {} });
    backend.expectOne(`${API_URL}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(logout).not.toHaveBeenCalled();
  });
});
