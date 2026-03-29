import React from "react";
import type { Deck } from "@flashcards/core";
import { useStorage } from "./main";

interface Props {
  onOpenDeck(deckId: string): void;
  onCreateDeck(deckId: string): void;
}

export const DeckList: React.FC<Props> = ({ onOpenDeck, onCreateDeck }) => {
  const storage = useStorage();
  const [decks, setDecks] = React.useState<Deck[]>([]);

  const load = React.useCallback(() => {
    storage.decks.getAllDecks().then(setDecks);
  }, [storage]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleNewDeck = async () => {
    const id = Date.now().toString();
    await storage.decks.saveDeck({
      id,
      name: "New deck",
      description: "",
      cardOrder: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    onCreateDeck(id);
  };

  return (
    <div>
      <h1>Decks</h1>
      <button onClick={handleNewDeck}>New Deck</button>
      <ul>
        {decks.map((d) => (
          <li key={d.id}>
            <button onClick={() => onOpenDeck(d.id)}>{d.name || "Untitled deck"}</button>
          </li>
        ))}
      </ul>
      {decks.length === 0 && <p>No decks yet. Create one to get started.</p>}
    </div>
  );
}

