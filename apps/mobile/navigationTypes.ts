export type RootStackParamList = {
  DeckList: undefined;
  DeckDetail: { deckId: string };
  CardEditor: { deckId: string; cardId?: string };
  Review: { deckId: string };
};
