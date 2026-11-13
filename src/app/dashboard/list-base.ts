import { signal } from '@angular/core';

/**
 * Search, filter and page state shared by the dashboard lists. Typing in the
 * search box waits 300 ms before reloading, so each keystroke isn't a request.
 */
export abstract class ListBase<T> {
  data = signal<T | null>(null);
  error = signal('');
  loading = signal(false);
  page = signal(1);
  search = signal('');
  filter = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  private seq = 0;

  protected abstract fetch(q: Record<string, string | number>): Promise<T>;

  load(page = this.page()): void {
    this.page.set(page);
    this.loading.set(true);
    this.error.set('');
    const mine = ++this.seq;
    this.fetch({ page, search: this.search(), [this.filterKey]: this.filter() })
      .then((d) => mine === this.seq && this.data.set(d))
      .catch((e) => mine === this.seq && this.error.set(this.message(e)))
      .finally(() => mine === this.seq && this.loading.set(false));
  }

  protected filterKey = 'state';
  protected abstract message(e: unknown): string;

  onSearch(value: string): void {
    this.search.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  setFilter(value: string): void {
    this.filter.set(value);
    this.load(1);
  }
}
