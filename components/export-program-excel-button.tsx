"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildProgramXlsx } from "@/lib/programs/excel";
import type { ProgramDetail } from "@/server/actions/programs";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function ExportProgramExcelButton({
  program,
}: {
  program: ProgramDetail;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    try {
      const { filename, bytes } = buildProgramXlsx(program);
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const blob = new Blob([buffer], { type: XLSX_TYPE });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Esportazione non riuscita. Riprova.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" onClick={handleExport}>
        Esporta in Excel
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
