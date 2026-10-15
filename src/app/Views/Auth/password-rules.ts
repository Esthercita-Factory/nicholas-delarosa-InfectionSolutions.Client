import { AbstractControl, ValidationErrors } from '@angular/forms';

/** La politica de Identity en Infrastructure: 8+, mayuscula, numero y simbolo. */
export const PASSWORD_RULES = [
  { label: '8 caracteres o más', test: (v: string) => v.length >= 8 },
  { label: 'Una mayúscula', test: (v: string) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { label: 'Un número', test: (v: string) => /\d/.test(v) },
  { label: 'Un símbolo (* ! # …)', test: (v: string) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(v) }
] as const;

/** Validador: la contraseña aun no cumple alguna regla. */
export function politica(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  return valor && !PASSWORD_RULES.every((regla) => regla.test(valor)) ? { politica: true } : null;
}
