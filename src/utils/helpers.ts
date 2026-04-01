import type { ButtonConfig } from '../types';
import { MAX_PER_ROW } from '../constants';

let counter = 0;

export function generateId(): string {
  counter += 1;
  return `btn_${Date.now()}_${counter}`;
}

export function countButtonsInRow(buttons: ButtonConfig[], row: number, excludeId?: string): number {
  return buttons.filter(b => b.row === row && b.id !== excludeId).length;
}

export function getNextAvailableRow(buttons: ButtonConfig[]): number {
  const rows = new Set(buttons.map(b => b.row));
  const sortedRows = Array.from(rows).sort((a, b) => a - b);

  for (const row of sortedRows) {
    if (countButtonsInRow(buttons, row) < MAX_PER_ROW) {
      return row;
    }
  }

  return sortedRows.length > 0 ? sortedRows[sortedRows.length - 1] + 1 : 1;
}

export function createDefaultButton(row: number): ButtonConfig {
  return {
    id: generateId(),
    text: '',
    style: 'default',
    actionType: 'callback_data',
    actionValue: '',
    row,
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
    .map(([, group]) => group);
}
