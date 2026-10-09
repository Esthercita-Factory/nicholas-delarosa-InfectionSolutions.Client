import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../Services/theme.service';
import { IconComponent } from '../Shared/Icon.Component';

/** Marco de login y registro: la marca a la izquierda (oscura) y el formulario a la derecha. */
@Component({
  selector: 'app-auth-layout',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth">
      <aside class="auth__brand">
        <div class="brand brand--light">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__name">InfectionSolutions</span>
        </div>

        <div class="auth__pitch">
          <p class="eyebrow eyebrow--light">Portal de clientes</p>
          <h1 class="auth__title">Materiales para tu obra, sin intermediarios.</h1>
          <ul class="auth__points">
            <li><app-icon name="package" /> Catálogo con el stock real de la bodega.</li>
            <li><app-icon name="shield" /> Ves el IVA y el total antes de confirmar.</li>
            <li><app-icon name="mail" /> El comprobante en PDF llega a tu correo.</li>
          </ul>
        </div>

        <div class="tape tape--light" aria-hidden="true"></div>
        <p class="auth__foot">Norte – Centro Histórico, Barranquilla</p>
      </aside>

      <main class="auth__main">
        <button type="button" class="icon-btn auth__theme" (click)="theme.toggle({ x: $any($event).clientX, y: $any($event).clientY })"
                [attr.aria-label]="theme.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
          <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
        </button>
        <div class="auth__card">
          <ng-content />
        </div>
      </main>
    </div>
  `
})
export class AuthLayoutComponent {
  protected readonly theme = inject(ThemeService);
}
