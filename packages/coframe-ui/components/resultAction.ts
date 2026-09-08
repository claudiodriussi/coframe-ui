/**
 * What to do with what an operation answered.
 *
 * An operation that runs from a menu item, from a row action or from the `[⚡]`
 * popup ends the same way: it has done something, and the person who asked
 * deserves to see what. That last step is not always a dialog — sometimes the
 * answer IS a page (the rows that failed, a preview to work through) — so the
 * server says which, using the same `action` vocabulary as everything else: a
 * scalar verb plus its sibling keys.
 *
 *   {status: 'success', data: {message, detail}}                 → a box
 *   {status: 'success', data: {action: 'stack_push', panel: …}}  → a page
 *
 * Saying nothing means a box, which is what most operations want and keeps the
 * common case free of ceremony. The client never interprets the words: only the
 * server knows how many rows it touched.
 */
import { msgbox } from './msgbox.svelte';
import { _ } from '../i18n';
import PanelPage from './PanelPage.svelte';
import type { StackInstance } from '$coframe/stack/stack.svelte';

export interface ResultContext {
  /** Shown as the dialog title — normally the label of what was clicked. */
  title?: string;
  stack: StackInstance;
}

type Payload = Record<string, unknown>;

export async function applyResult(response: unknown, ctx: ResultContext): Promise<void> {
  const payload = (response ?? {}) as Payload;
  const body = (payload.data ?? {}) as Payload;

  if (payload.status === 'error') {
    await msgbox.error(
      (payload.message as string) ?? _('The operation failed'),
      body.detail as string | undefined,
      ctx.title,
    );
    return;
  }

  if (body.action === 'stack_push' && typeof body.panel === 'string') {
    ctx.stack.push(PanelPage, { panelId: body.panel, ...(body.props as object ?? {}) });
    return;
  }

  await msgbox.show({
    title: ctx.title,
    message: (body.message as string) ?? (payload.message as string) ?? _('Done'),
    detail: body.detail as string | undefined,
    variant: 'info',
    buttons: [{ label: 'OK', value: undefined, variant: 'primary' }],
  });
}
