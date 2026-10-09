/**
 * localStorage con try/catch: en modo privado o con el almacenamiento
 * bloqueado puede lanzar, y el portal debe seguir funcionando (sin recordar nada).
 */
export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento: la sesion dura lo que dure la pestaña.
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nada que limpiar.
    }
  }
};
