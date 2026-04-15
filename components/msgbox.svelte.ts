export type DialogVariant = 'info' | 'warning' | 'error' | 'danger';
export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface DialogButton {
  label: string;
  value: unknown;
  variant?: ButtonVariant;
}

export interface DialogOptions {
  title?: string;
  message: string;
  /** Shown in a collapsible <pre> block — tracebacks, YAML/JS errors */
  detail?: string;
  variant?: DialogVariant;
  /** true = Esc and outside-click do NOT close the dialog */
  modal?: boolean;
  buttons: DialogButton[];
}

interface ActiveDialog {
  title?: string;
  message: string;
  detail?: string;
  variant: DialogVariant;
  modal: boolean;
  buttons: DialogButton[];
}

// The resolve function lives outside $state — storing functions in reactive
// state causes Svelte to wrap them in proxies, breaking the Promise chain.
let _resolve: ((v: unknown) => void) | null = null;
let _active = $state<ActiveDialog | null>(null);

function show(opts: DialogOptions): Promise<unknown> {
  return new Promise((resolve) => {
    _resolve = resolve;
    _active = { variant: 'info', modal: false, ...opts };
  });
}

export const msgbox = {
  get active(): ActiveDialog | null { return _active; },

  respond(value: unknown) {
    _active = null;
    const res = _resolve;
    _resolve = null;
    res?.(value);
  },

  /** Requires explicit choice — not dismissible by clicking outside */
  confirm(message: string, title?: string): Promise<boolean> {
    return show({
      title: title ?? 'Conferma',
      message,
      variant: 'warning',
      modal: true,
      buttons: [
        { label: 'Annulla',  value: false, variant: 'secondary' },
        { label: 'Conferma', value: true,  variant: 'primary'   },
      ],
    }) as Promise<boolean>;
  },

  /** Simple informational message */
  alert(message: string, title?: string): Promise<void> {
    return show({
      title,
      message,
      variant: 'info',
      modal: false,
      buttons: [{ label: 'OK', value: undefined, variant: 'primary' }],
    }) as Promise<void>;
  },

  /**
   * Error with optional detail block.
   * detail is typically a Python traceback or YAML parse error string.
   */
  error(message: string, detail?: string, title?: string): Promise<void> {
    return show({
      title: title ?? 'Errore',
      message,
      detail,
      variant: 'error',
      modal: false,
      buttons: [{ label: 'Chiudi', value: undefined, variant: 'secondary' }],
    }) as Promise<void>;
  },

  /** Fully custom — escape hatch for multi-button or non-standard cases */
  show(opts: DialogOptions): Promise<unknown> {
    return show(opts);
  },
};
