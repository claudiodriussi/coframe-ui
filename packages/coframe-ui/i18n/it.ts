import { registerTranslations } from './index';

registerTranslations('it', {
  // validation
  'is required':              'è obbligatorio',
  'Invalid numeric value':    'Valore numerico non valido',

  // form states
  'Loading…':                 'Caricamento…',
  'Saving…':                  'Salvataggio…',
  'Saved':                    'Salvato',
  'Unsaved changes':          'Modifiche non salvate',
  'No fields configured.':    'Nessun campo configurato.',
  'Select an item to view the detail.': 'Seleziona un elemento per visualizzare il dettaglio.',

  // form errors
  'Error loading data':       'Errore nel caricamento',
  'Error saving':             'Errore nel salvataggio',

  // form confirm
  'You have unsaved changes. Discard them?': 'Hai modifiche non salvate. Vuoi annullarle?',

  // form buttons
  'Save':                     'Salva',
  'Save (F12 or Ctrl+Enter)': 'Salva (F12 o Ctrl+Enter)',
  // An intermediate frame confirms into the buffer; only the root saves.
  'Confirm (F12 or Ctrl+Enter)': 'Conferma (F12 o Ctrl+Enter)',
  'Cancel':                   'Annulla',
  'Cancel (Esc)':             'Annulla (Esc)',

  // dataview navigator
  'Add (Ins)':                'Aggiungi (Ins)',
  'Edit (Enter)':             'Modifica (Enter)',
  'Delete (Del)':             'Elimina (Del)',
  'Accept (Enter)':           'Accetta (Enter)',
  'Multiple selection':       'Selezione multipla',
  'Column filter':            'Filtro colonne',
  'Advanced search':          'Ricerca avanzata',
  'Group by':                 'Raggruppa',
  'Export CSV (F7)':          'Esporta CSV (F7)',
  'Print (F5)':               'Stampa (F5)',
  'Refresh (F6)':             'Aggiorna (F6)',
  'Load more':                'Carica altri',
  'Load {n} rows':            'Carica {n} righe',
  'Load all':                 'Carica tutto',

  // dataview actions
  'Edit':                     'Modifica',
  'New':                      'Nuovo',
  'Delete the selected record?': 'Eliminare il record selezionato?',
  'Error deleting record':    'Errore durante l\'eliminazione',

  // dataformview
  'Back to list':             'Torna alla lista',
  'Back':                     'Torna',

  // widgets
  'Search…':                  'Cerca…',
  'Searching…':               'Ricerca…',
  'No results':               'Nessun risultato',
  'Search more…':             'Cerca altro…',
  'Select…':                  'Seleziona…',
  'Select':                   'Seleziona',
  'Clear selection':          'Cancella selezione',
  'Clear search':             'Svuota la ricerca',
  'Search (Enter)':           'Cerca (Invio)',

  // rule editor
  'Filter editor':            'Editor dei filtri',
  'Filter — {model}':         'Filtro — {model}',
  'Apply':                    'Applica',
  'Quick search':             'Ricerca rapida',
  'Order by':                 'Ordina per',
  'Default ({order})':        'Predefinito ({order})',
  'as the view opens':        'come si apre la vista',
  'Ascending':                'Crescente',
  'Descending':               'Decrescente',
  'Back to the view order':   'Torna all\'ordine della vista',
  '· can be sorted cheaply':  '· ordinabile senza costo',
  'Add condition':            'Aggiungi condizione',
  'Add alternative':          'Aggiungi alternativa',
  'Duplicates this block as an alternative': 'Duplica questo blocco come alternativa',
  'Remove condition':         'Togli la condizione',
  'Field':                    'Campo',
  'Operator':                 'Operatore',
  'Value':                    'Valore',
  'From':                     'Da',
  'To':                       'A',
  'Remove':                   'Togli',
  'Type a value, then Enter': 'Scrivi un valore, poi Invio',
  'all':                      'tutti',
  'yes':                      'sì',
  'no':                       'no',
  'Add a value':              'Aggiungi un valore',
  'AND':                      'E',
  'OR':                       'O',
  'AND — binds tighter':      'E — lega più stretto',
  'OR — starts an alternative': 'O — apre un\'alternativa',
  'Did you mean OR?':         'Forse volevi O?',
  'A field holds one value: no row can satisfy both.':
    'Un campo ha un valore solo: nessuna riga può soddisfare entrambe.',
  'That value falls outside the range asked for above.':
    'Quel valore cade fuori dall\'intervallo chiesto sopra.',
  'These bounds leave no value in between.':
    'Questi limiti non lasciano in mezzo nessun valore.',
  'An empty field satisfies no comparison.':
    'Un campo vuoto non soddisfa nessun confronto.',

  // operators
  'contains':                 'contiene',
  'starts with':              'inizia per',
  'is':                       'è',
  'is not':                   'non è',
  'greater than':             'maggiore di',
  'greater or equal':         'maggiore o uguale',
  'less than':                'minore di',
  'less or equal':            'minore o uguale',
  'between':                  'compreso fra',
  'is one of':                'è una di',
  'is true':                  'è vero',
  'is false':                 'è falso',
  'is empty':                 'è vuoto',
  'is not empty':             'non è vuoto',

  // msgbox
  'Confirm':                  'Conferma',
  'Error':                    'Errore',
  'Close':                    'Chiudi',
});
