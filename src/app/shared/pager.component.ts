import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'bp-pager',
  template: `
    @if (pages() > 1) {
      <nav class="pager" aria-label="Pages">
        <button class="btn ghost small" type="button" [disabled]="page() <= 1" (click)="go.emit(page() - 1)">Previous</button>
        <span>Page {{ page() }} of {{ pages() }}</span>
        <button class="btn ghost small" type="button" [disabled]="page() >= pages()" (click)="go.emit(page() + 1)">Next</button>
      </nav>
    }
  `,
  styles: `
    .pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 14px; }
    span { color: var(--muted); font-size: 13px; }
  `,
})
export class PagerComponent {
  page = input(1);
  count = input(0);
  size = input(25);
  go = output<number>();
  pages = computed(() => Math.max(1, Math.ceil(this.count() / this.size())));
}
