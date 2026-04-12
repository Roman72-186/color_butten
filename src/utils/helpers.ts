import type { ButtonConfig } from '../types';

let counter = 0;

export function generateId(): string {
  counter += 1;
  return `btn_${Date.now()}_${counter}`;
}

export function createDefaultButton(row: number, col = 0): ButtonConfig {
  return {
    id: generateId(),
    text: '',
    style: 'default',
    actionType: 'callback_data',
    actionValue: '',
    row,
    col,
    iconCustomEmojiId: '',
  };
}

export function groupButtonsByRow(buttons: ButtonConfig[]): ButtonConfig[][] {
  const map = new Map<number, ButtonConfig[]>();

  for (const button of buttons) {
    const group = map.get(button.row);
    if (group) {
      group.push(button);
    } else {
      map.set(button.row, [button]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, group]) => group.slice().sort((a, b) => a.col - b.col));
}
