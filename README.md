# InfectionSolutions.Client · Portal de clientes

Aplicación web en **Angular 21** donde los clientes se registran, inician sesión, ven el catálogo, arman su
carrito, compran y descargan el comprobante. Es el frontend del sistema InfectionSolutions: consume su API REST
(`InfectionSolutions.Api`, en el [repositorio del backend](https://github.com/Esthercita-Factory/nicholas-delarosa-InfectionSolutions)) y no toca la base de datos.

## Requisitos

- Node.js 22.12 o superior.
- La API de InfectionSolutions corriendo en http://localhost:5120. Desde el repositorio del backend:
  `dotnet run --project Src/InfectionSolutions.Api`.

## Comandos

```bash
npm install     # dependencias (versiones exactas, ver package.json)
npm start       # servidor de desarrollo en http://localhost:4200
npm test        # pruebas unitarias (Vitest)
npm run build   # build de producción en dist/
```

La API ya permite `http://localhost:4200` en CORS (`Cors:AllowedOrigins`). La dirección de la API está en
`src/environments/`:

| Archivo | Cuándo se usa | `apiUrl` |
|---|---|---|
| `environment.development.ts` | `npm start` | `http://localhost:5120/api` |
| `environment.ts` | `npm run build` | `/api` (mismo dominio; en Docker lo resuelve el proxy) |

## Docker

La imagen tiene dos etapas: Node compila el build de producción y **Nginx** (sin root, puerto 8080) lo sirve.
Nginx también reenvía `/api/*` a la API (`API_UPSTREAM`, por defecto `http://api:8080`), así que el portal y
la API quedan en el mismo origen y no hace falta CORS.

```bash
docker build -t infectionsolutions-client .
docker run -p 8082:8080 -e API_UPSTREAM=http://host.docker.internal:5120 infectionsolutions-client
```

En el sistema completo no hace falta construirla a mano: el `docker-compose.yml` del
[repositorio del backend](https://github.com/Esthercita-Factory/nicholas-delarosa-InfectionSolutions) la
levanta junto con la base de datos, la API y el panel.

Cada push a `main` ejecuta GitHub Actions (`.github/workflows/docker.yml`): corre `npm test` y, si pasa,
publica la imagen en `ghcr.io/esthercita-factory/nicholas-delarosa-infectionsolutions.client`.

## Rendimiento

Puntajes de Lighthouse (móvil y escritorio) por encima de 90 en ingreso y catálogo. Lo que los sostiene:

- **Ingreso y registro prerenderizados**: el build genera su HTML (`outputMode: "static"`,
  `src/app/router/app.routes.server.ts`) y Angular lo hidrata. No hay servidor Node: Nginx sirve
  `ingresar/index.html` y, para el resto de rutas, `index.csr.html`.
- **Cada pantalla se carga bajo demanda** (`loadComponent`); el panel del carrito y las tarjetas fuera de
  pantalla se arman con `@defer` (cuando el navegador está libre o al acercarse).
- **Compresión gzip también en HTTP/1.0**: el Nginx del servidor reenvía en 1.0 y sin `gzip_http_version 1.0`
  el JavaScript viajaba sin comprimir.
- **Fuente Archivo servida desde el mismo dominio** (`public/fonts`), sin conexión extra a Google Fonts.
- Animaciones de entrada solo con `transform` (nunca dejan texto semitransparente, así el contraste es el real)
  y brillo de los esqueletos por el compositor.
- `robots.txt` y `llms.txt` reales; cualquier otro archivo inexistente responde 404 (antes el fallback del SPA
  devolvía la app con 200).

## Qué hace

- **Registro e ingreso** (`/registro`, `/ingresar`). El registro repite las validaciones de la API (documento,
  edad, teléfono, política de contraseña con indicador en vivo) y muestra junto a cada campo los errores que
  devuelve la API, como un documento ya registrado. Una cuenta de administrador no puede entrar al portal.
- **Sesión con JWT**: el token se guarda en `localStorage` y el interceptor lo envía como
  `Authorization: Bearer …` solo a la API. Cuando el token vence, la sesión se cierra sola: por un temporizador
  o por un 401 de la API. Luego vuelve al login con el aviso "Tu sesión venció" y, al ingresar, a la página
  donde estaba.
- **Catálogo** (`/catalogo`): búsqueda sin mayúsculas ni tildes, filtro por categoría y paginación. El filtro
  queda en la URL. Cada tarjeta muestra el precio sin IVA y con IVA, y el stock disponible.
- **Carrito**: panel lateral y página `/carrito`. Respeta el stock, se guarda por cliente y calcula subtotal,
  IVA (19 %) y total con el mismo redondeo de la API (en centavos enteros), así que lo que se ve es lo que se
  cobra.
- **Compra**: `POST /api/me/sales`. La confirmación dice si el comprobante salió por correo
  (`receiptEmailSent`) y permite descargar el PDF.
- **Mis compras** (`/mis-compras`): historial con detalle y descarga del comprobante.
- Diseño adaptativo con barra de pestañas en celular, modo claro y oscuro, y animaciones que respetan
  `prefers-reduced-motion`.

Solo usa endpoints del rol Cliente: `/api/auth/*`, `GET /api/products`, `GET /api/products/categories` y
`/api/me/sales/*`.

## Estructura

```
src/app/
├── router/app.routes.ts        Rutas (ingresar, registro y el portal protegido por authGuard)
├── Guards/auth.guard.ts        authGuard (exige sesión vigente) y guestGuard (login/registro)
├── Interceptors/               Agrega el Bearer y maneja el 401
├── Models/api.models.ts        Tipos de las respuestas de la API
├── Services/                   auth, cart, catalog, orders, toast, theme
└── Views/
    ├── Auth/                   Login, Register y su layout
    ├── Layout/Shell            Encabezado, menú, barra de pestañas y pie
    ├── Catalog/                Catálogo y tarjeta de producto
    ├── Cart/                   Panel del carrito y checkout
    ├── Orders/                 Mis compras y detalle/confirmación
    └── Shared/                 Íconos, avisos, selector de cantidad, formatos de dinero y fecha
```

## Pruebas

`npm test` corre 17 pruebas con Vitest:

- **Carrito**: totales idénticos a los de la API, redondeo del IVA, límite de stock y sincronización con el catálogo.
- **Sesión**: guarda el token de un cliente, rechaza administradores, descarta una sesión vencida y cierra sesión.
- **Interceptor**: agrega el Bearer solo a la API, ignora el login y convierte un 401 en "sesión vencida".
- **Guards**: protegen las rutas y recuerdan la página a la que se quería ir.
