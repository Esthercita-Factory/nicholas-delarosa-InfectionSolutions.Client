import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fieldErrors, problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { AuthLayoutComponent } from './AuthLayout.Component';

type Campo = 'fullName' | 'document' | 'age' | 'phone' | 'address';

/** Mismas reglas que el registro (y que el ViewModel de la API). */
const MENSAJES: Record<Campo, Record<string, string>> = {
  fullName: { required: 'El nombre es obligatorio.', maxlength: 'Máximo 120 caracteres.' },
  document: { required: 'El documento es obligatorio.', pattern: 'Entre 5 y 20 letras o números, sin puntos ni espacios.' },
  age: { required: 'La edad es obligatoria.', min: 'Debes ser mayor de edad.', max: 'Revisa la edad.' },
  phone: { required: 'El teléfono es obligatorio.', pattern: 'Solo números, espacios, guiones, paréntesis y + al inicio.' },
  address: { maxlength: 'Máximo 150 caracteres.' }
};

/**
 * Primera vez con Google o GitHub: el proveedor solo da nombre y correo. Antes de entrar al
 * catalogo se piden los datos de la ficha de cliente (los mismos del registro, sin contraseña).
 */
@Component({
  selector: 'app-complete-profile',
  imports: [ReactiveFormsModule, AuthLayoutComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="form-title">Completa tus datos</h2>
      <p class="muted">Ya casi. Con estos datos registramos tus compras y despachos; solo te los pedimos una vez.</p>
      <p class="account-chip"><app-icon name="mail" [size]="16" /> {{ auth.user()?.email }}</p>

      @if (error()) {
        <div class="notice notice--error" role="alert"><app-icon name="alert" [size]="18" /><span>{{ error() }}</span></div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form form--grid">
        <label class="field field--wide">
          <span class="field__label">Nombre completo</span>
          <input formControlName="fullName" autocomplete="name" [class.is-invalid]="mensaje('fullName')" />
          @if (mensaje('fullName'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Documento</span>
          <input formControlName="document" autocomplete="off" placeholder="1020458796" [class.is-invalid]="mensaje('document')" />
          @if (mensaje('document'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Edad</span>
          <input type="number" formControlName="age" min="18" max="120" inputmode="numeric" [class.is-invalid]="mensaje('age')" />
          @if (mensaje('age'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field field--wide">
          <span class="field__label">Teléfono</span>
          <input type="tel" formControlName="phone" autocomplete="tel" placeholder="+57 300 000 0000" [class.is-invalid]="mensaje('phone')" />
          @if (mensaje('phone'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field field--wide">
          <span class="field__label">Dirección de entrega <span class="optional">opcional</span></span>
          <input formControlName="address" autocomplete="street-address" placeholder="Calle 40 # 46-223, Barranquilla" [class.is-invalid]="mensaje('address')" />
          @if (mensaje('address'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <button type="submit" class="btn btn--primary btn--block field--wide" [disabled]="sending()">
          @if (sending()) { <span class="spinner" aria-hidden="true"></span> Guardando… } @else { Continuar al catálogo <app-icon name="arrowRight" [size]="18" /> }
        </button>
      </form>

      <p class="form-switch">¿No eres tú? <button type="button" class="link-btn" (click)="auth.logout()">Cerrar sesión</button></p>
    </app-auth-layout>
  `
})
export class CompleteProfileComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** A donde iba antes de que se le pidieran los datos. */
  readonly volver = input<string>();

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.maxLength(120)]],
    document: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{5,20}$/)]],
    age: [null as number | null, [Validators.required, Validators.min(18), Validators.max(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
    address: ['', Validators.maxLength(150)]
  });

  protected mensaje(campo: Campo): string | null {
    const servidor = this.serverErrors()[campo];
    if (servidor) {
      return servidor;
    }

    const control = this.form.controls[campo];
    if (!control.touched || !control.errors) {
      return null;
    }

    return MENSAJES[campo][Object.keys(control.errors)[0]!] ?? 'Revisa este campo.';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.serverErrors.set({});

    const datos = this.form.getRawValue();
    this.auth.completeProfile({ ...datos, address: datos.address.trim() || null }).subscribe({
      next: (user) => {
        this.toasts.ok(`Bienvenido, ${user.fullName.split(' ')[0]}. Te enviamos un correo de bienvenida.`);
        void this.router.navigateByUrl(this.destino());
      },
      error: (error: unknown) => {
        this.sending.set(false);
        const porCampo = fieldErrors(error);
        this.serverErrors.set(porCampo);
        this.error.set(Object.keys(porCampo).length ? 'Revisa los campos marcados.' : problemMessage(error, 'No se pudieron guardar tus datos.'));
      }
    });
  }

  private destino(): string {
    const volver = this.volver();
    return volver?.startsWith('/') && !volver.startsWith('//') && !volver.startsWith('/completar-datos') ? volver : '/catalogo';
  }
}
