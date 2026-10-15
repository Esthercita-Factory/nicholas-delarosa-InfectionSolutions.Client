import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import {
  AuthResponse,
  CUSTOMER_ROLE,
  CompleteProfileRequest,
  ExternalProvider,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserProfile
} from '../Models/api.models';
import { API_URL } from './api.config';
import { storage } from './storage';

export interface Session {
  token: string;
  /** ISO 8601, viene de la API (expiresAt). */
  expiresAt: string;
  user: UserProfile;
}

export type LogoutReason = 'manual' | 'expired';

const SESSION_KEY = 'is.portal.session';

/**
 * Sesion del portal. El JWT se guarda en localStorage (la historia lo pide) y
 * se envia en cada peticion desde el interceptor. Al vencer, la sesion se
 * cierra sola y se lleva al cliente al login con un aviso.
 *
 * El portal es solo para el rol Cliente: un administrador recibe su token de la
 * API, pero aqui se descarta y se le indica que use el panel.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<Session | null>(null);
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  /** Cuenta creada con Google o GitHub que aun no tiene ficha de cliente (documento, edad, telefono). */
  readonly needsProfile = computed(() => this.session() !== null && !this.session()!.user.customer);
  readonly firstName = computed(() => this.user()?.fullName.split(' ').find(Boolean) ?? '');
  readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]!.toUpperCase())
      .join('')
  );

  constructor() {
    const guardada = storage.get<Session>(SESSION_KEY);
    if (guardada && AuthService.isValid(guardada)) {
      this.start(guardada);
    } else {
      storage.remove(SESSION_KEY);
    }
  }

  /** Token vigente o null. */
  token(): string | null {
    const actual = this.session();
    return actual && AuthService.isValid(actual) ? actual.token : null;
  }

  login(request: LoginRequest): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, request).pipe(
      map((respuesta) => this.accept(respuesta))
    );
  }

  register(request: RegisterRequest): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/register`, request).pipe(
      map((respuesta) => this.accept(respuesta))
    );
  }

  /** "Olvide mi contraseña": la API responde igual exista o no la cuenta. */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/forgot-password`, { email });
  }

  /** Cambia la contraseña con el enlace del correo y deja la sesion iniciada. */
  resetPassword(request: ResetPasswordRequest): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/reset-password`, request).pipe(
      map((respuesta) => this.accept(respuesta))
    );
  }

  /** Proveedores externos que la API tiene configurados (los demas botones no se muestran). */
  externalProviders(): Observable<ExternalProvider[]> {
    return this.http.get<ExternalProvider[]>(`${API_URL}/auth/external/providers`);
  }

  /**
   * Direccion para empezar el inicio con Google o GitHub. Se abre con el navegador (no con
   * HttpClient): la API redirige al proveedor y luego vuelve a /ingresar/externo con un codigo.
   */
  externalLoginUrl(provider: ExternalProvider, returnUrl = '/catalogo'): string {
    return `${API_URL}/auth/external/${provider.toLowerCase()}?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  /** Cambia el codigo de un solo uso que dejo Google/GitHub por la sesion. */
  exchangeExternalCode(code: string): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/external/exchange`, { code }).pipe(
      map((respuesta) => this.accept(respuesta))
    );
  }

  /** Crea la ficha de cliente de una cuenta de Google/GitHub; la sesion queda con la ficha. */
  completeProfile(request: CompleteProfileRequest): Observable<UserProfile> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/complete-profile`, request).pipe(
      map((respuesta) => this.accept(respuesta))
    );
  }

  /** Recarga el perfil (nombre, ficha de cliente) desde /api/auth/me. */
  refreshProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${API_URL}/auth/me`).pipe(
      tap((user) => {
        const actual = this.session();
        if (actual) {
          this.start({ ...actual, user });
        }
      })
    );
  }

  /** Limpia el token y lleva al login. Con 'expired' el login muestra "tu sesión venció". */
  logout(reason: LogoutReason = 'manual', returnUrl?: string): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    storage.remove(SESSION_KEY);

    const queryParams = reason === 'expired' ? { sesion: 'vencida', volver: returnUrl } : {};
    void this.router.navigate(['/ingresar'], { queryParams });
  }

  /** El token sirve si no ha vencido (con 10 s de margen para la latencia). */
  static isValid(session: Session, now = Date.now()): boolean {
    return new Date(session.expiresAt).getTime() - 10_000 > now;
  }

  private accept(respuesta: AuthResponse): UserProfile {
    if (!respuesta.user.roles.includes(CUSTOMER_ROLE)) {
      throw new Error('Esta cuenta es de administrador. Ingresa por el panel administrativo.');
    }

    this.start({ token: respuesta.accessToken, expiresAt: respuesta.expiresAt, user: respuesta.user });
    return respuesta.user;
  }

  private start(session: Session): void {
    this.session.set(session);
    storage.set(SESSION_KEY, session);

    // Cierre automatico al vencer, aunque el cliente no haga ninguna peticion.
    clearTimeout(this.expiryTimer);
    const restante = new Date(session.expiresAt).getTime() - Date.now();
    this.expiryTimer = setTimeout(() => this.logout('expired', this.router.url), Math.max(restante, 0));
  }
}
