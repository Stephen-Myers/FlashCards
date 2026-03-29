import React from "react";
import type { Card } from "@flashcards/core";
import { useStorage } from "./main";

interface Props {
  deckId: string;
  cardId?: string;
  onDone(): void;
}

export const CardEditor: React.FC<Props> = ({ deckId, cardId, onDone }) => {
  const storage = useStorage();
  const [frontText, setFrontText] = React.useState("");
  const [backText, setBackText] = React.useState("");

  React.useEffect(() => {
    if (!cardId) return;
    storage.cards.getCard(cardId).then((card) => {
      if (card) {
        setFrontText(card.frontText);
        setBackText(card.backText);
      }
    });
  }, [cardId, storage.cards]);

  const onSave = async () => {
    const existing = cardId ? await storage.cards.getCard(cardId) : undefined;
    const base: Card =
      existing ?? {
        id: cardId || "",
        deckId,
        frontText: "",
        backText: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    await storage.cards.saveCard({
      ...base,
      deckId,
      frontText,
      backText,
      updatedAt: new Date().toISOString()
    });
    onDone();
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={onDone}>Back</button>
      <label>
        Front
        <textarea
          value={frontText}
          onChange={(e) => setFrontText(e.target.value)}
          placeholder="Front text"
          rows={4}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        Back
        <textarea
          value={backText}
          onChange={(e) => setBackText(e.target.value)}
          placeholder="Back text"
          rows={4}
          style={{ width: "100%" }}
        />
      </label>
      <button onClick={onSave}>Save</button>
    </div>
  );
};

