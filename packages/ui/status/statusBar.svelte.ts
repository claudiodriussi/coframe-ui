/**
 * Status bar store — one ambient status line for the Chrome statusbar.
 *
 * NOT a dialog: msgbox/MessageBox blocks and asks. This is a passive,
 * non-blocking strip that shows "the last thing that happened".
 *
 * Two feeds:
 *  - client-explicit: statusBar.set(text, level) / statusBar.clear(). The
 *    frontend owns the lifecycle of what it sets.
 *  - server-driven: api.endpoint() reads a standard `$message` envelope field
 *    and pushes it here (see fromServer). Server messages are transient — they
 *    live exactly one endpoint call, so the line never goes stale.
 */

export type StatusLevel = 'info' | 'success' | 'warning' | 'error';

export interface StatusEntry {
  text: string;
  level: StatusLevel;
  /** Who set it. 'server' entries auto-clear on the next endpoint call. */
  source: 'client' | 'server';
}

/** Standard server envelope field (`$` = framework metadata convention). */
export interface ServerMessage {
  text: string;
  level?: StatusLevel;
}

class StatusBar {
  current = $state<StatusEntry | null>(null);

  /** Frontend-owned status; persists until the frontend clears it. */
  set(text: string, level: StatusLevel = 'info') {
    this.current = { text, level, source: 'client' };
  }

  clear() {
    this.current = null;
  }

  /** Called by api.endpoint() when a response carries `$message`. */
  fromServer(msg: ServerMessage) {
    this.current = { text: msg.text, level: msg.level ?? 'info', source: 'server' };
  }

  /**
   * Called by api.endpoint() when a response has no `$message`: drop a stale
   * server message so the line reflects only the latest operation. Client
   * messages are left untouched — the frontend owns them.
   */
  clearServer() {
    if (this.current?.source === 'server') this.current = null;
  }
}

export const statusBar = new StatusBar();
