import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { ExternalProvider } from '../../Models/api.models';
import { AuthService } from '../../Services/auth.service';

/**
 * Botones "Continuar con Google / GitHub". Son enlaces normales (navegacion completa): la API
 * redirige al proveedor y luego vuelve a /ingresar/externo.
 *
 * Se dibujan los dos desde el inicio (asi la pagina prerenderizada no salta al hidratar) y,
 * ya en el navegador, se quitan los que la API no tenga configurados.
 */
@Component({
  selector: 'app-social-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visibles().length) {
      <div class="social">
        <p class="social__divider"><span>{{ leyenda() }}</span></p>
        <div class="social__buttons">
          @for (proveedor of visibles(); track proveedor) {
            <a class="btn btn--ghost btn--block social__btn" [href]="auth.externalLoginUrl(proveedor, volver())">
              @if (proveedor === 'Google') {
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"/>
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/>
                  <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/>
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path fill="currentColor" d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"/>
                </svg>
              }
              <span>Continuar con {{ proveedor }}</span>
            </a>
          }
        </div>
      </div>
    }
  `
})
export class SocialLoginComponent {
  protected readonly auth = inject(AuthService);

  /** Ruta del portal a la que volver despues de entrar. */
  readonly volver = input('/catalogo');
  /** Texto del separador ("o ingresa con", "o regístrate con"). */
  readonly leyenda = input('o ingresa con');

  private readonly disponibles = signal<ExternalProvider[] | null>(null);
  protected readonly visibles = computed<ExternalProvider[]>(() => this.disponibles() ?? ['Google', 'GitHub']);

  constructor() {
    // Solo en el navegador: al prerenderizar no hay API a la que preguntar.
    afterNextRender(() => {
      this.auth.externalProviders().subscribe({
        next: (proveedores) => this.disponibles.set(proveedores),
        error: () => this.disponibles.set([])
      });
    });
  }
}
