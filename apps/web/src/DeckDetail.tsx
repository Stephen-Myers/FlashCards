import React from "react";
import type { Deck, Card } from "@flashcards/core";
import { useStorage } from "./main";

interface Props {
  deckId: string;
  onBack(): void;
  onAddCard(): void;
  onEditCard(cardId: string): void;
  onStudy(): void;
}

export const DeckDetail: React.FC<Props> = ({ deckId, onBack, onAddCard, onEditCard, onStudy }) => {
  const storage = useStorage();
  const [deck, setDeck] = React.useState<Deck | undefined>();
  const [cards, setCards] = React.useState<Card[]>([]);

  const load = React.useCallback(async () => {
    const d = await storage.decks.getDeck(deckId);
    const c = await storage.cards.getCardsForDeck(deckId);
    setDeck(d);
    setCards(c);
  }, [storage, deckId]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!deck) {
    return (
      <div>
        <button onClick={onBack}>Back</button>
        <p>Deck not found.</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <h1>{deck.name || "Untitled deck"}</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={onAddCard}>Add Card</button>
        <button onClick={onStudy}>Study</button>
      </div>
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <button onClick={() => onEditCard(card.id)}>{card.frontText || "(no front text)"}</button>
          </li>
        ))}
      </ul>
      {cards.length === 0 && <p>No cards yet. Add one to start studying.</p>}
    </div>
  );
};

