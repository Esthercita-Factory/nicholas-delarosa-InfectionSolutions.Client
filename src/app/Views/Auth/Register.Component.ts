import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fieldErrors, problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { AuthLayoutComponent } from './AuthLayout.Component';
import { PASSWORD_RULES, politica } from './password-rules';
import { SocialLoginComponent } from './SocialLogin.Component';

type Campo = 'document' | 'fullName' | 'age' | 'email' | 'phone' | 'address' | 'password' | 'confirmPassword';

/** Mismas reglas que los ViewModels de la API: el formulario avisa antes de enviar. */
const MENSAJES: Record<Campo, Record<string, string>> = {
  document: { required: 'El documento es obligatorio.', pattern: 'Entre 5 y 20 letras o números, sin puntos ni espacios.' },
  fullName: { required: 'El nombre es obligatorio.', maxlength: 'Máximo 120 caracteres.' },
  age: { required: 'La edad es obligatoria.', min: 'Debes ser mayor de edad.', max: 'Revisa la edad.' },
  email: { required: 'El correo es obligatorio.', email: 'Escribe un correo válido.' },
  phone: { required: 'El teléfono es obligatorio.', pattern: 'Solo números, espacios, guiones, paréntesis y + al inicio.' },
  address: { maxlength: 'Máximo 150 caracteres.' },
  password: { required: 'La contraseña es obligatoria.', politica: 'Aún no cumple los requisitos.' },
  confirmPassword: { required: 'Confirma la contraseña.', distinta: 'Las contraseñas no coinciden.' }
};


/** Validador del grupo: el error queda en el formulario y se muestra en "Confirmar contraseña". */
function coinciden(grupo: AbstractControl): ValidationErrors | null {
  const confirmar = grupo.get('confirmPassword')?.value;
  return confirmar && grupo.get('password')?.value !== confirmar ? { distinta: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, IconComponent, SocialLoginComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <h2 class="form-title">Crea tu cuenta</h2>
      <p class="muted">Con tu cuenta compras en línea y recibes cada comprobante en tu correo.</p>

      @if (error()) {
        <div class="notice notice--error" role="alert"><app-icon name="alert" [size]="18" /><span>{{ error() }}</span></div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="form form--grid">
        <label class="field">
          <span class="field__label">Documento</span>
          <input formControlName="document" inputmode="text" autocomplete="off" placeholder="1020458796" [class.is-invalid]="message('document')" />
          @if (message('document'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Edad</span>
          <input type="number" formControlName="age" min="18" max="120" inputmode="numeric" [class.is-invalid]="message('age')" />
          @if (message('age'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field field--wide">
          <span class="field__label">Nombre completo</span>
          <input formControlName="fullName" autocomplete="name" placeholder="Laura Mendoza" [class.is-invalid]="message('fullName')" />
          @if (message('fullName'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Correo</span>
          <input type="email" formControlName="email" autocomplete="email" placeholder="tu@correo.com" [class.is-invalid]="message('email')" />
          @if (message('email'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Teléfono</span>
          <input type="tel" formControlName="phone" autocomplete="tel" placeholder="+57 300 000 0000" [class.is-invalid]="message('phone')" />
          @if (message('phone'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field field--wide">
          <span class="field__label">Dirección de entrega <span class="optional">opcional</span></span>
          <input formControlName="address" autocomplete="street-address" placeholder="Calle 40 # 46-223, Barranquilla" [class.is-invalid]="message('address')" />
          @if (message('address'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Contraseña</span>
          <input type="password" formControlName="password" autocomplete="new-password" [class.is-invalid]="message('password')" />
          @if (message('password'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <label class="field">
          <span class="field__label">Confirmar contraseña</span>
          <input type="password" formControlName="confirmPassword" autocomplete="new-password" [class.is-invalid]="message('confirmPassword')" />
          @if (message('confirmPassword'); as m) { <span class="field__error">{{ m }}</span> }
        </label>

        <ul class="rules field--wide" aria-label="Requisitos de la contraseña">
          @for (regla of reglas(); track regla.label) {
            <li [class.ok]="regla.ok"><app-icon [name]="regla.ok ? 'check' : 'minus'" [size]="14" /> {{ regla.label }}</li>
          }
        </ul>

        <button type="submit" class="btn btn--primary btn--block field--wide" [disabled]="sending()">
          @if (sending()) { <span class="spinner" aria-hidden="true"></span> Creando tu cuenta… } @else { Crear cuenta <app-icon name="arrowRight" [size]="18" /> }
        </button>
      </form>

      <app-social-login leyenda="o regístrate con" />

      <p class="form-switch">¿Ya tienes cuenta? <a routerLink="/ingresar">Ingresa</a></p>
    </app-auth-layout>
  `
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Errores que devolvio la API por campo (documento repetido, contraseña rechazada...). */
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      document: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]{5,20}$/)]],
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      age: [null as number | null, [Validators.required, Validators.min(18), Validators.max(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,20}$/)]],
      address: ['', Validators.maxLength(150)],
      password: ['', [Validators.required, politica]],
      confirmPassword: ['', Validators.required]
    },
    { validators: coinciden }
  );

  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  protected readonly reglas = computed(() => PASSWORD_RULES.map((regla) => ({ label: regla.label, ok: regla.test(this.password()) })));

  constructor() {
    // Al editar un campo, su error del servidor deja de aplicar.
    this.form.valueChanges.subscribe(() => {
      if (Object.keys(this.serverErrors()).length) {
        const vigentes = Object.fromEntries(
          Object.entries(this.serverErrors()).filter(([campo]) => !this.form.get(campo)?.dirty)
        );
        this.serverErrors.set(vigentes);
      }
    });
  }

  protected message(campo: Campo): string | null {
    const servidor = this.serverErrors()[campo];
    if (servidor) {
      return servidor;
    }

    const control = this.form.controls[campo];
    if (campo === 'confirmPassword' && control.touched && !control.errors && this.form.hasError('distinta')) {
      return MENSAJES.confirmPassword['distinta']!;
    }

    if (!control.touched || !control.errors) {
      return null;
    }

    const clave = Object.keys(control.errors)[0]!;
    return MENSAJES[campo][clave] ?? 'Revisa este campo.';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.error.set(null);
    this.serverErrors.set({});
    for (const control of Object.values(this.form.controls)) {
      control.markAsPristine();
    }

    const datos = this.form.getRawValue();
    this.auth.register({ ...datos, address: datos.address.trim() || null }).subscribe({
      next: (user) => {
        this.toasts.ok(`Bienvenido, ${user.fullName.split(' ')[0]}. Te enviamos un correo de bienvenida.`);
        void this.router.navigateByUrl('/catalogo');
      },
      error: (error: unknown) => {
        this.sending.set(false);
        const porCampo = fieldErrors(error);
        this.serverErrors.set(porCampo);
        this.error.set(Object.keys(porCampo).length ? 'Revisa los campos marcados.' : problemMessage(error, 'No se pudo crear la cuenta.'));
      }
    });
  }
}
