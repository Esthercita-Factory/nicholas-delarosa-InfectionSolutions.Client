import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../Services/toast.service';

/**
 * Vuelta de Google/GitHub: la API deja en el fragmento (#codigo=...&volver=...) un codigo de
 * un solo uso. El fragmento nunca viaja al servidor ni queda en sus logs; aqui se cambia por
 * la sesion y se sigue a la ruta pedida (o a completar los datos si la cuenta es nueva).
 */
@Component({
  selector: 'app-external-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="callback" role="status" aria-live="polite">
      <span class="spinner spinner--dark" aria-hidden="true"></span>
      <p>Iniciando sesión…</p>
    </div>
  `
})
export class ExternalCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);

  ngOnInit(): void {
    const datos = new URLSearchParams(this.route.snapshot.fragment ?? '');
    const codigo = datos.get('codigo');
    const volver = ExternalCallbackComponent.rutaLocal(datos.get('volver'));

    if (!codigo) {
      this.alLogin('No se pudo completar el inicio de sesión. Intenta de nuevo.');
      return;
    }

    this.auth.exchangeExternalCode(codigo).subscribe({
      next: (user) => {
        if (this.auth.needsProfile()) {
          void this.router.navigate(['/completar-datos'], { queryParams: { volver }, replaceUrl: true });
          return;
        }

        this.toasts.ok(`Hola, ${user.fullName.split(' ')[0]}.`);
        void this.router.navigateByUrl(volver, { replaceUrl: true });
      },
      error: (error: unknown) => this.alLogin(problemMessage(error, 'No se pudo completar el inicio de sesión.'))
    });
  }

  private alLogin(mensaje: string): void {
    void this.router.navigate(['/ingresar'], { queryParams: { externo: mensaje }, replaceUrl: true });
  }

  /** Solo rutas internas: un volver=https://... no saca al cliente del portal. */
  static rutaLocal(ruta: string | null): string {
    return ruta?.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/ingresar') ? ruta : '/catalogo';
  }
}
