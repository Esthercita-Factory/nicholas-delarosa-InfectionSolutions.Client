import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from '../Services/api.config';
import { AuthService } from '../Services/auth.service';

/**
 * Endpoints publicos de la API: no llevan token, y un 401 ahi no es "sesion vencida"
 * sino credenciales o enlace invalidos (lo muestra el formulario).
 */
const PUBLICOS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/external/'];

/**
 * Agrega "Authorization: Bearer <token>" a las peticiones a la API y, si la
 * API responde 401 (token vencido o invalido), cierra la sesion y lleva al
 * login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const esApi = req.url.startsWith(API_URL);
  const esAcceso = esApi && PUBLICOS.some((ruta) => req.url.startsWith(`${API_URL}${ruta}`));
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
