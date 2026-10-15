import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { AuthLayoutComponent } from './AuthLayout.Component';
import { SocialLoginComponent } from './SocialLogin.Component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent, SocialLoginComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="form-title">Ingresar</h2>
      <p class="muted">Usa el correo con el que te registraste.</p>

      @if (sesion() === 'vencida') {
        <div class="notice notice--warn" role="alert">
          <app-icon name="alert" [size]="18" />
          <span>Tu sesión venció. Vuelve a ingresar para seguir comprando; tu carrito sigue guardado.</span>
        </div>
      }

      @if (error() ?? externo(); as mensaje) {
        <div class="notice notice--error" role="alert">
          <app-icon name="alert" [size]="18" /><span>{{ mensaje }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form">
        <label class="field">
          <span class="field__label">Correo</span>
          <input type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com"
                 [class.is-invalid]="invalid('email')" />
          @if (invalid('email')) {
            <span class="field__error">Escribe un correo válido.</span>
          }
        </label>

        <label class="field">
          <span class="field__label">Contraseña</span>
          <input type="password" formControlName="password" autocomplete="current-password"
                 [class.is-invalid]="invalid('password')" />
          @if (invalid('password')) {
            <span class="field__error">Escribe tu contraseña.</span>
          }
        </label>
        <a routerLink="/recuperar" class="form-link">¿Olvidaste tu contraseña?</a>

        <button type="submit" class="btn btn--primary btn--block" [disabled]="sending()">
          @if (sending()) { <span class="spinner" aria-hidden="true"></span> Ingresando… } @else { Ingresar <app-icon name="arrowRight" [size]="18" /> }
        </button>
      </form>

      <app-social-login [volver]="destino()" />

      <p class="form-switch">¿Primera vez? <a routerLink="/registro">Crea tu cuenta</a></p>
    </app-auth-layout>
  `
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** Query params (?sesion=vencida&volver=/carrito), enlazados por withComponentInputBinding. */
  readonly sesion = input<string>();
  readonly volver = input<string>();
  /** Mensaje cuando el inicio con Google/GitHub no se pudo completar (?externo=...). */
  readonly externo = input<string>();

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  protected invalid(campo: 'email' | 'password'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.toasts.ok(`Hola, ${user.fullName.split(' ')[0]}.`);
        void this.router.navigateByUrl(this.destino());
      },
      error: (error: unknown) => {
        this.sending.set(false);
        this.error.set(problemMessage(error, 'No se pudo iniciar sesión.'));
      }
    });
  }

  /** Solo rutas internas: un ?volver=https://... no debe sacar al cliente del portal. */
  protected destino(): string {
    const volver = this.volver();
    return volver?.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/ingresar') ? volver : '/catalogo';
  }
}
