import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastsComponent } from './Views/Shared/Toasts.Component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toasts />
  `
})
export class App {}
