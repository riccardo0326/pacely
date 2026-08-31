import { parseEditableBlocks } from "@/lib/programs/blocks";
import type { ProgramDetail } from "@/server/actions/programs";

const SPORT_LABEL: Record<string, string> = {
  run: "Corsa",
  swim: "Nuoto",
  ride: "Ciclismo",
};

const WEEKDAY_LABEL = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

const BLOCK_TYPE_LABEL: Record<string, string> = {
  "warm-up": "Riscaldamento",
  "main-set": "Parte principale",
  "cool-down": "Defaticamento",
};

const METRIC_LABEL: Record<string, string> = {
  hr: "FC",
  pace: "Passo",
  power: "Potenza",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Pianificato",
  completed: "Completato",
  skipped: "Saltato",
  active: "Attivo",
  draft: "Bozza",
  archived: "Archiviato",
};

type Cell =
  { type: "string"; value: string } | { type: "number"; value: number };

export type ProgramXlsxFile = {
  filename: string;
  bytes: Uint8Array;
};

export function buildProgramXlsx(program: ProgramDetail): ProgramXlsxFile {
  const files = {
    "[Content_Types].xml": contentTypesXml(),
    "_rels/.rels": relsXml(),
    "xl/workbook.xml": workbookXml(),
    "xl/_rels/workbook.xml.rels": workbookRelsXml(),
    "xl/worksheets/sheet1.xml": worksheetXml(buildSummaryRows(program)),
    "xl/worksheets/sheet2.xml": worksheetXml(buildWorkoutRows(program)),
  };
  return {
    filename: excelFilename(program.name),
    bytes: zipStore(files),
  };
}

export function excelFilename(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
  return `${slug || "programma"}.xlsx`;
}

function buildSummaryRows(program: ProgramDetail): Cell[][] {
  const sports = program.sportsIncluded
    .map((sport) => SPORT_LABEL[sport] ?? sport)
    .join(", ");
  const start = formatDate(program.startDate);
  const goalDate = program.goal?.targetDate
    ? formatDate(program.goal.targetDate)
    : "";
  return [
    [str("Campo"), str("Valore")],
    [str("Nome"), str(program.name)],
    [str("Stato"), str(STATUS_LABEL[program.status] ?? program.status)],
    [str("Sport"), str(sports)],
    [str("Durata (settimane)"), num(program.durationWeeks)],
    [str("Data inizio"), str(start)],
    [str("Obiettivo"), str(program.goal?.description ?? "")],
    [str("Tipo obiettivo"), str(program.goal?.type ?? "")],
    [str("Distanza"), str(program.goal?.distance ?? "")],
    [str("Data gara"), str(goalDate)],
    [str("Vincoli"), str(program.constraints ?? "")],
    [str("Sintesi"), str(program.summary ?? "")],
  ];
}

function buildWorkoutRows(program: ProgramDetail): Cell[][] {
  const header: Cell[] = [
    str("Settimana"),
    str("Focus"),
    str("TSS settimana"),
    str("Giorno"),
    str("Data"),
    str("Sport"),
    str("Allenamento"),
    str("Durata (min)"),
    str("TSS"),
    str("Orario"),
    str("Stato"),
    str("Blocco"),
    str("Durata blocco (min)"),
    str("Zona"),
    str("Metrica"),
    str("Descrizione blocco"),
  ];
  const rows: Cell[][] = [header];

  for (const week of program.weeks) {
    for (const workout of week.workouts) {
      const blocks = parseEditableBlocks(workout.blocks);
      for (const block of blocks) {
        rows.push([
          num(week.number),
          str(week.focus ?? ""),
          num(week.weekLoadTarget),
          str(WEEKDAY_LABEL[workout.dayOfWeek] ?? ""),
          str(formatDate(workout.plannedDate)),
          str(SPORT_LABEL[workout.sport] ?? workout.sport),
          str(workout.name),
          num(workout.durationMin),
          num(workout.tss),
          str(workout.timeOfDay ?? ""),
          str(STATUS_LABEL[workout.status] ?? workout.status),
          str(BLOCK_TYPE_LABEL[block.type] ?? block.type),
          num(block.durationMin),
          str(block.zone),
          str(METRIC_LABEL[block.metric] ?? block.metric),
          str(block.description),
        ]);
      }
    }
  }
  return rows;
}

function worksheetXml(rows: Cell[][]): string {
  const body = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row
        .map((cell, colIndex) => cellXml(colLetter(colIndex), r, cell))
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function cellXml(col: string, row: number, cell: Cell): string {
  const ref = `${col}${row}`;
  if (cell.type === "number" && Number.isFinite(cell.value)) {
    return `<c r="${ref}"><v>${cell.value}</v></c>`;
  }
  const text = escapeXml(
    cell.type === "string" ? cell.value : String(cell.value),
  );
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Riepilogo" sheetId="1" r:id="rId1"/><sheet name="Allenamenti" sheetId="2" r:id="rId2"/></sheets></workbook>`;
}

function workbookRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`;
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
}

function str(value: string): Cell {
  return { type: "string", value };
}

function num(value: number): Cell {
  return { type: "number", value };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("it-IT", { timeZone: "UTC" });
}

function colLetter(index: number): string {
  let n = index;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralDir = concat(centrals);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(Object.keys(files).length),
    u16(Object.keys(files).length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, centralDir, end]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}
