import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { money } from '../core/format';
import { AdminPlan, AdminPlanChanges } from '../core/models';

type Draft = { code: string; name: string; price: string; interval: 'WEEK' | 'MONTH'; duration_days: number | null; is_active: boolean };

const EMPTY: Draft = { code: '', name: '', price: '', interval: 'WEEK', duration_days: 7, is_active: true };

/** A plan's code from its name: "Day pass" → "day-pass". */
function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

@Component({
  selector: 'bp-plans',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Plans</h1>
        <p>What customers can buy in the app. Price changes apply to new payments only.</p>
      </div>
      @if (!editing() && auth.isSuperAdmin()) {
        <button class="btn" type="button" (click)="startNew()">New plan</button>
      }
    </div>

    @if (editing()) {
      <form class="panel editor" (ngSubmit)="save()" novalidate>
        <h2>{{ editing() === 'new' ? 'New plan' : 'Edit ' + draft.name }}</h2>
        <div class="grid">
          <label class="field">
            <span>Name</span>
            <input class="input" name="name" placeholder="Weekly" [(ngModel)]="draft.name" (ngModelChange)="nameChanged()">
            @if (errors()['name']) { <span class="err">{{ errors()['name'] }}</span> }
          </label>
          <label class="field">
            <span>Code</span>
            <input class="input" name="code" [(ngModel)]="draft.code" [readonly]="editing() !== 'new'" (ngModelChange)="codeTouched = true">
            <span class="hint">{{ editing() === 'new' ? 'How the apps refer to the plan. It can\\'t be changed later.' : 'Fixed once the plan exists.' }}</span>
            @if (errors()['code']) { <span class="err">{{ errors()['code'] }}</span> }
          </label>
          <label class="field">
            <span>Price (KES)</span>
            <input class="input" name="price" type="number" min="1" step="1" inputmode="numeric" [(ngModel)]="draft.price">
            <span class="hint">Whole shillings: M-Pesa doesn't take cents.</span>
            @if (errors()['price']) { <span class="err">{{ errors()['price'] }}</span> }
          </label>
          <label class="field">
            <span>Days each payment adds</span>
            <input class="input" name="duration_days" type="number" min="1" max="366" step="1" [(ngModel)]="draft.duration_days">
            @if (errors()['duration_days']) { <span class="err">{{ errors()['duration_days'] }}</span> }
          </label>
          <label class="field">
            <span>Shown as</span>
            <select class="input" name="interval" [(ngModel)]="draft.interval">
              <option value="WEEK">Billed weekly</option>
              <option value="MONTH">Billed monthly</option>
            </select>
            <span class="hint">The label in the app. The days above decide the length.</span>
          </label>
          <label class="check">
            <input type="checkbox" name="is_active" [(ngModel)]="draft.is_active">
            <span>Shown in the app <small>Unticked, nobody can buy it; existing subscribers keep their time.</small></span>
          </label>
        </div>
        <div class="row">
          <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : editing() === 'new' ? 'Create plan' : 'Save plan' }}</button>
          <button class="btn ghost" type="button" (click)="cancel()">Cancel</button>
          @if (formErr()) { <span class="form-err" role="alert">{{ formErr() }}</span> }
        </div>
      </form>
    }

    @if (notice()) { <p class="form-ok" role="status">{{ notice() }}</p> }
    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }
    @if (plans(); as list) {
      @if (shownCount() === 0) {
        <p class="form-err warn" role="alert">No plan is shown in the app, so nobody can subscribe. Show one or create one.</p>
      }
      <div class="dt-wrap">
        @if (list.length) {
          <table class="dt">
            <thead>
              <tr>
                <th scope="col">Plan</th><th scope="col">Code</th><th scope="col" class="num">Price</th><th scope="col" class="num">Days</th>
                <th scope="col">In the app</th><th scope="col" class="num">Active subscribers</th><th scope="col" class="num">Revenue</th>
                <th scope="col"><span class="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              @for (p of list; track p.id) {
                <tr [class.hidden-plan]="!p.is_active">
                  <td>{{ p.name }} <span class="muted">{{ p.interval === 'WEEK' ? 'weekly' : 'monthly' }}</span></td>
                  <td class="muted">{{ p.code }}</td>
                  <td class="num">{{ money(p.price, p.currency) }}</td>
                  <td class="num">{{ p.duration_days }}</td>
                  <td><span class="pill {{ p.is_active ? 'ok' : 'quiet' }}">{{ p.is_active ? 'Shown' : 'Hidden' }}</span></td>
                  <td class="num">{{ p.active_subscribers }}</td>
                  <td class="num">{{ money(p.revenue, p.currency) }}</td>
                  <td class="actions">
                    @if (auth.isSuperAdmin()) {
                      <button class="btn ghost small" type="button" (click)="startEdit(p)">Edit</button>
                      <button class="btn ghost small" type="button" (click)="toggle(p)">{{ p.is_active ? 'Hide' : 'Show' }}</button>
                      @if (!p.payments_count && !p.active_subscribers) {
                        <button class="btn danger small" type="button" (click)="remove(p)">Delete</button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <p class="empty">No plans yet. Create one so customers can subscribe.</p>
        }
      </div>
      <p class="foot muted">A plan that has payments can't be deleted, so its history stays readable. Hide it instead.</p>
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    .editor { padding: 22px; display: grid; gap: 16px; margin-bottom: 20px; }
    h2 { font-size: 18px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .hint, .check small { display: block; color: var(--muted); font-size: 12px; }
    .check { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; cursor: pointer; align-self: center; }
    .check input { margin-top: 4px; accent-color: var(--magenta); }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    select.input { appearance: auto; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .hidden-plan td:not(.actions) { opacity: 0.6; }
    .warn { margin-bottom: 12px; }
    .form-ok { margin-bottom: 12px; }
    .foot { font-size: 13px; margin-top: 12px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class PlansComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  plans = signal<AdminPlan[] | null>(null);
  error = signal('');
  notice = signal('');
  /** 'new', a plan id, or null when the form is closed. */
  editing = signal<string | null>(null);
  draft: Draft = { ...EMPTY };
  codeTouched = false;
  saving = signal(false);
  formErr = signal('');
  errors = signal<Record<string, string>>({});
  money = money;

  ngOnInit(): void {
    this.load();
  }

  shownCount(): number {
    return (this.plans() ?? []).filter((p) => p.is_active).length;
  }

  load(): void {
    this.api.adminPlans().then((p) => this.plans.set(p)).catch((e) => this.error.set(errorMessage(e, "Couldn't load the plans.")));
  }

  startNew(): void {
    this.draft = { ...EMPTY };
    this.codeTouched = false;
    this.openForm('new');
  }

  startEdit(p: AdminPlan): void {
    this.draft = {
      code: p.code, name: p.name, price: String(Number(p.price)), interval: p.interval,
      duration_days: p.duration_days, is_active: p.is_active,
    };
    this.openForm(p.id);
  }

  private openForm(id: string): void {
    this.errors.set({});
    this.formErr.set('');
    this.notice.set('');
    this.editing.set(id);
  }

  nameChanged(): void {
    if (this.editing() === 'new' && !this.codeTouched) this.draft.code = slug(this.draft.name);
  }

  cancel(): void {
    this.editing.set(null);
  }

  async save(): Promise<void> {
    const id = this.editing();
    if (!id) return;
    this.saving.set(true);
    this.errors.set({});
    this.formErr.set('');
    const d = this.draft;
    const body: AdminPlanChanges = {
      name: d.name, price: String(d.price ?? ''), interval: d.interval,
      duration_days: Number(d.duration_days), is_active: d.is_active,
    };
    if (id === 'new') body.code = d.code;
    try {
      const saved = id === 'new' ? await this.api.createPlan(body) : await this.api.updatePlan(id, body);
      this.editing.set(null);
      this.notice.set(id === 'new' ? `${saved.name} created.` : `${saved.name} saved.`);
      this.load();
    } catch (e) {
      this.errors.set(fieldErrors(e));
      if (!Object.keys(this.errors()).length || this.errors()['non_field_errors']) this.formErr.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async toggle(p: AdminPlan): Promise<void> {
    if (p.is_active && this.shownCount() === 1 && !confirm(`${p.name} is the only plan in the app. Hide it anyway? Nobody will be able to subscribe.`)) return;
    this.notice.set('');
    this.error.set('');
    try {
      await this.api.updatePlan(p.id, { is_active: !p.is_active });
      this.notice.set(p.is_active ? `${p.name} is hidden from the app.` : `${p.name} is shown in the app.`);
      this.load();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  async remove(p: AdminPlan): Promise<void> {
    if (!confirm(`Delete ${p.name}? This can't be undone.`)) return;
    this.notice.set('');
    this.error.set('');
    try {
      await this.api.deletePlan(p.id);
      this.notice.set(`${p.name} deleted.`);
      this.load();
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
