import type { Deck, Card } from "./models";

export interface ExportBundle {
  decks: Deck[];
  cards: Card[];
}

export function serializeBundle(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function parseBundle(json: string): ExportBundle {
  const data = JSON.parse(json);
  if (!data || !Array.isArray(data.decks) || !Array.isArray(data.cards)) {
    throw new Error("Invalid bundle format");
  }
  return data as ExportBundle;
}

