import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { dayTime } from '../core/format';
import { IssueMessage } from '../core/models';

/**
 * The conversation on a Help issue, and the reply box. Used by the customer
 * (mine = their messages) and by the team (mine = the team's). Messages are
 * plain text: Angular escapes them, and line breaks are kept by CSS.
 */
@Component({
  selector: 'bp-issue-thread',
  imports: [FormsModule],
  template: `
    <ol class="thread" #list>
      @for (m of messages(); track m.id) {
        <li [class.mine]="m.from_staff === staffSide()">
          <p class="who">{{ m.author }} · <time [attr.datetime]="m.created_at">{{ when(m.created_at) }}</time></p>
          <p class="body">{{ m.body }}</p>
        </li>
      }
    </ol>
    <form class="reply" (ngSubmit)="submit()" novalidate>
      <label class="field">
        <span>{{ label() }}</span>
        <textarea class="input" name="reply" rows="3" maxlength="4000" [(ngModel)]="draft"
                  (keydown.control.enter)="submit()" (keydown.meta.enter)="submit()"></textarea>
      </label>
      <div class="row">
        <button class="btn" type="submit" [disabled]="busy() || !draft.trim()">{{ busy() ? 'Sending…' : 'Send' }}</button>
        @if (error()) { <span class="form-err" role="alert">{{ error() }}</span> }
      </div>
    </form>
  `,
  styles: `
    :host { display: grid; gap: 16px; }
    .thread { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; max-height: 60vh; overflow-y: auto; }
    li { max-width: 80%; padding: 12px 14px; border-radius: 14px; background: var(--card-2); border: 1px solid var(--line); justify-self: start; }
    li.mine { justify-self: end; background: rgba(224, 64, 251, 0.10); border-color: rgba(224, 64, 251, 0.35); }
    .who { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
    .body { white-space: pre-wrap; overflow-wrap: anywhere; }
    textarea { resize: vertical; min-height: 84px; }
    .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    @media (max-width: 640px) { li { max-width: 92%; } }
  `,
})
export class IssueThreadComponent {
  messages = input.required<IssueMessage[]>();
  /** True on the team's side: the team's messages are "mine". */
  staffSide = input(false);
  label = input('Reply');
  busy = input(false);
  error = input('');
  send = output<string>();

  draft = '';
  private list = viewChild<ElementRef<HTMLOListElement>>('list');
  private seen = signal(0);

  constructor() {
    // Scroll to the newest message when new ones arrive.
    effect(() => {
      const n = this.messages().length;
      const el = this.list()?.nativeElement;
      if (el && n !== this.seen()) {
        this.seen.set(n);
        queueMicrotask(() => (el.scrollTop = el.scrollHeight));
      }
    });
  }

  when = dayTime;

  submit(): void {
    const body = this.draft.trim();
    if (!body || this.busy()) return;
    this.send.emit(body);
  }

  /** Called by the page once the message was sent. */
  clear(): void {
    this.draft = '';
  }
}
