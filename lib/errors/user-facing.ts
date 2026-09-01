import { LlmQuotaExceededError } from "@/lib/llm/quota";

export const USER_FACING_ERROR = {
  generic: "Qualcosa è andato storto. Riprova tra poco.",
  generateProgram:
    "La generazione del programma non è riuscita. Riprova tra un minuto.",
  regenerateProgram:
    "La rigenerazione non è riuscita. Il programma attuale non è stato modificato.",
  importSync: "Sincronizzazione Strava non riuscita. Riprova tra poco.",
  profileSync:
    "Sincronizzazione del profilo Strava non riuscita. Riprova tra poco.",
  profileSave:
    "Non siamo riusciti a salvare il profilo. Controlla i valori e riprova.",
  gearSave: "Non siamo riusciti a salvare l'attrezzatura. Riprova.",
  importProcess: "Import interrotto. Puoi riprovare.",
  importRetry: "Impossibile riavviare l'import. Riprova tra poco.",
  pageLoad: "Non siamo riusciti a caricare questa pagina. Riprova.",
  notFound: "Questa pagina non esiste o non è più disponibile.",
} as const;

/**
 * Maps thrown errors to copy the athlete can act on.
 * Internal messages (stack, provider JSON, Prisma) stay off the UI.
 */
export function toUserFacingError(
  error: unknown,
  fallback: string = USER_FACING_ERROR.generic,
): string {
  if (error instanceof LlmQuotaExceededError) {
    return error.message;
  }
  return fallback;
}
