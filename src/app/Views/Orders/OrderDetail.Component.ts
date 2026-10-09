import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sale, SaleCreatedResponse } from '../../Models/api.models';
import { problemMessage } from '../../Services/api.config';
import { OrdersService } from '../../Services/orders.service';
import { ToastService } from '../../Services/toast.service';
import { IconComponent } from '../Shared/Icon.Component';
import { BogotaDatePipe, MoneyPipe } from '../Shared/format.pipes';

/**
 * Detalle de una compra. Justo despues de confirmar muestra la confirmacion
 * y si el comprobante salio por correo (receiptEmailSent de la API).
 */
@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, IconComponent, MoneyPipe, BogotaDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (nueva(); as n) {
      <section class="success" role="status">
        <svg class="success__check" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r="24" fill="none" />
          <path fill="none" d="M15 27l7 7 15-16" />
        </svg>
        <div>
          <p class="eyebrow">Compra registrada</p>
          <h1 class="page-title">¡Listo! Tu pedido {{ n.sale.saleNumber }} quedó registrado.</h1>
          @if (n.receiptEmailSent) {
            <p class="success__mail"><app-icon name="mail" [size]="18" /><span>Te enviamos el comprobante a <strong>{{ n.sentTo }}</strong>.</span></p>
          } @else {
            <div class="notice notice--warn">
              <app-icon name="alert" [size]="18" />
              <span>Tu compra quedó registrada, pero no pudimos enviar el correo a {{ n.sentTo }}. Descarga el comprobante aquí abajo.</span>
            </div>
          }
        </div>
      </section>
    } @else {
      <section class="hero hero--compact">
        <div>
          <a routerLink="/mis-compras" class="back"><app-icon name="arrowLeft" [size]="16" /> Mis compras</a>
          <h1 class="page-title">Compra {{ venta()?.saleNumber }}</h1>
        </div>
        <div class="tape" aria-hidden="true"></div>
      </section>
    }

    @if (error()) {
      <div class="empty">
        <app-icon name="alert" [size]="36" />
        <p><strong>{{ error() }}</strong></p>
        <a routerLink="/mis-compras" class="btn btn--ghost">Volver a mis compras</a>
      </div>
    } @else if (venta(); as v) {
      <div class="order">
        <div class="card order__main">
          <div class="order__meta">
            <div><span class="muted">Fecha</span><strong>{{ v.saleDate | bogotaDate: true }}</strong></div>
            <div><span class="muted">Estado</span>
              <span class="badge" [class.badge--danger]="v.status === 'Cancelled'">{{ v.status === 'Cancelled' ? 'Anulada' : 'Completada' }}</span>
            </div>
            <div><span class="muted">Entrega</span><strong>{{ v.customerAddress || 'Por confirmar' }}</strong></div>
          </div>

          <div class="table-head table-head--order" aria-hidden="true">
            <span>Producto</span><span class="num">Cant.</span><span class="num">Precio</span><span class="num">Total</span>
          </div>
          <ul>
            @for (d of v.details; track d.productId) {
              <li class="row row--order">
                <div class="row__product"><strong>{{ d.productName }}</strong><span class="muted">{{ d.sku }} · {{ d.unit }}</span></div>
                <span class="num">{{ d.quantity }}</span>
                <span class="num">{{ d.unitPrice | money }}</span>
                <strong class="num">{{ d.lineTotal | money }}</strong>
              </li>
            }
          </ul>
          @if (v.notes) {
            <p class="order__notes"><span class="muted">Notas:</span> {{ v.notes }}</p>
          }
        </div>

        <aside class="card summary">
          <dl class="totals">
            <div><dt>Subtotal</dt><dd>{{ v.subtotal | money }}</dd></div>
            <div><dt>IVA 19 %</dt><dd>{{ v.tax | money }}</dd></div>
            <div class="totals__grand"><dt>Total</dt><dd>{{ v.total | money }}</dd></div>
          </dl>
          <button type="button" class="btn btn--primary btn--block" (click)="descargar(v)" [disabled]="downloading()">
            @if (downloading()) { <span class="spinner" aria-hidden="true"></span> Descargando… } @else { <app-icon name="download" [size]="18" /> Descargar comprobante PDF }
          </button>
          @if (nueva()) {
            <a routerLink="/catalogo" class="btn btn--ghost btn--block">Seguir comprando</a>
          }
        </aside>
      </div>
    } @else {
      <div class="card order--skeleton" aria-busy="true"></div>
    }
  `
})
export class OrderDetailComponent implements OnInit {
  private readonly orders = inject(OrdersService);
  private readonly toasts = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly nueva = signal<SaleCreatedResponse | null>(null);
  protected readonly venta = signal<Sale | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly downloading = signal(false);

  ngOnInit(): void {
    const recien = this.orders.takeJustCreated(this.id());
    if (recien) {
      this.nueva.set(recien);
      this.venta.set(recien.sale);
      return;
    }

    this.orders.get(this.id()).subscribe({
      next: (venta) => this.venta.set(venta),
      error: (error: unknown) => this.error.set(problemMessage(error, 'No encontramos esa compra.'))
    });
  }

  protected descargar(venta: Sale): void {
    this.downloading.set(true);
    this.orders.downloadReceipt(venta.id, `${venta.saleNumber}.pdf`).subscribe({
      next: () => this.downloading.set(false),
      error: (error: unknown) => {
        this.downloading.set(false);
        this.toasts.error(problemMessage(error, 'No se pudo descargar el comprobante.'));
      }
    });
  }
}
