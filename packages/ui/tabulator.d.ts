// Minimal declaration for tabulator-tables (no @types available).
// Avoids TS7016 error without losing type-checking on the rest of the code.
declare module 'tabulator-tables' {
  export class Tabulator {
    constructor(element: HTMLElement | string, options?: Record<string, unknown>);
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    setData(data: any[]): Promise<void>;
    replaceData(data: any[]): Promise<void>;
    setColumns(columns: any[]): void;
    setHeight(height: number | string): void;
    getSelectedData(): any[];
    deselectRow(rows?: any): void;
    download(type: string, filename?: string, options?: object): void;
    destroy(): void;
  }

  export class TabulatorFull extends Tabulator {}
}
