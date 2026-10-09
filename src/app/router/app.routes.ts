import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../Guards/auth.guard';
import { LoginComponent } from '../Views/Auth/Login.Component';
import { RegisterComponent } from '../Views/Auth/Register.Component';
import { CatalogComponent } from '../Views/Catalog/Catalog.Component';
import { CheckoutComponent } from '../Views/Cart/Checkout.Component';
import { ShellComponent } from '../Views/Layout/Shell.Component';
import { MyOrdersComponent } from '../Views/Orders/MyOrders.Component';
import { OrderDetailComponent } from '../Views/Orders/OrderDetail.Component';

/**
 * Solo pantallas del rol Cliente: registro, ingreso, catalogo, carrito y
 * compras propias. La administracion vive en el panel MVC, no aqui.
 */
export const routes: Routes = [
  { path: 'ingresar', component: LoginComponent, canActivate: [guestGuard], title: 'Ingresar · InfectionSolutions' },
  { path: 'registro', component: RegisterComponent, canActivate: [guestGuard], title: 'Crear cuenta · InfectionSolutions' },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
      { path: 'catalogo', component: CatalogComponent, title: 'Catálogo · InfectionSolutions' },
      { path: 'carrito', component: CheckoutComponent, title: 'Carrito · InfectionSolutions' },
      { path: 'mis-compras', component: MyOrdersComponent, title: 'Mis compras · InfectionSolutions' },
      { path: 'compras/:id', component: OrderDetailComponent, title: 'Compra · InfectionSolutions' }
    ]
  },
  { path: '**', redirectTo: '' }
];
