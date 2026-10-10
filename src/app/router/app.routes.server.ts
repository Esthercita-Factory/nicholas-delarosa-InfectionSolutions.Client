import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * No hay servidor Node: el build genera HTML estatico solo para las pantallas
 * publicas (ingreso y registro), que asi se ven antes de que cargue Angular. El
 * resto depende de la sesion del cliente y se pinta en el navegador.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'ingresar', renderMode: RenderMode.Prerender },
  { path: 'registro', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
