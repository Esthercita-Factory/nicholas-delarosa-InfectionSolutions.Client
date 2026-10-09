import { Injectable, computed, inject, linkedSignal, signal } from '@angular/core';
import { Product, SaleLineRequest, TAX_RATE } from '../Models/api.models';
import { AuthService } from './auth.service';
import { storage } from './storage';

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Carrito del portal. Vive en el navegador (signals + localStorage por
 * cliente): no hay entidad Carrito en la base. Al confirmar se convierte en
 * un POST /api/me/sales y la API recalcula todo con los precios vigentes.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly auth = inject(AuthService);
  private readonly storageKey = computed(() => {
    const user = this.auth.user();
    return user ? `is.portal.cart.${user.id}` : null;
  });

  /** Cada cliente tiene su carrito: al cambiar de sesion se carga el suyo. */
  private readonly items = linkedSignal<CartLine[]>(() => {
    const clave = this.storageKey();
    return clave ? (storage.get<CartLine[]>(clave) ?? []) : [];
  });

  readonly lines = this.items.asReadonly();
  readonly isEmpty = computed(() => this.items().length === 0);

  /** Unidades en total (el numero del boton del carrito). */
  readonly count = computed(() => this.items().reduce((suma, linea) => suma + linea.quantity, 0));

  readonly totals = computed(() => CartService.calculateTotals(this.items()));

  /** Se incrementa en cada "agregar": el boton del carrito lo usa para animarse. */
  readonly bump = signal(0);

  /**
   * Mismo calculo que InventoryCalculator en el dominio: linea = cantidad x
   * precio, subtotal = suma de lineas, IVA = 19 % del subtotal redondeado a
   * 2 decimales (mitad hacia arriba). Se trabaja en centavos enteros para no
   * arrastrar errores de punto flotante: lo que se ve es lo que se cobra.
   */
  static calculateTotals(lines: readonly CartLine[]): CartTotals {
    const subtotal = lines.reduce((suma, linea) => suma + linea.quantity * Math.round(linea.product.price * 100), 0);
    const tax = Math.floor((subtotal * Math.round(TAX_RATE * 100) + 50) / 100);

    return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 };
  }

  quantityOf(productId: string): number {
    return this.items().find((linea) => linea.product.id === productId)?.quantity ?? 0;
  }

  /** Cuantas unidades mas caben sin pasarse del stock. */
  available(product: Product): number {
    return Math.max(product.stock - this.quantityOf(product.id), 0);
  }

  /** Agrega (o suma a la linea existente) sin pasarse del stock. Devuelve cuantas agrego. */
  add(product: Product, quantity = 1): number {
    const agregadas = Math.min(Math.max(Math.trunc(quantity), 0), this.available(product));
    if (agregadas === 0) {
      return 0;
    }

    this.update((lineas) => {
      const existente = lineas.find((linea) => linea.product.id === product.id);
      return existente
        ? lineas.map((linea) => (linea === existente ? { product, quantity: linea.quantity + agregadas } : linea))
        : [...lineas, { product, quantity: agregadas }];
    });
    this.bump.update((n) => n + 1);

    return agregadas;
  }

  /** Cambia la cantidad (limitada al stock). 0 o menos quita la linea. */
  setQuantity(productId: string, quantity: number): void {
    this.update((lineas) =>
      lineas
        .map((linea) =>
          linea.product.id === productId
            ? { ...linea, quantity: Math.min(Math.trunc(quantity), linea.product.stock) }
            : linea
        )
        .filter((linea) => linea.quantity > 0)
    );
  }

  remove(productId: string): void {
    this.update((lineas) => lineas.filter((linea) => linea.product.id !== productId));
  }

  clear(): void {
    this.update(() => []);
  }

  /**
   * Actualiza precio y stock con lo que acaba de llegar del catalogo; si un
   * producto ya no tiene stock suficiente, ajusta la cantidad.
   */
  syncWith(products: readonly Product[]): void {
    const vigentes = new Map(products.map((producto) => [producto.id, producto]));
    const cambio = this.items().some((linea) => {
      const actual = vigentes.get(linea.product.id);
      return actual !== undefined && (actual.price !== linea.product.price || actual.stock !== linea.product.stock);
    });
    if (!cambio) {
      return;
    }

    this.update((lineas) =>
      lineas
        .map((linea) => {
          const actual = vigentes.get(linea.product.id);
          return actual ? { product: actual, quantity: Math.min(linea.quantity, actual.stock) } : linea;
        })
        .filter((linea) => linea.quantity > 0)
    );
  }

  /** Lineas para POST /api/me/sales. */
  toRequestLines(): SaleLineRequest[] {
    return this.items().map((linea) => ({ productId: linea.product.id, quantity: linea.quantity }));
  }

  private update(cambio: (lineas: CartLine[]) => CartLine[]): void {
    this.items.update(cambio);
    const clave = this.storageKey();
    if (clave) {
      storage.set(clave, this.items());
    }
  }
}
