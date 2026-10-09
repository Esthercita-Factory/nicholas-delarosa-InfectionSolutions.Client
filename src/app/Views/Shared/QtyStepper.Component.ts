import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './Icon.Component';

/** Selector de cantidad: menos, numero editable y mas, limitado entre min y max. */
@Component({
  selector: 'app-qty',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qty" [class.qty--sm]="small()">
      <button type="button" class="qty__btn" (click)="emit(value() - 1)" [disabled]="value() <= min()" aria-label="Quitar una unidad">
        <app-icon name="minus" [size]="16" />
      </button>
      <input class="qty__input" type="number" inputmode="numeric" [min]="min()" [max]="max()" [value]="value()"
             (change)="emit(+$any($event.target).value)" [attr.aria-label]="label()" />
      <button type="button" class="qty__btn" (click)="emit(value() + 1)" [disabled]="value() >= max()" aria-label="Agregar una unidad">
        <app-icon name="plus" [size]="16" />
      </button>
    </div>
  `
})
export class QtyStepperComponent {
  readonly value = input.required<number>();
  readonly min = input(1);
  readonly max = input(9999);
  readonly small = input(false);
  readonly label = input('Cantidad');
  readonly changed = output<number>();

  protected emit(valor: number): void {
    const limpio = Number.isFinite(valor) ? Math.trunc(valor) : this.min();
    this.changed.emit(Math.min(Math.max(limpio, this.min()), this.max()));
  }
}
