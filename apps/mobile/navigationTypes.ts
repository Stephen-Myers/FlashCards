export type RootStackParamList = {
  DeckList: undefined;
  Settings: undefined;
  DeckDetail: { deckId: string };
  CardEditor: { deckId: string; cardId?: string };
  Review: { deckId: string };
};
