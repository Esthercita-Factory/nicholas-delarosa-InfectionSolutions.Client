import { Pipe, PipeTransform } from '@angular/core';

/**
 * Mismos formatos que el panel y los PDF: pesos con punto decimal
 * ("$ 32,500.00") y fechas en hora de Colombia aunque el navegador este en
 * otra zona horaria.
 */
const dinero = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dineroCorto = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const fecha = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric' });
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
});

export function formatMoney(valor: number, sinDecimales = false): string {
  const signo = valor < 0 ? '-' : '';
  // Sin decimales solo si el valor es entero: $ 15,500.50 nunca se muestra como $ 15,501.
  const corto = sinDecimales && Number.isInteger(Math.round(valor * 100) / 100);
  return `${signo}$ ${(corto ? dineroCorto : dinero).format(Math.abs(valor))}`;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(valor: number | null | undefined, sinDecimales = false): string {
    return valor == null ? '' : formatMoney(valor, sinDecimales);
  }
}

@Pipe({ name: 'bogotaDate' })
export class BogotaDatePipe implements PipeTransform {
  transform(valor: string | null | undefined, conHora = false): string {
    return valor ? (conHora ? fechaHora : fecha).format(new Date(valor)) : '';
  }
}
