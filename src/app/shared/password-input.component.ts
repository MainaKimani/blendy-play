import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * A password field with a show/hide (eye) button inside its right edge.
 * Works with ngModel like a plain input.
 */
@Component({
  selector: 'bp-password-input',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordInputComponent), multi: true }],
  template: `
    <div class="pw">
      <input class="input" [type]="visible() ? 'text' : 'password'" [attr.id]="inputId()" [attr.name]="name()"
             [attr.autocomplete]="autocomplete()" [attr.aria-describedby]="describedBy() || null"
             [value]="value" [disabled]="disabled" (input)="onInput($any($event.target).value)" (blur)="touched()">
      <button type="button" class="toggle" (click)="visible.set(!visible())" [attr.aria-pressed]="visible()"
              [attr.aria-label]="visible() ? 'Hide password' : 'Show password'">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          @if (visible()) { <path d="M3 3l18 18" /> }
        </svg>
      </button>
    </div>
  `,
  styles: `
    .pw { position: relative; }
    .input { padding-right: 50px; }
    .toggle {
      position: absolute; top: 50%; right: 5px; transform: translateY(-50%); width: 38px; height: 38px;
      display: grid; place-items: center; border: 0; border-radius: 8px; background: transparent; color: var(--muted); cursor: pointer;
    }
    .toggle:hover { color: var(--text); }
    svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  `,
})
export class PasswordInputComponent implements ControlValueAccessor {
  name = input('');
  inputId = input('');
  autocomplete = input('current-password');
  describedBy = input('');

  visible = signal(false);
  value = '';
  disabled = false;
  private changed: (v: string) => void = () => {};
  touched: () => void = () => {};

  onInput(v: string): void {
    this.value = v;
    this.changed(v);
  }

  writeValue(v: string | null): void {
    this.value = v ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.changed = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }

  setDisabledState(d: boolean): void {
    this.disabled = d;
  }
}
