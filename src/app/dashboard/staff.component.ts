import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage, fieldErrors } from '../core/errors';
import { ago, day } from '../core/format';
import { StaffMember, StaffRole } from '../core/models';

const ROLE_NAMES: Record<StaffRole, string> = { staff: 'Staff', superadmin: 'Super-admin' };

interface Draft {
  email: string;
  first_name: string;
  last_name: string;
  role: StaffRole;
}

/** The super-admin's view of who runs Blendy Play, and in which role. */
@Component({
  selector: 'bp-staff',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Staff</h1>
        <p>Staff can view the dashboard. Super-admins can also make changes, including to the staff.</p>
      </div>
      @if (!form()) {
        <button class="btn" type="button" (click)="startAdd()">Add staff</button>
      }
    </div>

    @if (form(); as mode) {
      <form class="panel editor" (ngSubmit)="save()" novalidate>
        <h2>{{ mode === 'add' ? 'Add staff' : 'Edit ' + (draft.email) }}</h2>
        <div class="grid">
          <label class="field full">
            <span>Email</span>
            <input class="input" name="email" type="email" autocomplete="off" [(ngModel)]="draft.email" [readonly]="mode !== 'add'">
            @if (mode === 'add') {
              <span class="hint">If this email has no account yet, we create one and email a link to choose a password.</span>
            }
            @if (errors()['email']) { <span class="err">{{ errors()['email'] }}</span> }
          </label>
          <label class="field">
            <span>First name</span>
            <input class="input" name="first_name" [(ngModel)]="draft.first_name">
          </label>
          <label class="field">
            <span>Last name</span>
            <input class="input" name="last_name" [(ngModel)]="draft.last_name">
          </label>
          <label class="field">
            <span>Role</span>
            <select class="input" name="role" [(ngModel)]="draft.role" [disabled]="editingYou()">
              <option value="staff">Staff (view only)</option>
              <option value="superadmin">Super-admin</option>
            </select>
            @if (editingYou()) { <span class="hint">You can't change your own role.</span> }
          </label>
        </div>
        <div class="row">
          <button class="btn" type="submit" [disabled]="saving()">
            {{ saving() ? 'Saving…' : mode === 'add' ? 'Add to staff' : 'Save' }}
          </button>
          <button class="btn ghost" type="button" (click)="form.set(null)">Cancel</button>
          @if (formErr()) { <span class="form-err" role="alert">{{ formErr() }}</span> }
        </div>
      </form>
    }

    @if (notice()) { <p class="form-ok" role="status">{{ notice() }}</p> }
    @if (error()) { <p class="form-err" role="alert">{{ error() }}</p> }

    @if (team(); as list) {
      <div class="dt-wrap">
        <table class="dt">
          <thead>
            <tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Status</th>
              <th scope="col">Last active</th><th scope="col">Added</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            @for (m of list; track m.id) {
              <tr>
                <td>
                  <strong>{{ m.name || m.email }}</strong>
                  @if (m.is_you) { <span class="muted"> (you)</span> }
                  @if (m.name) { <br><span class="muted">{{ m.email }}</span> }
                </td>
                <td>{{ roleName(m.role) }}</td>
                <td><span class="pill {{ status(m).tone }}">{{ status(m).text }}</span></td>
                <td>{{ m.last_active_at ? ago(m.last_active_at) : '—' }}</td>
                <td>{{ day(m.created_at) }}</td>
                <td><div class="actions">
                  @if (confirming() === m.id) {
                    <span class="muted">Make {{ m.name || m.email }} a customer again?</span>
                    <button class="btn danger small" type="button" [disabled]="busy() === m.id" (click)="remove(m)">Remove</button>
                    <button class="btn ghost small" type="button" (click)="confirming.set(null)">Keep</button>
                  } @else {
                    <button class="btn ghost small" type="button" (click)="startEdit(m)">Edit</button>
                    @if (!m.is_you) {
                      <button class="btn ghost small" type="button" [disabled]="busy() === m.id" (click)="toggleActive(m)">
                        {{ m.is_active ? 'Suspend' : 'Reactivate' }}
                      </button>
                      <button class="btn danger small" type="button" (click)="confirming.set(m.id)">Remove</button>
                    }
                  }
                </div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else if (!error()) {
      <div class="spinner"></div>
    }
  `,
  styles: `
    .editor { padding: 22px; display: grid; gap: 14px; margin-bottom: 18px; max-width: 720px; }
    .editor h2 { font-size: 18px; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    .hint { color: var(--muted); font-size: 12px; }
    .row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
    select.input { appearance: auto; }
    .actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class StaffComponent implements OnInit {
  private api = inject(ApiService);

  team = signal<StaffMember[] | null>(null);
  error = signal('');
  notice = signal('');
  form = signal<'add' | 'edit' | null>(null);
  editingId = signal<string | null>(null);
  editingYou = signal(false);
  draft: Draft = { email: '', first_name: '', last_name: '', role: 'staff' };
  saving = signal(false);
  formErr = signal('');
  errors = signal<Record<string, string>>({});
  busy = signal<string | null>(null);
  confirming = signal<string | null>(null);

  ago = ago;
  day = day;

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    try {
      this.team.set(await this.api.staff());
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  roleName(role: StaffRole): string {
    return ROLE_NAMES[role];
  }

  status(m: StaffMember): { text: string; tone: string } {
    if (!m.is_active) return { text: 'Suspended', tone: 'bad' };
    if (!m.has_password) return { text: 'Invited', tone: 'warn' };
    return { text: 'Active', tone: 'ok' };
  }

  startAdd(): void {
    this.draft = { email: '', first_name: '', last_name: '', role: 'staff' };
    this.editingId.set(null);
    this.editingYou.set(false);
    this.resetForm('add');
  }

  startEdit(m: StaffMember): void {
    this.draft = { email: m.email, first_name: m.first_name, last_name: m.last_name, role: m.role };
    this.editingId.set(m.id);
    this.editingYou.set(m.is_you);
    this.resetForm('edit');
  }

  private resetForm(mode: 'add' | 'edit'): void {
    this.formErr.set('');
    this.errors.set({});
    this.notice.set('');
    this.confirming.set(null);
    this.form.set(mode);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.formErr.set('');
    this.errors.set({});
    try {
      const { email, first_name, last_name, role } = this.draft;
      if (this.form() === 'add') {
        const res = await this.api.addStaff({ email: email.trim(), first_name, last_name, role });
        this.team.set(res.staff);
        this.notice.set(
          res.invited
            ? `Added ${email.trim()}. We've emailed them a link to choose a password.`
            : `Added ${email.trim()}. They sign in with their existing password.`,
        );
      } else {
        const changes = this.editingYou() ? { first_name, last_name } : { first_name, last_name, role };
        this.team.set(await this.api.updateStaff(this.editingId()!, changes));
        this.notice.set(`Saved ${email}.`);
      }
      this.form.set(null);
    } catch (e) {
      this.errors.set(fieldErrors(e));
      if (!Object.keys(this.errors()).length) this.formErr.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async toggleActive(m: StaffMember): Promise<void> {
    await this.act(m, () => this.api.updateStaff(m.id, { is_active: !m.is_active }),
      `${m.is_active ? 'Suspended' : 'Reactivated'} ${m.email}.`);
  }

  async remove(m: StaffMember): Promise<void> {
    await this.act(m, () => this.api.removeStaff(m.id), `${m.email} is a customer again.`);
  }

  private async act(m: StaffMember, call: () => Promise<StaffMember[]>, done: string): Promise<void> {
    this.busy.set(m.id);
    this.error.set('');
    this.notice.set('');
    try {
      this.team.set(await call());
      this.notice.set(done);
      this.confirming.set(null);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(null);
    }
  }
}
