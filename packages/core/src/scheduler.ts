import type { Card, ReviewRating } from "./models";

export interface ReviewUpdate {
  nextIntervalDays: number;
  updatedCard: Card;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getNextReview(card: Card, rating: ReviewRating, now: number = Date.now()): ReviewUpdate {
  const currentEase = card.easeFactor ?? 2.5;
  const currentInterval = card.intervalDays ?? 0;

  let ease = currentEase;
  let interval = currentInterval;

  switch (rating.type) {
    case "again":
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
      break;
    case "hard":
      interval = Math.max(1, Math.round(interval * 0.5)) || 1;
      ease = Math.max(1.3, ease - 0.1);
      break;
    case "good":
      interval = interval === 0 ? 1 : Math.round(interval * ease);
      ease = ease + 0.05;
      break;
    case "easy":
      interval = interval === 0 ? 2 : Math.round(interval * (ease + 0.3));
      ease = ease + 0.1;
      break;
  }

  const nextReviewDate = new Date(now + interval * ONE_DAY_MS);

  const updatedCard: Card = {
    ...card,
    easeFactor: ease,
    intervalDays: interval,
    lastReviewedAt: new Date(now).toISOString()
  };

  return {
    nextIntervalDays: interval,
    updatedCard
  };
}

export function isCardDue(card: Card, now: number = Date.now()): boolean {
  if (!card.lastReviewedAt || card.intervalDays == null) {
    return true;
  }
  const last = new Date(card.lastReviewedAt).getTime();
  const dueAt = last + card.intervalDays * ONE_DAY_MS;
  return now >= dueAt;
}

export function sortCardsByDueDate(cards: Card[], now: number = Date.now()): Card[] {
  return [...cards].sort((a, b) => {
    const aDue = getDueTime(a, now);
    const bDue = getDueTime(b, now);
    return aDue - bDue;
  });
}

/** Fisher–Yates shuffle (in place). */
function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/**
 * Order cards for a study session: same due-date priority as {@link sortCardsByDueDate},
 * but shuffles within each group of cards with identical due times. Unreviewed cards
 * (all tied at `now`) are shuffled together so insertion order (e.g. kana rows of five)
 * does not create predictable blocks.
 */
export function shuffleStudyQueue(cards: Card[], now: number = Date.now()): Card[] {
  if (cards.length <= 1) return [...cards];
  const decorated = cards.map((card) => ({ card, due: getDueTime(card, now) }));
  decorated.sort((a, b) => a.due - b.due);

  const result: Card[] = [];
  let i = 0;
  while (i < decorated.length) {
    const d = decorated[i].due;
    const group: Card[] = [];
    while (i < decorated.length && decorated[i].due === d) {
      group.push(decorated[i].card);
      i++;
    }
    shuffleInPlace(group);
    result.push(...group);
  }
  return result;
}

/**
 * Uniform random order for the whole deck (ignores due-date ordering). Use for maximum interleaving.
 */
export function shuffleStudyQueueFully(cards: Card[]): Card[] {
  if (cards.length <= 1) return [...cards];
  const copy = [...cards];
  shuffleInPlace(copy);
  return copy;
}

function getDueTime(card: Card, now: number): number {
  if (!card.lastReviewedAt || card.intervalDays == null) {
    return now;
  }
  const last = new Date(card.lastReviewedAt).getTime();
  return last + card.intervalDays * ONE_DAY_MS;
}
