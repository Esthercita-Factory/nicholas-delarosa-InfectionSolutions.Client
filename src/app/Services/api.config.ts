import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ProblemDetails } from '../Models/api.models';

/** Base de la API: /api en produccion, http://localhost:5120/api en desarrollo. */
export const API_URL = environment.apiUrl;

/** Mensaje para mostrar de un error HTTP: el "detail" de ProblemDetails o uno generico. */
export function problemMessage(error: unknown, fallback = 'No se pudo completar la operación. Intenta de nuevo.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet o intenta en un momento.';
    }

    const problem = error.error as ProblemDetails | null;
    const primerCampo = problem?.errors ? Object.values(problem.errors)[0]?.[0] : undefined;
    return problem?.detail ?? primerCampo ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

/** Errores por campo ({ email: ['...'] }) para pintarlos junto a cada input. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) {
    return {};
  }

  const errors = (error.error as ProblemDetails | null)?.errors ?? {};
  return Object.fromEntries(Object.entries(errors).map(([campo, mensajes]) => [campo, mensajes[0] ?? '']));
}
