import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Product, TAX_RATE } from '../../Models/api.models';
import { CartService } from '../../Services/cart.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { MoneyPipe } from '../Shared/format.pipes';
import { QtyStepperComponent } from '../Shared/QtyStepper.Component';

@Component({
  selector: 'app-product-card',
  imports: [IconComponent, MoneyPipe, QtyStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="product" [class.is-out]="product().stock === 0">
      <div class="product__top">
        <span class="chip chip--soft">{{ product().category }}</span>
        <span class="product__sku">{{ product().sku }}</span>
      </div>

      <h3 class="product__name">{{ product().name }}</h3>
      @if (product().description) {
        <p class="product__desc">{{ product().description }}</p>
      }

      <div class="product__price">
        <span class="price">{{ product().price | money: true }}</span>
        <span class="price__unit">/ {{ product().unit.toLowerCase() }}</span>
      </div>
      <p class="product__tax">{{ conIva() | money }} con IVA</p>

      <p class="stock" [class]="'stock--' + nivel()">
        <span class="stock__dot" aria-hidden="true"></span>
        @switch (nivel()) {
          @case ('out') { Agotado }
          @case ('low') { Quedan {{ product().stock }} }
          @default { {{ product().stock }} disponibles }
        }
      </p>

      <div class="product__buy">
        @if (disponible() > 0) {
          <app-qty [value]="cantidad()" [max]="disponible()" [label]="'Cantidad de ' + product().name" (changed)="cantidad.set($event)" />
          <button type="button" class="btn btn--primary" (click)="agregar()">
            <app-icon name="cart" [size]="18" /> Agregar
          </button>
        } @else if (product().stock > 0) {
          <p class="muted product__full">Ya tienes todo el stock en el carrito.</p>
        } @else {
          <p class="muted product__full">Sin unidades por ahora.</p>
        }
      </div>

      @if (enCarrito() > 0) {
        <p class="product__incart"><app-icon name="check" [size]="14" /> {{ enCarrito() }} en tu carrito</p>
      }
    </article>
  `
})
export class ProductCardComponent {
  private readonly cart = inject(CartService);
  private readonly toasts = inject(ToastService);

  readonly product = input.required<Product>();

  protected readonly enCarrito = computed(() => this.cart.quantityOf(this.product().id));
  protected readonly disponible = computed(() => this.cart.available(this.product()));
  /** Vuelve a 1 cuando cambia el producto o lo que queda disponible. */
  protected readonly cantidad = linkedSignal(() => Math.min(1, this.disponible()));
  protected readonly conIva = computed(() => Math.round(this.product().price * (1 + TAX_RATE) * 100) / 100);
  protected readonly nivel = computed(() => {
    const stock = this.product().stock;
    return stock === 0 ? 'out' : stock <= 10 ? 'low' : 'ok';
  });

  protected agregar(): void {
    const producto = this.product();
    const agregadas = this.cart.add(producto, this.cantidad());
    if (agregadas > 0) {
      this.toasts.ok(`Agregado al carrito: ${agregadas} × ${producto.name}.`);
    }
  }
}
