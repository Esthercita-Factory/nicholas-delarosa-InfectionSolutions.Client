import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from './Icon.Component';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.kind">
          <app-icon [name]="toast.kind === 'error' ? 'alert' : toast.kind === 'ok' ? 'check' : 'package'" [size]="18" />
          <span>{{ toast.text }}</span>
          <button type="button" class="toast__close" (click)="toasts.dismiss(toast.id)" aria-label="Cerrar aviso">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
