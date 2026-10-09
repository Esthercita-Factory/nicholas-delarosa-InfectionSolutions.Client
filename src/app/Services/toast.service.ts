import { Injectable, signal } from '@angular/core';

export type ToastKind = 'ok' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

/** Avisos cortos abajo a la derecha (agregado al carrito, errores de red...). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguiente = 1;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, kind: ToastKind = 'info', ms = 3800): void {
    const id = this.siguiente++;
    this.toasts.update((lista) => [...lista.slice(-2), { id, kind, text }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  ok(text: string): void {
    this.show(text, 'ok');
  }

  error(text: string): void {
    this.show(text, 'error', 6000);
  }

  dismiss(id: number): void {
    this.toasts.update((lista) => lista.filter((toast) => toast.id !== id));
  }
}
