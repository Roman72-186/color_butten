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

/**
 * Группирует элементы с полями row/col по строкам.
 * Возвращает массив строк, отсортированных по row; внутри строки — по col.
 */
export function groupByRow<T extends { row: number; col: number }>(items: T[]): T[][] {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const group = map.get(item.row) ?? [];
    group.push(item);
    map.set(item.row, group);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, group]) => group.slice().sort((a, b) => a.col - b.col));
}

/** Обёртка для обратной совместимости. */
export function groupButtonsByRow(buttons: ButtonConfig[]): ButtonConfig[][] {
  return groupByRow(buttons);
}
