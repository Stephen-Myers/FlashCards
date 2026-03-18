import React from "react";
import { useStorage } from "./main";
import { serializeBundle, parseBundle } from "@flashcards/core";

export const ExportImportControls: React.FC = () => {
  const storage = useStorage();

  const handleExport = async () => {
    const decks = await storage.decks.getAllDecks();
    const cardsArrays = await Promise.all(decks.map((d) => storage.cards.getCardsForDeck(d.id)));
    const cards = cardsArrays.flat();
    const json = serializeBundle({ decks, cards });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const bundle = parseBundle(text);
    for (const deck of bundle.decks) {
      await storage.decks.saveDeck(deck);
    }
    for (const card of bundle.cards) {
      await storage.cards.saveCard(card);
    }
    alert("Import complete.");
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={handleExport}>Export JSON</button>
      <label style={{ fontSize: 14 }}>
        Import JSON
        <input type="file" accept="application/json" onChange={handleImport} style={{ marginLeft: 4 }} />
      </label>
    </div>
  );
};

