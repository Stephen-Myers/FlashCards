import type { Card, CardId, Deck, DeckId } from "./models";

export interface DeckRepository {
  getAllDecks(): Promise<Deck[]>;
  getDeck(id: DeckId): Promise<Deck | undefined>;
  saveDeck(deck: Deck): Promise<void>;
  deleteDeck(id: DeckId): Promise<void>;
}

export interface CardRepository {
  getCardsForDeck(deckId: DeckId): Promise<Card[]>;
  getCard(id: CardId): Promise<Card | undefined>;
  saveCard(card: Card): Promise<void>;
  deleteCard(id: CardId): Promise<void>;
}

export interface StorageProvider {
  decks: DeckRepository;
  cards: CardRepository;
}

export interface IdGenerator {
  (): string;
}

export const defaultIdGenerator: IdGenerator = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

