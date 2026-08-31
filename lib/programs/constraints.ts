import type { Sport } from "@/lib/llm/schemas";

const AVOIDANCE =
  /(?:evitar[ei]|niente|non\s+(?:fare|programmare|includere)?)\s+([^.;]+)/gi;

export const WEEKDAY_NAMES = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
] as const;

export const TRIATHLON_SPORTS: Sport[] = ["run", "swim", "ride"];

export function forbiddenTermsFromConstraints(constraints?: string): string[] {
  if (!constraints?.trim()) {
    return [];
  }
  const lower = constraints.toLowerCase();
  const terms = new Set<string>();
  if (lower.includes("salita")) {
    terms.add("salita");
  }
  if (lower.includes("asfalto")) {
    terms.add("asfalto");
  }
  for (const match of constraints.matchAll(AVOIDANCE)) {
    const phrase = match[1]?.trim().toLowerCase();
    if (phrase && phrase.length >= 4 && phrase.length <= 80) {
      terms.add(phrase);
    }
  }
  return [...terms];
}

export function textContainsForbidden(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

export function scrubForbiddenText(
  text: string,
  terms: string[],
  fallback: string,
): string {
  if (!textContainsForbidden(text, terms)) {
    return text;
  }
  return fallback;
}

export function looksLikeTriathlonGoal(text: string): boolean {
  return /ironman|70\s*\.?\s*3|triathlon|half[\s-]?iron|mezzo[\s-]?iron/i.test(
    text,
  );
}

export function missingTriathlonSports(sports: string[]): Sport[] {
  return TRIATHLON_SPORTS.filter((sport) => !sports.includes(sport));
}
