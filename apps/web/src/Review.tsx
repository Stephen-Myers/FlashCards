import React from "react";
import type { Card } from "@flashcards/core";
import { useStorage } from "./main";
import { isCardDue, getNextReview } from "@flashcards/core";

interface Props {
  deckId: string;
  onDone(): void;
}

export const Review: React.FC<Props> = ({ deckId, onDone }) => {
  const storage = useStorage();
  const [queue, setQueue] = React.useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);

  React.useEffect(() => {
    storage.cards.getCardsForDeck(deckId).then((cards) => {
      const due = cards.filter((c) => isCardDue(c));
      setQueue(due);
      setCurrentIndex(0);
      setShowBack(false);
    });
  }, [storage.cards, deckId]);

  const current = queue[currentIndex];

  const handleRating = async (rating: "again" | "hard" | "good" | "easy") => {
    if (!current) {
      onDone();
      return;
    }
    const update = getNextReview(current, { type: rating });
    await storage.cards.saveCard(update.updatedCard);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      onDone();
      return;
    }
    setCurrentIndex(nextIndex);
    setShowBack(false);
  };

  if (!current) {
    return (
      <div>
        <button onClick={onDone}>Back</button>
        <p>No cards due right now.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onDone}>Back</button>
      <div>
        {currentIndex + 1}/{queue.length}
      </div>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 16,
          minHeight: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}
      >
        <p>{showBack ? current.backText : current.frontText}</p>
      </div>
      {!showBack ? (
        <button onClick={() => setShowBack(true)}>Show Answer</button>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button onClick={() => handleRating("again")}>Again</button>
          <button onClick={() => handleRating("hard")}>Hard</button>
          <button onClick={() => handleRating("good")}>Good</button>
          <button onClick={() => handleRating("easy")}>Easy</button>
        </div>
      )}
    </div>
  );
};

