import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PagedResponse, SaleListItem } from '../../Models/api.models';
import { problemMessage } from '../../Services/api.config';
import { OrdersService } from '../../Services/orders.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { BogotaDatePipe, MoneyPipe } from '../Shared/format.pipes';

@Component({
  selector: 'app-my-orders',
  imports: [RouterLink, IconComponent, MoneyPipe, BogotaDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero hero--compact">
      <div>
        <p class="eyebrow">Historial</p>
        <h1 class="page-title">Mis compras</h1>
      </div>
      <div class="tape" aria-hidden="true"></div>
    </section>

    @if (error()) {
      <div class="empty">
        <app-icon name="alert" [size]="36" />
        <p><strong>No pudimos cargar tus compras.</strong></p>
        <p class="muted">{{ error() }}</p>
        <button type="button" class="btn btn--ghost" (click)="cargar(pagina())">Reintentar</button>
      </div>
    } @else if (datos(); as d) {
      @if (d.items.length === 0) {
        <div class="empty">
          <app-icon name="receipt" [size]="40" />
          <p><strong>Aún no tienes compras.</strong></p>
          <p class="muted">Cuando compres, aquí verás cada pedido con su comprobante.</p>
          <a routerLink="/catalogo" class="btn btn--primary">Ir al catálogo</a>
        </div>
      } @else {
        <ul class="orders">
          @for (o of d.items; track o.id; let i = $index) {
            <li class="card order-row" [style.--i]="i">
              <a [routerLink]="['/compras', o.id]" class="order-row__main">
                <span class="order-row__number">{{ o.saleNumber }}</span>
                <span class="muted">{{ o.saleDate | bogotaDate: true }} · {{ o.itemCount }} {{ o.itemCount === 1 ? 'producto' : 'productos' }}</span>
              </a>
              <span class="badge" [class.badge--danger]="o.status === 'Cancelled'">{{ o.status === 'Cancelled' ? 'Anulada' : 'Completada' }}</span>
              <strong class="order-row__total">{{ o.total | money }}</strong>
              <div class="order-row__actions">
                <a [routerLink]="['/compras', o.id]" class="btn btn--ghost btn--sm"><app-icon name="eye" [size]="16" /> Ver</a>
                <button type="button" class="btn btn--ghost btn--sm" (click)="descargar(o)" [disabled]="descargando() === o.id">
                  <app-icon name="download" [size]="16" /> PDF
                </button>
              </div>
            </li>
          }
        </ul>

        @if (d.totalPages > 1) {
          <nav class="pager" aria-label="Páginas de compras">
            <button type="button" class="btn btn--ghost" [disabled]="!d.hasPrevious" (click)="cargar(d.page - 1)"><app-icon name="arrowLeft" [size]="18" /> Anteriores</button>
            <span class="muted">Página {{ d.page }} de {{ d.totalPages }}</span>
            <button type="button" class="btn btn--ghost" [disabled]="!d.hasNext" (click)="cargar(d.page + 1)">Siguientes <app-icon name="arrowRight" [size]="18" /></button>
          </nav>
        }
      }
    } @else {
      <ul class="orders" aria-busy="true">
        @for (i of [0, 1, 2]; track i) { <li class="card order-row order-row--skeleton"></li> }
      </ul>
    }
  `
})
export class MyOrdersComponent implements OnInit {
  private readonly orders = inject(OrdersService);
  private readonly toasts = inject(ToastService);

  protected readonly datos = signal<PagedResponse<SaleListItem> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(1);
  protected readonly descargando = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar(1);
  }

  protected cargar(pagina: number): void {
    this.pagina.set(pagina);
    this.error.set(null);
    this.datos.set(null);
    this.orders.list(pagina).subscribe({
      next: (datos) => this.datos.set(datos),
      error: (error: unknown) => this.error.set(problemMessage(error))
    });
  }

  protected descargar(venta: SaleListItem): void {
    this.descargando.set(venta.id);
    this.orders.downloadReceipt(venta.id, `${venta.saleNumber}.pdf`).subscribe({
      next: () => this.descargando.set(null),
      error: (error: unknown) => {
        this.descargando.set(null);
        this.toasts.error(problemMessage(error, 'No se pudo descargar el comprobante.'));
      }
    });
  }
}
