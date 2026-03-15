import type { ButtonConfig, ButtonErrors } from '../types';

export function validateButton(button: ButtonConfig): ButtonErrors {
  const errors: ButtonErrors = {};

  if (!button.text.trim()) {
    errors.text = 'Название кнопки обязательно';
  }

  if (!button.actionValue.trim()) {
    errors.actionValue = 'Значение действия обязательно';
  } else if (
    (button.actionType === 'url' || button.actionType === 'web_app') &&
    !button.actionValue.trim().startsWith('http://') &&
    !button.actionValue.trim().startsWith('https://')
  ) {
    errors.actionValue = 'Ссылка должна начинаться с http:// или https://';
  }

  return errors;
}

export function hasAnyErrors(errorsArray: ButtonErrors[]): boolean {
  return errorsArray.some(e => e.text !== undefined || e.actionValue !== undefined);
}
