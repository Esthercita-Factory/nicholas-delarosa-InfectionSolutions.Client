import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../Services/api.config';
import { AuthService } from '../Services/auth.service';

/**
 * Agrega "Authorization: Bearer <token>" a las peticiones a la API y, si la
 * API responde 401 (token vencido o invalido), cierra la sesion y lleva al
 * login. El login y el registro no llevan token: un 401 ahi es "credenciales
 * incorrectas" y lo muestra el formulario.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esApi = req.url.startsWith(API_URL);
  const esAcceso = req.url.startsWith(`${API_URL}/auth/login`) || req.url.startsWith(`${API_URL}/auth/register`);
  const token = esApi && !esAcceso ? auth.token() : null;

  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && esApi && !esAcceso) {
        auth.logout('expired', router.url);
      }

      return throwError(() => error);
    })
  );
};
