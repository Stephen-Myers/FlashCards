import type { StorageProvider, Deck, Card } from "@flashcards/core";
import { defaultIdGenerator } from "@flashcards/core";

const DECKS_KEY = "flashcards:web:decks";
const CARDS_KEY = "flashcards:web:cards";

function loadMap<T>(key: string): Map<string, T> {
  const json = window.localStorage.getItem(key);
  if (!json) return new Map();
  const obj = JSON.parse(json) as Record<string, T>;
  return new Map(Object.entries(obj));
}

function saveMap<T>(key: string, map: Map<string, T>): void {
  const obj: Record<string, T> = {};
  for (const [k, v] of map.entries()) {
    obj[k] = v;
  }
  window.localStorage.setItem(key, JSON.stringify(obj));
}

export function createWebStorageProvider(): StorageProvider {
  return {
    decks: {
      async getAllDecks(): Promise<Deck[]> {
        const map = loadMap<Deck>(DECKS_KEY);
        return Array.from(map.values());
      },
      async getDeck(id: string): Promise<Deck | undefined> {
        const map = loadMap<Deck>(DECKS_KEY);
        return map.get(id);
      },
      async saveDeck(deck: Deck): Promise<void> {
        const map = loadMap<Deck>(DECKS_KEY);
        const now = new Date().toISOString();
        const id = deck.id || defaultIdGenerator();
        const existing = map.get(id);
        const toSave: Deck = {
          ...existing,
          ...deck,
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        };
        map.set(id, toSave);
        saveMap(DECKS_KEY, map);
      },
      async deleteDeck(id: string): Promise<void> {
        const map = loadMap<Deck>(DECKS_KEY);
        map.delete(id);
        saveMap(DECKS_KEY, map);
      }
    },
    cards: {
      async getCardsForDeck(deckId: string): Promise<Card[]> {
        const map = loadMap<Card>(CARDS_KEY);
        return Array.from(map.values()).filter((c) => c.deckId === deckId);
      },
      async getCard(id: string): Promise<Card | undefined> {
        const map = loadMap<Card>(CARDS_KEY);
        return map.get(id);
      },
      async saveCard(card: Card): Promise<void> {
        const map = loadMap<Card>(CARDS_KEY);
        const now = new Date().toISOString();
        const id = card.id || defaultIdGenerator();
        const existing = map.get(id);
        const toSave: Card = {
          ...existing,
          ...card,
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        };
        map.set(id, toSave);
        saveMap(CARDS_KEY, map);
      },
      async deleteCard(id: string): Promise<void> {
        const map = loadMap<Card>(CARDS_KEY);
        map.delete(id);
        saveMap(CARDS_KEY, map);
      }
    }
  };
}

