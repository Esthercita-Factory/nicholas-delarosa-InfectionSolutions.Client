import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../Services/auth.service';
import { CartService } from '../../Services/cart.service';
import { ThemeService } from '../../Services/theme.service';
import { CartDrawerComponent } from '../Cart/CartDrawer.Component';
import { IconComponent } from '../Shared/Icon.Component';

/** Marco del portal: encabezado (marca, menu, carrito, sesion), contenido y panel del carrito. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, CartDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>

    <header class="topbar">
      <div class="topbar__inner">
        <a routerLink="/catalogo" class="brand" aria-label="InfectionSolutions, ir al catálogo">
          <span class="brand__mark" aria-hidden="true"></span>
          <span class="brand__name">InfectionSolutions</span>
        </a>

        <nav class="nav" aria-label="Principal">
          <a routerLink="/catalogo" routerLinkActive="is-active" class="nav__link"><app-icon name="package" [size]="18" /> Catálogo</a>
          <a routerLink="/mis-compras" routerLinkActive="is-active" class="nav__link"><app-icon name="receipt" [size]="18" /> Mis compras</a>
        </nav>

        <div class="topbar__actions">
          <button type="button" class="icon-btn" (click)="theme.toggle({ x: $any($event).clientX, y: $any($event).clientY })"
                  [attr.aria-label]="theme.theme() === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
            <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
          </button>

          <button type="button" class="cart-btn" [class.is-bumping]="bumping()" (click)="cartOpen.set(true)"
                  [attr.aria-label]="'Abrir carrito, ' + cart.count() + ' unidades'">
            <app-icon name="cart" />
            <span class="cart-btn__label">Carrito</span>
            @if (cart.count() > 0) {
              <span class="cart-btn__count">{{ cart.count() }}</span>
            }
          </button>

          <div class="user">
            <button type="button" class="user__btn" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-haspopup="menu"
                    [attr.aria-label]="'Menú de la cuenta de ' + auth.firstName()">
              <span class="avatar" aria-hidden="true">{{ auth.initials() }}</span>
              <span class="user__name">{{ auth.firstName() }}</span>
              <app-icon name="chevronDown" [size]="16" />
            </button>
            @if (menuOpen()) {
              <div class="menu" role="menu">
                <div class="menu__head">
                  <strong>{{ auth.user()?.fullName }}</strong>
                  <span class="muted">{{ auth.user()?.email }}</span>
                </div>
                <a role="menuitem" routerLink="/mis-compras" class="menu__item" (click)="menuOpen.set(false)"><app-icon name="receipt" [size]="18" /> Mis compras</a>
                <button role="menuitem" type="button" class="menu__item" (click)="logout()"><app-icon name="logout" [size]="18" /> Cerrar sesión</button>
              </div>
              <div class="menu__scrim" (click)="menuOpen.set(false)"></div>
            }
          </div>
        </div>
      </div>
    </header>

    <!-- En celular el menu baja a una barra de pestañas (fuera del encabezado:
         su backdrop-filter haria que un elemento fixed se ubique dentro de el). -->
    <nav class="tabbar" aria-label="Principal">
      <a routerLink="/catalogo" routerLinkActive="is-active" class="tabbar__link"><app-icon name="package" /> Catálogo</a>
      <button type="button" class="tabbar__link" (click)="cartOpen.set(true)">
        <app-icon name="cart" /> Carrito
        @if (cart.count() > 0) { <span class="cart-btn__count">{{ cart.count() }}</span> }
      </button>
      <a routerLink="/mis-compras" routerLinkActive="is-active" class="tabbar__link"><app-icon name="receipt" /> Compras</a>
    </nav>

    <main id="contenido" class="page">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="footer__inner">
        <span>InfectionSolutions · NIT 901.458.789-1</span>
        <span>Norte – Centro Histórico, Calle 40 # 46-223, Barranquilla</span>
        <span>+57 3052662519 · i.s.infectionsolutions&#64;gmail.com</span>
      </div>
    </footer>

    <!-- El panel del carrito no se ve al entrar: se arma cuando el navegador queda libre,
         asi no compite con el primer render del catalogo. -->
    @defer (on idle) {
      <app-cart-drawer [open]="cartOpen()" (closed)="cartOpen.set(false)" />
    }
  `
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  protected readonly theme = inject(ThemeService);

  protected readonly cartOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly bumping = signal(false);

  constructor() {
    // El boton del carrito "salta" cada vez que se agrega algo.
    let primera = true;
    effect(() => {
      this.cart.bump();
      if (primera) {
        primera = false;
        return;
      }
      this.bumping.set(false);
      requestAnimationFrame(() => this.bumping.set(true));
      setTimeout(() => this.bumping.set(false), 450);
    });

    // Al navegar se cierran el menu y el carrito.
    inject(Router).events.pipe(filter((evento) => evento instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen.set(false);
      this.cartOpen.set(false);
    });
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout('manual');
  }
}
