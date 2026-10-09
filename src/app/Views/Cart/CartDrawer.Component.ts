import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../Services/cart.service';
import { IconComponent } from '../Shared/Icon.Component';
import { MoneyPipe } from '../Shared/format.pipes';
import { QtyStepperComponent } from '../Shared/QtyStepper.Component';

/** Vista rapida del carrito, deslizandose desde la derecha. */
@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, IconComponent, MoneyPipe, QtyStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'open() && closed.emit()' },
  template: `
    <div class="drawer-scrim" [class.is-open]="open()" (click)="closed.emit()"></div>
    <aside class="drawer" [class.is-open]="open()" role="dialog" aria-modal="true" aria-labelledby="carrito-titulo"
           [attr.aria-hidden]="!open()" [attr.inert]="open() ? null : ''">
      <header class="drawer__head">
        <h2 id="carrito-titulo">Tu carrito <span class="muted">({{ cart.count() }})</span></h2>
        <button #cerrar type="button" class="icon-btn" (click)="closed.emit()" aria-label="Cerrar carrito"><app-icon name="x" /></button>
      </header>

      @if (cart.isEmpty()) {
        <div class="empty empty--drawer">
          <app-icon name="cart" [size]="40" />
          <p><strong>Tu carrito está vacío.</strong></p>
          <p class="muted">Agrega materiales desde el catálogo.</p>
          <button type="button" class="btn btn--ghost" (click)="closed.emit()">Seguir mirando</button>
        </div>
      } @else {
        <ul class="drawer__lines">
          @for (linea of cart.lines(); track linea.product.id) {
            <li class="line">
              <div class="line__info">
                <strong>{{ linea.product.name }}</strong>
                <span class="muted">{{ linea.product.price | money }} / {{ linea.product.unit.toLowerCase() }}</span>
              </div>
              <div class="line__actions">
                <app-qty [value]="linea.quantity" [max]="linea.product.stock" [small]="true"
                         [label]="'Cantidad de ' + linea.product.name" (changed)="cart.setQuantity(linea.product.id, $event)" />
                <strong class="line__total">{{ linea.quantity * linea.product.price | money }}</strong>
                <button type="button" class="icon-btn icon-btn--sm" (click)="cart.remove(linea.product.id)" [attr.aria-label]="'Quitar ' + linea.product.name">
                  <app-icon name="trash" [size]="16" />
                </button>
              </div>
            </li>
          }
        </ul>

        <footer class="drawer__foot">
          <dl class="totals">
            <div><dt>Subtotal</dt><dd>{{ cart.totals().subtotal | money }}</dd></div>
            <div><dt>IVA 19 %</dt><dd>{{ cart.totals().tax | money }}</dd></div>
            <div class="totals__grand"><dt>Total</dt><dd>{{ cart.totals().total | money }}</dd></div>
          </dl>
          <a routerLink="/carrito" class="btn btn--primary btn--block">Revisar y pagar <app-icon name="arrowRight" [size]="18" /></a>
        </footer>
      }
    </aside>
  `
})
export class CartDrawerComponent {
  protected readonly cart = inject(CartService);
  readonly open = input(false);
  readonly closed = output<void>();

  private readonly cerrar = viewChild<ElementRef<HTMLButtonElement>>('cerrar');

  constructor() {
    // Al abrir, el foco va al panel (teclado y lectores de pantalla).
    effect(() => {
      if (this.open()) {
        setTimeout(() => this.cerrar()?.nativeElement.focus(), 50);
      }
    });
  }
}
