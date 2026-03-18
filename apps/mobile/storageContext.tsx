import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageProvider, Deck, Card } from "@flashcards/core";
import { defaultIdGenerator } from "@flashcards/core";

export const StorageProviderContext = React.createContext<StorageProvider | null>(null);

export function useStorage(): StorageProvider {
  const ctx = React.useContext(StorageProviderContext);
  if (!ctx) {
    throw new Error("StorageProviderContext not available");
  }
  return ctx;
}

const DECKS_KEY = "flashcards:decks";
const CARDS_KEY = "flashcards:cards";

async function loadMap<T>(key: string): Promise<Map<string, T>> {
  const json = await AsyncStorage.getItem(key);
  if (!json) return new Map();
  const obj = JSON.parse(json) as Record<string, T>;
  return new Map(Object.entries(obj));
}

async function saveMap<T>(key: string, map: Map<string, T>): Promise<void> {
  const obj: Record<string, T> = {};
  for (const [k, v] of map.entries()) {
    obj[k] = v;
  }
  await AsyncStorage.setItem(key, JSON.stringify(obj));
}

export function createAsyncStorageProvider(): StorageProvider {
  return {
    decks: {
      async getAllDecks(): Promise<Deck[]> {
        const map = await loadMap<Deck>(DECKS_KEY);
        return Array.from(map.values());
      },
      async getDeck(id: string): Promise<Deck | undefined> {
        const map = await loadMap<Deck>(DECKS_KEY);
        return map.get(id);
      },
      async saveDeck(deck: Deck): Promise<void> {
        const map = await loadMap<Deck>(DECKS_KEY);
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
        await saveMap(DECKS_KEY, map);
      },
      async deleteDeck(id: string): Promise<void> {
        const map = await loadMap<Deck>(DECKS_KEY);
        map.delete(id);
        await saveMap(DECKS_KEY, map);
      }
    },
    cards: {
      async getCardsForDeck(deckId: string): Promise<Card[]> {
        const map = await loadMap<Card>(CARDS_KEY);
        return Array.from(map.values()).filter((c) => c.deckId === deckId);
      },
      async getCard(id: string): Promise<Card | undefined> {
        const map = await loadMap<Card>(CARDS_KEY);
        return map.get(id);
      },
      async saveCard(card: Card): Promise<void> {
        const map = await loadMap<Card>(CARDS_KEY);
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
        await saveMap(CARDS_KEY, map);
      },
      async deleteCard(id: string): Promise<void> {
        const map = await loadMap<Card>(CARDS_KEY);
        map.delete(id);
        await saveMap(CARDS_KEY, map);
      }
    }
  };
}

