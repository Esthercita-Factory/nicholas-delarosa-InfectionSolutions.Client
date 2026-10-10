import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
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
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Ingreso y registro llegan prerenderizados (HTML listo): Angular los hidrata en vez de
    // volver a pintarlos, y withEventReplay no pierde un clic hecho antes de terminar.
    provideClientHydration(withEventReplay())
  ]
};
