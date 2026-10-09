import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PagedResponse, Product, ProductQuery } from '../Models/api.models';
import { API_URL } from './api.config';

/** Catalogo. Para un cliente la API solo devuelve productos activos. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  list(query: ProductQuery): Observable<PagedResponse<Product>> {
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 12);

    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }

    if (query.category) {
      params = params.set('category', query.category);
    }

    return this.http.get<PagedResponse<Product>>(`${API_URL}/products`, { params });
  }

  categories(): Observable<string[]> {
    return this.http.get<string[]>(`${API_URL}/products/categories`);
  }
}
