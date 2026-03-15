import type { ButtonConfig, InlineKeyboardButton, InlineKeyboardMarkup } from '../types';
import { groupButtonsByRow } from './helpers';

function buttonToJson(button: ButtonConfig): InlineKeyboardButton {
  const result: InlineKeyboardButton = { text: button.text };

  if (button.style !== 'default') {
    result.style = button.style;
  }

  switch (button.actionType) {
    case 'callback_data':
      result.callback_data = button.actionValue;
      break;
    case 'url':
      result.url = button.actionValue;
      break;
    case 'web_app':
      result.web_app = { url: button.actionValue };
      break;
  }

  return result;
}

export function generateJson(buttons: ButtonConfig[]): string {
  const rows = groupButtonsByRow(buttons);

  const markup: InlineKeyboardMarkup = {
    inline_keyboard: rows.map(row => row.map(buttonToJson)),
  };

  return JSON.stringify(markup, null, 2);
}
