export type CardId = string;
export type DeckId = string;

export interface Card {
  id: CardId;
  deckId: DeckId;
  frontText: string;
  backText: string;
  frontImageUri?: string;
  backImageUri?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  easeFactor?: number;
  intervalDays?: number;
}

export interface Deck {
  id: DeckId;
  name: string;
  description?: string;
  cardOrder: CardId[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRating {
  type: "again" | "hard" | "good" | "easy";
}

export interface ScheduledCard {
  card: Card;
  dueAt: number;
}
