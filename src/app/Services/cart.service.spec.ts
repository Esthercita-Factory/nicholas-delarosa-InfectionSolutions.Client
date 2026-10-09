import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Product } from '../Models/api.models';
import { CartService } from './cart.service';

const producto = (cambios: Partial<Product> = {}): Product => ({
  id: 'cem',
  sku: 'CEM-50',
  name: 'Cemento gris 50 kg',
  description: null,
  category: 'Cementos',
  unit: 'Bulto',
  price: 30_000,
  stock: 10,
  isActive: true,
  ...cambios
});

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    cart = TestBed.inject(CartService);
  });

  it('calcula subtotal, IVA y total igual que la API', () => {
    // Mismo caso que SaleServiceTests en .NET: 3 x 30.000 + 2 x 15.000.
    cart.add(producto(), 3);
    cart.add(producto({ id: 'var', sku: 'VAR-12', name: 'Varilla', price: 15_000, stock: 2 }), 2);

    expect(cart.totals()).toEqual({ subtotal: 120_000, tax: 22_800, total: 142_800 });
    expect(cart.count()).toBe(5);
  });

  it('redondea el IVA a centavos sin errores de punto flotante', () => {
    // 3 x 1.480,10 = 4.440,30; IVA 843,657 -> 843,66.
    cart.add(producto({ price: 1_480.1 }), 3);

    expect(cart.totals()).toEqual({ subtotal: 4_440.3, tax: 843.66, total: 5_283.96 });
  });

  it('suma en la misma linea y nunca pasa del stock', () => {
    cart.add(producto({ stock: 4 }), 3);
    const agregadas = cart.add(producto({ stock: 4 }), 3);

    expect(agregadas).toBe(1);
    expect(cart.lines()).toHaveLength(1);
    expect(cart.quantityOf('cem')).toBe(4);
  });

  it('cantidad 0 quita la linea', () => {
    cart.add(producto(), 2);
    cart.setQuantity('cem', 0);

    expect(cart.isEmpty()).toBe(true);
  });

  it('ajusta precio y cantidad cuando el catalogo trae datos nuevos', () => {
    cart.add(producto(), 8);
    cart.syncWith([producto({ price: 31_000, stock: 5 })]);

    expect(cart.quantityOf('cem')).toBe(5);
    expect(cart.totals().subtotal).toBe(155_000);
  });

  it('si el catalogo no trae cambios no reemplaza el carrito', () => {
    cart.add(producto(), 2);
    const antes = cart.lines();

    cart.syncWith([producto()]);

    expect(cart.lines()).toBe(antes);
  });

  it('arma las lineas para POST /api/me/sales', () => {
    cart.add(producto(), 2);

    expect(cart.toRequestLines()).toEqual([{ productId: 'cem', quantity: 2 }]);
  });
});
