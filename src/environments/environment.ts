/**
 * Produccion (`ng build`): el portal y la API se publican detras del mismo
 * dominio, asi que la API queda en /api (en Docker lo resuelve el proxy).
 */
export const environment = {
  apiUrl: '/api'
};
