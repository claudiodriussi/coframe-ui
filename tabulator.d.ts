// Dichiarazione minimale per tabulator-tables (nessun @types disponibile).
// Evita l'errore TS7016 senza perdere il type-checking sul resto del codice.
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
