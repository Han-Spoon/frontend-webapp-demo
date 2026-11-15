import type { SavedCard, SaveCardRequest } from '../../api/card';
import { readDemo, writeDemo } from './storage';

export function listDemoCards(): SavedCard[] {
  return readDemo<SavedCard[]>('cards', []);
}

export function saveDemoCard(request: SaveCardRequest): SavedCard {
  const card: SavedCard = {
    cardId: crypto.randomUUID(),
    type: request.type,
    menuNameKo: request.menuNameKo,
    text: request.text,
    createdAt: new Date().toISOString(),
  };
  writeDemo('cards', [card, ...listDemoCards()]);
  return card;
}

export function deleteDemoCard(cardId: string): void {
  writeDemo('cards', listDemoCards().filter(card => card.cardId !== cardId));
}
