import type { ButtonConfig } from '../types';
import { groupButtonsByRow } from './helpers';

interface MaxButton {
  type: 'callback' | 'link' | 'message';
  text: string;
  payload?: string;
  url?: string;
}

function buttonToMaxJson(button: ButtonConfig): MaxButton {
  switch (button.actionType) {
    case 'url':
    case 'web_app':
      return { type: 'link', text: button.text, url: button.actionValue };
    case 'switch_inline_query_current_chat':
    case 'switch_inline_query':
      return { type: 'message', text: button.text, payload: button.actionValue };
    default:
      return { type: 'callback', text: button.text, payload: button.actionValue };
  }
}

export function generateMaxJson(buttons: ButtonConfig[]): string {
  const rows = groupButtonsByRow(buttons);

  const body = {
    text: 'text',
    attachments: [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: rows.map(row => row.map(buttonToMaxJson)),
        },
      },
    ],
  };

  return JSON.stringify(body, null, 2);
}
