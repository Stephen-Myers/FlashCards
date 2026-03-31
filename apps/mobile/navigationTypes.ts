export type RootStackParamList = {
  DeckList: undefined;
  Settings: undefined;
  DeckDetail: { deckId: string; deckName?: string };
  CardEditor: { deckId: string; cardId?: string };
  Review: { deckId: string; combineGroupSize?: number; combineSeparator?: string };
};
