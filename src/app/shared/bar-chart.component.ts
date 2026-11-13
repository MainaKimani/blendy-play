import {
  AfterViewInit, Component, ElementRef, OnDestroy, computed, input, signal, viewChild,
} from '@angular/core';

export interface Bar {
  /** Axis and tooltip label, e.g. "13 Nov". */
  label: string;
  value: number;
  /** The value as the tooltip shows it, e.g. "KES 99". */
  display: string;
  /** A second tooltip line, e.g. "1 payment". */
  detail?: string;
}

/**
 * One-series bar chart drawn in SVG at the container's real pixel size, so
 * rounded bar ends and text never stretch. Bars sit on a shared baseline with
 * 2px gaps; the grid is recessive. Every bar shows a tooltip on hover or
 * keyboard focus (arrow keys move between bars).
 */
@Component({
  selector: 'bp-bar-chart',
  template: `
    <div class="wrap" #wrap [style.height.px]="height()">
      @if (width() > 0) {
        <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()">
          @for (t of ticks(); track t.y) {
            <line class="grid" [attr.x1]="axisW" [attr.x2]="width()" [attr.y1]="t.y" [attr.y2]="t.y" />
            <text class="tick" [attr.x]="axisW - 8" [attr.y]="t.y + 4" text-anchor="end">{{ t.text }}</text>
          }
          @for (b of geometry(); track $index) {
            <g class="bar" [class.on]="active() === $index">
              <rect class="hit" [attr.x]="b.slotX" [attr.y]="0" [attr.width]="b.slotW" [attr.height]="plotH"
                    (pointerenter)="active.set($index)" (pointerleave)="active.set(null)" />
              @if (b.h > 0) {
                <path [attr.d]="b.path" [attr.fill]="color()" />
              }
            </g>
          }
          <line class="base" [attr.x1]="axisW" [attr.x2]="width()" [attr.y1]="plotH" [attr.y2]="plotH" />
          @for (l of xLabels(); track l.x) {
            <text class="tick" [attr.x]="l.x" [attr.y]="plotH + 18" [attr.text-anchor]="l.anchor">{{ l.text }}</text>
          }
        </svg>
        <div class="focus" tabindex="0" [attr.aria-label]="ariaLabel() + '. Use the arrow keys to read each day.'"
             (keydown)="key($event)" (focus)="active.set(active() ?? data().length - 1)" (blur)="active.set(null)"></div>
        @if (tip(); as t) {
          <div class="tip" [style.left.px]="t.x" [style.top.px]="t.y" role="status">
            <strong>{{ t.bar.display }}</strong>
            <span>{{ t.bar.label }}@if (t.bar.detail) {, {{ t.bar.detail }}}</span>
          </div>
        }
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .wrap { position: relative; }
    svg { display: block; overflow: visible; }
    .grid { stroke: var(--line); stroke-width: 1; }
    .base { stroke: #3a3a46; stroke-width: 1; }
    .tick { fill: var(--muted); font: 11px var(--font); }
    .hit { fill: transparent; cursor: default; }
    .bar.on .hit { fill: rgba(255, 255, 255, 0.04); }
    .focus { position: absolute; inset: 0 0 24px 44px; border-radius: 6px; }
    .tip {
      position: absolute; transform: translate(-50%, calc(-100% - 10px)); pointer-events: none; z-index: 2;
      background: #1b1b26; border: 1px solid var(--line); border-radius: 9px; padding: 7px 10px;
      display: grid; gap: 1px; white-space: nowrap; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .tip strong { font-size: 14px; color: var(--text); }
    .tip span { font-size: 12px; color: var(--muted); }
  `,
})
export class BarChartComponent implements AfterViewInit, OnDestroy {
  data = input.required<Bar[]>();
  color = input('var(--chart-money)');
  height = input(200);
  ariaLabel = input('Bar chart');
  /** Formats axis tick values. */
  tickFormat = input<(n: number) => string>((n) => String(n));

  readonly axisW = 44;
  private wrap = viewChild.required<ElementRef<HTMLElement>>('wrap');
  private observer?: ResizeObserver;
  width = signal(0);
  active = signal<number | null>(null);

  get plotH(): number {
    return this.height() - 26;
  }

  /**
   * The axis top: four equal whole-number steps, each a "nice" size
   * (1, 2, 2.5, 5 x 10^n, with 2.5 only where it stays whole), covering
   * the largest value. Counts and shillings never get fractional ticks.
   */
  private max = computed(() => {
    const m = Math.max(0, ...this.data().map((d) => d.value));
    if (m <= 0) return 4;
    const raw = m / 4;
    const pow = 10 ** Math.max(0, Math.floor(Math.log10(raw)));
    const factors = pow >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
    const step = (factors.find((f) => f * pow >= raw) ?? 10) * pow;
    return step * 4;
  });

  ticks = computed(() => {
    const max = this.max();
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: Math.round(this.plotH - f * this.plotH) + 0.5,
      text: f === 0 ? '0' : this.tickFormat()(max * f),
    }));
  });

  geometry = computed(() => {
    const n = this.data().length;
    const plotW = Math.max(0, this.width() - this.axisW);
    const slotW = n ? plotW / n : 0;
    const gap = Math.min(2, slotW * 0.2);
    const barW = Math.max(1, slotW - gap * 2);
    const r = Math.min(4, barW / 2);
    return this.data().map((d, i) => {
      const h = d.value > 0 ? Math.max(2, (d.value / this.max()) * this.plotH) : 0;
      const x = this.axisW + i * slotW + gap;
      const y = this.plotH - h;
      const rr = Math.min(r, h);
      const path =
        `M${x},${this.plotH}V${y + rr}Q${x},${y} ${x + rr},${y}` +
        `H${x + barW - rr}Q${x + barW},${y} ${x + barW},${y + rr}V${this.plotH}Z`;
      return { slotX: this.axisW + i * slotW, slotW, x, h, y, w: barW, path };
    });
  });

  xLabels = computed(() => {
    const g = this.geometry();
    const d = this.data();
    if (!g.length) return [];
    const picks = g.length > 2 ? [0, Math.floor((g.length - 1) / 2), g.length - 1] : g.map((_, i) => i);
    return picks.map((i, k) => ({
      x: k === 0 ? g[i].x : k === picks.length - 1 ? g[i].x + g[i].w : g[i].x + g[i].w / 2,
      anchor: k === 0 ? 'start' : k === picks.length - 1 ? 'end' : 'middle',
      text: d[i].label,
    }));
  });

  tip = computed(() => {
    const i = this.active();
    if (i === null || !this.geometry()[i]) return null;
    const g = this.geometry()[i];
    const x = Math.min(Math.max(g.x + g.w / 2, 70), this.width() - 70);
    return { x, y: Math.min(g.y, this.plotH - 4), bar: this.data()[i] };
  });

  ngAfterViewInit(): void {
    const el = this.wrap().nativeElement;
    this.observer = new ResizeObserver(() => this.width.set(el.clientWidth));
    this.observer.observe(el);
    this.width.set(el.clientWidth);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  key(e: KeyboardEvent): void {
    const n = this.data().length;
    const i = this.active() ?? n - 1;
    if (e.key === 'ArrowLeft') this.active.set(Math.max(0, i - 1));
    else if (e.key === 'ArrowRight') this.active.set(Math.min(n - 1, i + 1));
    else if (e.key === 'Home') this.active.set(0);
    else if (e.key === 'End') this.active.set(n - 1);
    else return;
    e.preventDefault();
  }
}
