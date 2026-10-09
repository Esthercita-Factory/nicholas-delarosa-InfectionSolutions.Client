import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';

/** Rutas del portal: exigen sesion de cliente vigente; si no, al login recordando a donde iba. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.token()) {
    return true;
  }

  if (auth.isAuthenticated()) {
    // Habia sesion pero el token vencio.
    auth.logout('expired', state.url);
    return false;
  }

  return router.createUrlTree(['/ingresar'], { queryParams: { volver: state.url } });
};

/** Login y registro: con sesion activa no tiene sentido verlos, se va al catalogo. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.token() ? inject(Router).createUrlTree(['/catalogo']) : true;
};
