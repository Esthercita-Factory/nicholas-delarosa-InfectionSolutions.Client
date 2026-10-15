import { Routes } from '@angular/router';
import { authGuard, guestGuard, profileGuard } from '../Guards/auth.guard';

/**
 * Solo pantallas del rol Cliente: registro, ingreso, catalogo, carrito y
 * compras propias. La administracion vive en el panel MVC, no aqui.
 *
 * Cada pantalla se carga bajo demanda (loadComponent): quien abre /ingresar no
 * descarga el catalogo ni el carrito, y el primer pintado llega antes.
 */
export const routes: Routes = [
  {
    path: 'ingresar',
    loadComponent: () => import('../Views/Auth/Login.Component').then(m => m.LoginComponent),
    canActivate: [guestGuard],
    title: 'Ingresar · InfectionSolutions'
  },
  {
    path: 'registro',
    loadComponent: () => import('../Views/Auth/Register.Component').then(m => m.RegisterComponent),
    canActivate: [guestGuard],
    title: 'Crear cuenta · InfectionSolutions'
  },
  {
    path: 'recuperar',
    loadComponent: () => import('../Views/Auth/Recover.Component').then(m => m.RecoverComponent),
    canActivate: [guestGuard],
    title: 'Recuperar contraseña · InfectionSolutions'
  },
  {
    // Enlace del correo: ?email=&token=
    path: 'restablecer',
    loadComponent: () => import('../Views/Auth/ResetPassword.Component').then(m => m.ResetPasswordComponent),
    title: 'Nueva contraseña · InfectionSolutions'
  },
  {
    // Vuelta de Google/GitHub: #codigo=&volver=
    path: 'ingresar/externo',
    loadComponent: () => import('../Views/Auth/ExternalCallback.Component').then(m => m.ExternalCallbackComponent),
    title: 'Ingresando · InfectionSolutions'
  },
  {
    path: 'completar-datos',
    loadComponent: () => import('../Views/Auth/CompleteProfile.Component').then(m => m.CompleteProfileComponent),
    canActivate: [profileGuard],
    title: 'Completa tus datos · InfectionSolutions'
  },
  {
    path: '',
    loadComponent: () => import('../Views/Layout/Shell.Component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
      {
        path: 'catalogo',
        loadComponent: () => import('../Views/Catalog/Catalog.Component').then(m => m.CatalogComponent),
        title: 'Catálogo · InfectionSolutions'
      },
      {
        path: 'carrito',
        loadComponent: () => import('../Views/Cart/Checkout.Component').then(m => m.CheckoutComponent),
        title: 'Carrito · InfectionSolutions'
      },
      {
        path: 'mis-compras',
        loadComponent: () => import('../Views/Orders/MyOrders.Component').then(m => m.MyOrdersComponent),
        title: 'Mis compras · InfectionSolutions'
      },
      {
        path: 'compras/:id',
        loadComponent: () => import('../Views/Orders/OrderDetail.Component').then(m => m.OrderDetailComponent),
        title: 'Compra · InfectionSolutions'
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
