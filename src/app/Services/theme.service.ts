import { Injectable, signal } from '@angular/core';
import { storage } from './storage';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'is.portal.tema';

/**
 * Modo claro / oscuro. index.html ya aplico el tema antes de pintar (sin
 * parpadeo); aqui solo se lee y se cambia, con la transicion circular de
 * View Transitions cuando el navegador la soporta.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );

  toggle(origin?: { x: number; y: number }): void {
    const siguiente: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    const aplicar = () => {
      document.documentElement.setAttribute('data-theme', siguiente);
      this.theme.set(siguiente);
      storage.set(THEME_KEY, siguiente);
    };

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const conTransicion = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

    if (reducido || !conTransicion.startViewTransition || !origin) {
      aplicar();
      return;
    }

    const radio = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
    const transicion = conTransicion.startViewTransition(aplicar);
    void transicion.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0 at ${origin.x}px ${origin.y}px)`, `circle(${radio}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(.16, 1, .3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }
}
