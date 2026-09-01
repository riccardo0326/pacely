export const METRIC_TERMS = [
  "ctl",
  "atl",
  "tsb",
  "ftp",
  "vdot",
  "swimThreshold",
  "tss",
] as const;

export type MetricTerm = (typeof METRIC_TERMS)[number];

export type MetricGlossaryEntry = {
  abbr: string;
  title: string;
  body: string;
};

export const METRIC_GLOSSARY: Record<MetricTerm, MetricGlossaryEntry> = {
  ctl: {
    abbr: "CTL",
    title: "Carico cronico (fitness)",
    body: "Media del carico degli ultimi ~42 giorni. Sale piano: è la tua base di forma. Un aumento è in genere positivo, un calo indica che ti stai scaricando.",
  },
  atl: {
    abbr: "ATL",
    title: "Carico acuto (fatica)",
    body: "Media del carico degli ultimi ~7 giorni. Se sale, hai faticato di più di recente. Non è un miglioramento della forma: è fatica recente.",
  },
  tsb: {
    abbr: "TSB",
    title: "Forma (CTL − ATL)",
    body: "Quanto sei fresco rispetto al carico di base. Valore positivo = più riposato; negativo = più stanco. Un TSB in calo non è un miglioramento: significa più fatica recente.",
  },
  ftp: {
    abbr: "FTP",
    title: "Functional Threshold Power",
    body: "Potenza che in teoria puoi sostenere per circa un’ora in bici. Da qui si calcolano le zone di intensità in watt.",
  },
  vdot: {
    abbr: "VDOT",
    title: "Indice di condizione in corsa",
    body: "Stima della condizione di corsa (metodo Daniels) ricavata dalle prestazioni recenti. Serve a calcolare i passi delle zone.",
  },
  swimThreshold: {
    abbr: "Soglia nuoto",
    title: "Passo CSS",
    body: "Passo soglia in vasca, in min:sec ogni 100 m. Un passo più basso (più veloce) è un miglioramento. Da qui si ricavano le zone di nuoto.",
  },
  tss: {
    abbr: "TSS",
    title: "Training Stress Score",
    body: "Punteggio di carico di un allenamento, confrontabile tra corsa, bici e nuoto. Un’ora a soglia vale circa 100.",
  },
};
