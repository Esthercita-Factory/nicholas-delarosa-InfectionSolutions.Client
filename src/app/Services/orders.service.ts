import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CheckoutRequest, PagedResponse, Sale, SaleCreatedResponse, SaleListItem } from '../Models/api.models';
import { API_URL } from './api.config';

/**
 * Compras del cliente autenticado (/api/me/sales). La API toma el cliente del
 * token: aqui nunca se envia un id de cliente.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/me/sales`;

  /** Compra recien creada: la pantalla de confirmacion la lee para no pedirla otra vez. */
  private ultima: SaleCreatedResponse | null = null;

  checkout(request: CheckoutRequest): Observable<SaleCreatedResponse> {
    return this.http.post<SaleCreatedResponse>(this.base, request).pipe(
      map((respuesta) => (this.ultima = respuesta))
    );
  }

  /** Devuelve (y olvida) la compra recien creada si coincide con el id. */
  takeJustCreated(id: string): SaleCreatedResponse | null {
    const respuesta = this.ultima?.sale.id === id ? this.ultima : null;
    this.ultima = null;
    return respuesta;
  }

  list(page = 1, pageSize = 10): Observable<PagedResponse<SaleListItem>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResponse<SaleListItem>>(this.base, { params });
  }

  get(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.base}/${id}`);
  }

  /** Descarga el comprobante PDF con el token (un enlace directo no llevaria el header Authorization). */
  downloadReceipt(id: string, fallbackName: string): Observable<void> {
    return this.http.get(`${this.base}/${id}/receipt`, { observe: 'response', responseType: 'blob' }).pipe(
      map((respuesta) => {
        const url = URL.createObjectURL(respuesta.body!);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = OrdersService.fileName(respuesta) ?? fallbackName;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1_000);
      })
    );
  }

  /** Nombre del archivo segun Content-Disposition (la API lo expone por CORS). */
  static fileName(respuesta: HttpResponse<Blob>): string | null {
    const cabecera = respuesta.headers.get('Content-Disposition') ?? '';
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecera);
    if (utf8?.[1]) {
      return decodeURIComponent(utf8[1]);
    }

    return /filename="?([^";]+)"?/i.exec(cabecera)?.[1] ?? null;
  }
}
