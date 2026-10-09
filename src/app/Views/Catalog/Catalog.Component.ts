import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PagedResponse, Product } from '../../Models/api.models';
import { problemMessage } from '../../Services/api.config';
import { AuthService } from '../../Services/auth.service';
import { CartService } from '../../Services/cart.service';
import { CatalogService } from '../../Services/catalog.service';
import { IconComponent } from '../Shared/Icon.Component';
import { ProductCardComponent } from './ProductCard.Component';

const POR_PAGINA = 12;

type Estado =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: PagedResponse<Product> };

/**
 * Catalogo. El filtro vive en la URL (?q=&categoria=&pagina=): se puede
 * compartir el enlace y el boton "atras" del navegador vuelve a la busqueda.
 */
@Component({
  selector: 'app-catalog',
  imports: [IconComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div>
        <p class="eyebrow">Hola, {{ auth.firstName() }}</p>
        <h1 class="page-title">Materiales para tu obra</h1>
        <p class="muted hero__lead">Precios por unidad de venta, sin IVA. El IVA del 19 % se suma en el carrito antes de confirmar.</p>
      </div>
      <div class="tape" aria-hidden="true"></div>
    </section>

    <div class="filters">
      <label class="search">
        <app-icon name="search" [size]="20" />
        <span class="sr-only">Buscar productos</span>
        <input type="search" placeholder="Busca por nombre, código o categoría: cemento, varilla, PVC…"
               [value]="q() ?? ''" (input)="buscar$.next($any($event.target).value)" />
      </label>

      <div class="chips" role="group" aria-label="Filtrar por categoría">
        <button type="button" class="chip" [class.is-active]="!categoria()" (click)="filtrar({ categoria: null })">Todas</button>
        @for (c of categorias(); track c) {
          <button type="button" class="chip" [class.is-active]="categoria() === c" (click)="filtrar({ categoria: c })">{{ c }}</button>
        }
      </div>
    </div>

    @switch (estado().kind) {
      @case ('loading') {
        <div class="grid" aria-busy="true" aria-label="Cargando productos">
          @for (i of esqueletos; track i) { <div class="product product--skeleton"></div> }
        </div>
      }
      @case ('error') {
        <div class="empty">
          <app-icon name="alert" [size]="36" />
          <p><strong>No pudimos cargar el catálogo.</strong></p>
          <p class="muted">{{ $any(estado()).message }}</p>
          <button type="button" class="btn btn--ghost" (click)="reintentar()">Reintentar</button>
        </div>
      }
      @case ('ready') {
        @if (datos(); as d) {
          <p class="results muted" aria-live="polite">
            {{ d.totalCount }} {{ d.totalCount === 1 ? 'producto' : 'productos' }}
            @if (q()) { para «{{ q() }}» }
            @if (categoria()) { en {{ categoria() }} }
          </p>

          @if (d.items.length === 0) {
            <div class="empty">
              <app-icon name="search" [size]="36" />
              <p><strong>No encontramos productos con ese filtro.</strong></p>
              <p class="muted">Prueba con otra palabra o quita la categoría.</p>
              <button type="button" class="btn btn--ghost" (click)="filtrar({ q: null, categoria: null })">Ver todo el catálogo</button>
            </div>
          } @else {
            <div class="grid">
              @for (p of d.items; track p.id; let i = $index) {
                <app-product-card [product]="p" [style.--i]="i" />
              }
            </div>

            @if (d.totalPages > 1) {
              <nav class="pager" aria-label="Páginas del catálogo">
                <button type="button" class="btn btn--ghost" [disabled]="!d.hasPrevious" (click)="irA(d.page - 1)">
                  <app-icon name="arrowLeft" [size]="18" /> Anterior
                </button>
                <span class="muted">Página {{ d.page }} de {{ d.totalPages }}</span>
                <button type="button" class="btn btn--ghost" [disabled]="!d.hasNext" (click)="irA(d.page + 1)">
                  Siguiente <app-icon name="arrowRight" [size]="18" />
                </button>
              </nav>
            }
          }
        }
      }
    }
  `
})
export class CatalogComponent {
  protected readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  /** Query params enlazados por withComponentInputBinding. */
  readonly q = input<string>();
  readonly categoria = input<string>();
  readonly pagina = input<string>();

  protected readonly categorias = signal<string[]>([]);
  protected readonly estado = signal<Estado>({ kind: 'loading' });
  protected readonly datos = computed(() => {
    const estado = this.estado();
    return estado.kind === 'ready' ? estado.data : null;
  });
  protected readonly esqueletos = Array.from({ length: 6 }, (_, i) => i);

  protected readonly buscar$ = new Subject<string>();
  /** Al cambiar, se vuelve a pedir la misma pagina (boton "Reintentar"). */
  protected readonly recarga = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);

    this.catalog.categories().pipe(takeUntilDestroyed(destroyRef)).subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: () => this.categorias.set([])
    });

    this.buscar$
      .pipe(map((texto) => texto.trim()), debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe((texto) => this.filtrar({ q: texto || null }));

    const filtro = computed(() => ({
      q: this.q() ?? '',
      categoria: this.categoria() ?? '',
      pagina: Number(this.pagina()) || 1,
      recarga: this.recarga()
    }));

    toObservable(filtro)
      .pipe(
        switchMap((f) => {
          this.estado.set({ kind: 'loading' });
          return this.catalog.list({ q: f.q, category: f.categoria, page: f.pagina, pageSize: POR_PAGINA }).pipe(
            map((data): Estado => ({ kind: 'ready', data })),
            catchError((error: unknown) => of<Estado>({ kind: 'error', message: problemMessage(error) }))
          );
        }),
        takeUntilDestroyed(destroyRef)
      )
      .subscribe((estado) => this.estado.set(estado));

    // Precios y stock del carrito al dia con lo que se acaba de ver. untracked:
    // syncWith lee y escribe el carrito, y el efecto solo debe correr cuando
    // llega una pagina nueva del catalogo (si no, se dispararia sin fin).
    effect(() => {
      const datos = this.datos();
      if (datos) {
        untracked(() => this.cart.syncWith(datos.items));
      }
    });
  }

  protected filtrar(cambio: { q?: string | null; categoria?: string | null }): void {
    void this.router.navigate([], {
      queryParams: { ...cambio, pagina: null },
      queryParamsHandling: 'merge',
      replaceUrl: cambio.q !== undefined
    });
  }

  protected reintentar(): void {
    this.recarga.update((n) => n + 1);
  }

  protected irA(pagina: number): void {
    void this.router.navigate([], { queryParams: { pagina }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
