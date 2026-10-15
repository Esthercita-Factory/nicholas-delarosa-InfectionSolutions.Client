import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fieldErrors, problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { AuthLayoutComponent } from './AuthLayout.Component';
import { PASSWORD_RULES, politica } from './password-rules';

/** Pagina del enlace del correo (?email=&token=): nueva contraseña y la sesion queda iniciada. */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="form-title">Elige una contraseña nueva</h2>

      @if (!email() || !token()) {
        <div class="notice notice--error" role="alert">
          <app-icon name="alert" [size]="18" />
          <span>El enlace está incompleto. Ábrelo tal cual desde el correo o pide uno nuevo.</span>
        </div>
        <a routerLink="/recuperar" class="btn btn--primary btn--block">Pedir un enlace nuevo</a>
      } @else {
        <p class="muted">Para <strong>{{ email() }}</strong>.</p>

        @if (error()) {
          <div class="notice notice--error" role="alert">
            <app-icon name="alert" [size]="18" />
            <span>{{ error() }} @if (enlaceVencido()) { <a routerLink="/recuperar">Pedir otro enlace</a> }</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form">
          <label class="field">
            <span class="field__label">Nueva contraseña</span>
            <input type="password" formControlName="password" autocomplete="new-password" [class.is-invalid]="mensaje('password')" />
            @if (mensaje('password'); as m) { <span class="field__error">{{ m }}</span> }
          </label>

          <label class="field">
            <span class="field__label">Confirmar contraseña</span>
            <input type="password" formControlName="confirmPassword" autocomplete="new-password" [class.is-invalid]="mensaje('confirmPassword')" />
            @if (mensaje('confirmPassword'); as m) { <span class="field__error">{{ m }}</span> }
          </label>

          <ul class="rules" aria-label="Requisitos de la contraseña">
            @for (regla of reglas(); track regla.label) {
              <li [class.ok]="regla.ok"><app-icon [name]="regla.ok ? 'check' : 'minus'" [size]="14" /> {{ regla.label }}</li>
            }
          </ul>

          <button type="submit" class="btn btn--primary btn--block" [disabled]="sending()">
            @if (sending()) { <span class="spinner" aria-hidden="true"></span> Guardando… } @else { Cambiar contraseña <app-icon name="arrowRight" [size]="18" /> }
          </button>
        </form>
      }
    </app-auth-layout>
  `
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** Query params del enlace, enlazados por withComponentInputBinding. */
  readonly email = input<string>();
  readonly token = input<string>();

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly enlaceVencido = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, politica]],
      confirmPassword: ['', Validators.required]
    },
    {
      validators: (grupo: AbstractControl): ValidationErrors | null => {
        const confirmar = grupo.get('confirmPassword')?.value;
        return confirmar && grupo.get('password')?.value !== confirmar ? { distinta: true } : null;
      }
    }
  );

  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly reglas = computed(() => PASSWORD_RULES.map((regla) => ({ label: regla.label, ok: regla.test(this.password()) })));

  protected mensaje(campo: 'password' | 'confirmPassword'): string | null {
    const servidor = this.serverErrors()[campo];
    if (servidor) {
      return servidor;
    }

    const control = this.form.controls[campo];
    if (!control.touched) {
      return null;
    }

    if (campo === 'confirmPassword' && !control.errors && this.form.hasError('distinta')) {
      return 'Las contraseñas no coinciden.';
    }

    if (control.hasError('required')) {
      return campo === 'password' ? 'La contraseña es obligatoria.' : 'Confirma la contraseña.';
    }

    return control.hasError('politica') ? 'Aún no cumple los requisitos.' : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.enlaceVencido.set(false);
    this.serverErrors.set({});

    const datos = this.form.getRawValue();
    this.auth.resetPassword({ email: this.email()!, token: this.token()!, ...datos }).subscribe({
      next: (user) => {
        this.toasts.ok(`Listo, ${user.fullName.split(' ')[0]}: tu contraseña se cambió.`);
        void this.router.navigateByUrl('/catalogo');
      },
      error: (error: unknown) => {
        this.sending.set(false);
        const porCampo = fieldErrors(error);
        this.serverErrors.set(porCampo);
        // Sin errores por campo, el problema es el enlace (vencido o ya usado).
        this.enlaceVencido.set(Object.keys(porCampo).length === 0);
        this.error.set(Object.keys(porCampo).length ? 'Revisa la contraseña.' : problemMessage(error, 'No se pudo cambiar la contraseña.'));
      }
    });
  }
}
