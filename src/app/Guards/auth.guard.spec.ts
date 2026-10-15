import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard, profileGuard } from './auth.guard';

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

  const sesion = (customer: object | null) => localStorage.setItem('is.portal.session', JSON.stringify({
    token: 'jwt',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: { id: 'u', email: 'l@c.com', fullName: 'Laura', roles: ['Cliente'], customer }
  }));

  it('con sesion vigente deja pasar, y el login redirige al catalogo', () => {
    sesion({ id: 'c1', document: '1020', fullName: 'Laura', isActive: true });
    const router = TestBed.inject(Router);

    expect(ejecutar(authGuard)).toBe(true);
    expect(router.serializeUrl(ejecutar(guestGuard) as UrlTree)).toBe('/catalogo');
    expect(router.serializeUrl(ejecutar(profileGuard) as UrlTree)).toBe('/catalogo');
  });

  it('una cuenta de Google/GitHub sin ficha primero completa sus datos', () => {
    sesion(null);
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(ejecutar(authGuard) as UrlTree)).toBe('/completar-datos?volver=%2Fcarrito');
    expect(ejecutar(profileGuard, '/completar-datos')).toBe(true);
  });
});
