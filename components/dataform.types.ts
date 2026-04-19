/**
 * dataform.types.ts — type definitions for DataForm and widget components.
 *
 * Step A: flat field list, local binding (source.data).
 * Step B: endpoint-driven (source.endpoint).
 * Step C: DB CRUD (source.model / source.id).
 */

export interface FormFieldChoice {
  value: unknown;
  label: string;
}

// ── Field descriptor ───────────────────────────────────────────────────────

export interface FormField {
  name: string;
  label?: string;
  help?: string;
  widget?: string;           // explicit widget override
  type?: string;             // data type (for widget auto-resolution)
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  choices?: FormFieldChoice[]; // for combobox with local data (Step A) or enum
  widget_props?: Record<string, unknown>;
  // Layout
  same_row?: boolean;        // true → joins the previous field's row (inline)
  width?: number | string;   // px (number) or "30%" (string); absent → flex-1
  [key: string]: unknown;
}

// Row grouping: fields on the same line (Phase 2)
export interface FormFieldRow {
  row: FormField[];
}

// Group: collapsible section with header (Phase 2)
export interface FormFieldGroup {
  group: string;
  collapsible?: boolean;
  fields: Array<FormField | FormFieldRow | FormFieldGroup>;
}

export type FormFieldEntry = FormField | FormFieldRow | FormFieldGroup;

// ── Source ─────────────────────────────────────────────────────────────────

export interface FormSource {
  // Mode 4: local binding — resolved by parent before passing to DataForm
  data?: Record<string, unknown>;
  // Mode 1: edit existing record
  // Mode 2: new record (id: null)
  model?: string;
  id?: unknown;
  defaults?: Record<string, unknown>;
  autofocus?: string;         // field name to focus on mount
  // Mode 3: endpoint-driven
  endpoint?: string;
  pass?: Record<string, unknown>;
  save_endpoint?: string;
}

// ── Actions ────────────────────────────────────────────────────────────────

export interface FormToolbarAction {
  id: string;
  label?: string;
  icon?: string;
  action?: string;
  confirm?: string;
  [key: string]: unknown;
}

export interface FormActions {
  toolbar?: Array<string | FormToolbarAction>;
}

// ── Policy ─────────────────────────────────────────────────────────────────

export interface FormPolicy {
  editable?: boolean;
  toolbar_position?: 'top' | 'bottom';
  button_align?: 'left' | 'right';
  button_style?: 'label' | 'icon' | 'icon-label';
}

// ── Top-level descriptor ────────────────────────────────────────────────────

export interface FormDescriptor {
  type: 'form';
  title?: string;
  source?: FormSource;
  fields?: FormFieldEntry[];
  actions?: FormActions;
  policy?: FormPolicy;
  [key: string]: unknown;
}

// ── Toolbar status ──────────────────────────────────────────────────────────

export type FormStatusType = 'info' | 'warning' | 'error' | 'success';

export interface FormStatus {
  message: string;
  type?: FormStatusType;
}

// ── Widget contract ─────────────────────────────────────────────────────────
// Implemented by every WidgetXxx.svelte.

export interface WidgetProps {
  value: unknown;
  onchange: (v: unknown) => void;
  onblur?: () => void;    // optional: called on blur for validation trigger
  readonly?: boolean;
  field: FormField;
}
