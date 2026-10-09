import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { CartService } from '../../Services/cart.service';
import { OrdersService } from '../../Services/orders.service';
import { IconComponent } from '../Shared/Icon.Component';
import { MoneyPipe } from '../Shared/format.pipes';
import { QtyStepperComponent } from '../Shared/QtyStepper.Component';

/** Revision del carrito y confirmacion de la compra (POST /api/me/sales). */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, IconComponent, MoneyPipe, QtyStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero hero--compact">
      <div>
        <a routerLink="/catalogo" class="back"><app-icon name="arrowLeft" [size]="16" /> Seguir comprando</a>
        <h1 class="page-title">Tu carrito</h1>
      </div>
      <div class="tape" aria-hidden="true"></div>
    </section>

    @if (cart.isEmpty()) {
      <div class="empty">
        <app-icon name="cart" [size]="40" />
        <p><strong>Tu carrito está vacío.</strong></p>
        <p class="muted">Agrega materiales desde el catálogo y vuelve aquí para pagar.</p>
        <a routerLink="/catalogo" class="btn btn--primary">Ir al catálogo</a>
      </div>
    } @else {
      <div class="checkout">
        <div class="card checkout__lines">
          <div class="table-head" aria-hidden="true">
            <span>Producto</span><span>Cantidad</span><span class="num">Total</span><span></span>
          </div>
          <ul>
            @for (linea of cart.lines(); track linea.product.id) {
              <li class="row">
                <div class="row__product">
                  <strong>{{ linea.product.name }}</strong>
                  <span class="muted">{{ linea.product.sku }} · {{ linea.product.price | money }} / {{ linea.product.unit.toLowerCase() }}</span>
                  @if (linea.quantity >= linea.product.stock) {
                    <span class="hint">Es todo el stock disponible.</span>
                  }
                </div>
                <app-qty [value]="linea.quantity" [max]="linea.product.stock" [label]="'Cantidad de ' + linea.product.name"
                         (changed)="cart.setQuantity(linea.product.id, $event)" />
                <strong class="num">{{ linea.quantity * linea.product.price | money }}</strong>
                <button type="button" class="icon-btn icon-btn--sm" (click)="cart.remove(linea.product.id)" [attr.aria-label]="'Quitar ' + linea.product.name">
                  <app-icon name="trash" [size]="16" />
                </button>
              </li>
            }
          </ul>

          <label class="field checkout__notes">
            <span class="field__label">Notas para el despacho <span class="optional">opcional</span></span>
            <textarea rows="3" maxlength="500" [(ngModel)]="notes" placeholder="Ej.: entregar en portería, horario de 7 a. m. a 4 p. m."></textarea>
          </label>
        </div>

        <aside class="card summary">
          <h2 class="summary__title">Resumen</h2>
          <dl class="totals">
            <div><dt>Subtotal ({{ cart.count() }} {{ cart.count() === 1 ? 'unidad' : 'unidades' }})</dt><dd>{{ cart.totals().subtotal | money }}</dd></div>
            <div><dt>IVA 19 %</dt><dd>{{ cart.totals().tax | money }}</dd></div>
            <div class="totals__grand"><dt>Total</dt><dd>{{ cart.totals().total | money }}</dd></div>
          </dl>

          @if (error()) {
            <div class="notice notice--error" role="alert"><app-icon name="alert" [size]="18" /><span>{{ error() }}</span></div>
          }

          <button type="button" class="btn btn--accent btn--block btn--lg" (click)="confirmar()" [disabled]="sending()">
            @if (sending()) { <span class="spinner" aria-hidden="true"></span> Registrando tu compra… } @else { Confirmar compra }
          </button>

          <p class="summary__mail"><app-icon name="mail" [size]="16" /><span>El comprobante en PDF llega a <strong>{{ auth.user()?.email }}</strong>.</span></p>
          <p class="muted summary__fine">Los precios y el stock se verifican al confirmar. Si algo cambió, te avisamos antes de cobrar.</p>
        </aside>
      </div>
    }
  `
})
export class CheckoutComponent {
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  private readonly orders = inject(OrdersService);
  private readonly router = inject(Router);

  protected notes = '';
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirmar(): void {
    if (this.sending() || this.cart.isEmpty()) {
      return;
    }

    this.sending.set(true);
    this.error.set(null);

    this.orders.checkout({ lines: this.cart.toRequestLines(), notes: this.notes.trim() || null }).subscribe({
      next: (respuesta) => {
        this.cart.clear();
        void this.router.navigate(['/compras', respuesta.sale.id]);
      },
      error: (error: unknown) => {
        this.sending.set(false);
        // 401 ya lo maneja el interceptor (lleva al login con el carrito guardado).
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return;
        }
        this.error.set(problemMessage(error, 'No se pudo registrar la compra.'));
      }
    });
  }
}
