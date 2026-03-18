import React from "react";
import { DeckList } from "./DeckList";
import { DeckDetail } from "./DeckDetail";
import { CardEditor } from "./CardEditor";
import { Review } from "./Review";
import { ThemeContext } from "./ThemeContext";
import { ExportImportControls } from "./ExportImportControls";

type View =
  | { type: "deckList" }
  | { type: "deckDetail"; deckId: string }
  | { type: "cardEditor"; deckId: string; cardId?: string }
  | { type: "review"; deckId: string };

export const App: React.FC = () => {
  const { theme, toggle } = React.useContext(ThemeContext);
  const [view, setView] = React.useState<View>({ type: "deckList" });

  const content =
    view.type === "deckList" ? (
      <DeckList
        onOpenDeck={(deckId) => setView({ type: "deckDetail", deckId })}
        onCreateDeck={(deckId) => setView({ type: "deckDetail", deckId })}
      />
    ) : view.type === "deckDetail" ? (
      <DeckDetail
        deckId={view.deckId}
        onBack={() => setView({ type: "deckList" })}
        onAddCard={() => setView({ type: "cardEditor", deckId: view.deckId })}
        onEditCard={(cardId) => setView({ type: "cardEditor", deckId: view.deckId, cardId })}
        onStudy={() => setView({ type: "review", deckId: view.deckId })}
      />
    ) : view.type === "cardEditor" ? (
      <CardEditor
        deckId={view.deckId}
        cardId={view.cardId}
        onDone={() => setView({ type: "deckDetail", deckId: view.deckId })}
      />
    ) : (
      <Review deckId={view.deckId} onDone={() => setView({ type: "deckDetail", deckId: view.deckId })} />
    );

  return (
    <div className={theme === "dark" ? "theme-dark" : "theme-light"}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
          <strong>Flash Cards</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ExportImportControls />
            <button onClick={toggle}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
};

