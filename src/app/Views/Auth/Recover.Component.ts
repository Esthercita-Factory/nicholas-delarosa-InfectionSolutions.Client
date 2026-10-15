import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { IconComponent } from '../Shared/Icon.Component';
import { AuthLayoutComponent } from './AuthLayout.Component';

/**
 * "Olvide mi contraseña". La API responde igual exista o no la cuenta, asi que el mensaje
 * final tampoco lo dice: "si el correo esta registrado, te llega un enlace".
 */
@Component({
  selector: 'app-recover',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="form-title">Recupera tu contraseña</h2>

      @if (enviadoA(); as correo) {
        <div class="sent" role="status">
          <span class="sent__icon"><app-icon name="mail" [size]="22" /></span>
          <p><strong>Revisa tu correo.</strong></p>
          <p class="muted">Si <strong>{{ correo }}</strong> tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva.
            Vence en una hora. Si no aparece, mira en spam o promociones.</p>
          <button type="button" class="btn btn--ghost" (click)="enviadoA.set(null)">Usar otro correo</button>
        </div>
      } @else {
        <p class="muted">Escribe el correo de tu cuenta y te enviamos un enlace para cambiarla.</p>

        @if (error()) {
          <div class="notice notice--error" role="alert"><app-icon name="alert" [size]="18" /><span>{{ error() }}</span></div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form">
          <label class="field">
            <span class="field__label">Correo</span>
            <input type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com"
                   [class.is-invalid]="invalido()" />
            @if (invalido()) {
              <span class="field__error">Escribe un correo válido.</span>
            }
          </label>

          <button type="submit" class="btn btn--primary btn--block" [disabled]="sending()">
            @if (sending()) { <span class="spinner" aria-hidden="true"></span> Enviando… } @else { Enviar enlace <app-icon name="arrowRight" [size]="18" /> }
          </button>
        </form>
      }

      <p class="form-switch">¿La recordaste? <a routerLink="/ingresar">Ingresa</a></p>
    </app-auth-layout>
  `
})
export class RecoverComponent {
  private readonly auth = inject(AuthService);

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly enviadoA = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]]
  });

  protected invalido(): boolean {
    const control = this.form.controls.email;
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const correo = this.form.getRawValue().email.trim();
    this.sending.set(true);
    this.error.set(null);

    this.auth.forgotPassword(correo).subscribe({
      next: () => {
        this.sending.set(false);
        this.enviadoA.set(correo);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.error.set(problemMessage(error, 'No se pudo enviar el enlace. Intenta de nuevo.'));
      }
    });
  }
}
