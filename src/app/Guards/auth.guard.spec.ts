import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';

const ejecutar = (guard: typeof authGuard, url = '/carrito') =>
  TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

describe('guards del portal', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
  });

  it('sin sesion manda al login recordando a donde iba', () => {
    const resultado = ejecutar(authGuard) as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/ingresar?volver=%2Fcarrito');
  });

  it('con sesion vigente deja pasar, y el login redirige al catalogo', () => {
    localStorage.setItem('is.portal.session', JSON.stringify({
      token: 'jwt',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      user: { id: 'u', email: 'l@c.com', fullName: 'Laura', roles: ['Cliente'], customer: null }
    }));

    expect(ejecutar(authGuard)).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(ejecutar(guestGuard) as UrlTree)).toBe('/catalogo');
  });
});
