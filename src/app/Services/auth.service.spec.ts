import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthResponse } from '../Models/api.models';
import { API_URL } from './api.config';
import { AuthService } from './auth.service';

const respuesta = (roles: string[], minutos = 120): AuthResponse => ({
  tokenType: 'Bearer',
  accessToken: 'jwt-de-prueba',
  expiresAt: new Date(Date.now() + minutos * 60_000).toISOString(),
  user: { id: 'user-1', email: 'laura@correo.com', fullName: 'Laura Mendoza', roles, customer: null }
});

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda el token de un cliente y expone su nombre', () => {
    const auth = TestBed.inject(AuthService);

    auth.login({ email: 'laura@correo.com', password: 'Cliente123*' }).subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush(respuesta(['Cliente']));

    expect(auth.token()).toBe('jwt-de-prueba');
    expect(auth.firstName()).toBe('Laura');
    expect(auth.initials()).toBe('LM');
    expect(localStorage.getItem('is.portal.session')).toContain('jwt-de-prueba');
  });

  it('rechaza cuentas de administrador: el portal es solo para clientes', () => {
    const auth = TestBed.inject(AuthService);
    let error: Error | undefined;

    auth.login({ email: 'admin@infection.com', password: 'Admin123*' }).subscribe({ error: (e: Error) => (error = e) });
    http.expectOne(`${API_URL}/auth/login`).flush(respuesta(['Administrador']));

    expect(error?.message).toContain('administrador');
    expect(auth.token()).toBeNull();
  });

  it('no restaura una sesion guardada que ya vencio', () => {
    localStorage.setItem('is.portal.session', JSON.stringify({
      token: 'viejo',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      user: respuesta(['Cliente']).user
    }));

    const auth = TestBed.inject(AuthService);

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('is.portal.session')).toBeNull();
  });

  it('al cerrar sesion limpia el token y va al login', () => {
    const auth = TestBed.inject(AuthService);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.login({ email: 'laura@correo.com', password: 'x' }).subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush(respuesta(['Cliente']));

    auth.logout('expired', '/carrito');

    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('is.portal.session')).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/ingresar'], { queryParams: { sesion: 'vencida', volver: '/carrito' } });
  });
});
