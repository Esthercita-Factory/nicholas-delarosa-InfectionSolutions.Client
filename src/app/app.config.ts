import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { authInterceptor } from './Interceptors/auth.interceptor';
import { routes } from './router/app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Parametros de ruta y query (?q=, ?volver=) como inputs de los componentes.
      withComponentInputBinding(),
      // Transicion suave entre paginas donde el navegador la soporta.
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
  ]
};
