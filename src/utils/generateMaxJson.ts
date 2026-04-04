import type { ButtonConfig } from '../types';
import { groupButtonsByRow } from './helpers';

function buttonToMaxButton(button: ButtonConfig): Record<string, unknown> | null {
  const base = { text: button.text };
  switch (button.actionType) {
    case 'callback_data':
      return { ...base, type: 'callback', payload: button.actionValue };
    case 'url':
    case 'web_app':
      return { ...base, type: 'link', url: button.actionValue };
    case 'switch_inline_query_current_chat':
    case 'switch_inline_query':
      // MAX не поддерживает inline-режим — ближайший аналог: message
      return { ...base, type: 'message', payload: button.actionValue };
    default:
      return null;
  }
}

export function generateMaxJson(buttons: ButtonConfig[]): string {
  const rows = groupButtonsByRow(buttons);

  const buttonRows = rows
    .map(row => row.map(buttonToMaxButton).filter((b): b is Record<string, unknown> => b !== null))
    .filter(row => row.length > 0);

  const body: Record<string, unknown> = { text: 'text' };

  if (buttonRows.length > 0) {
    body.attachments = [
      { type: 'inline_keyboard', payload: { buttons: buttonRows } },
    ];
  }

  return JSON.stringify(body, null, 2);
}
