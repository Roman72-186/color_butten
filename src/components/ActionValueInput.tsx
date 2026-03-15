import type { ActionType } from '../types';
import { ACTION_PLACEHOLDERS } from '../constants';
import { ValidationError } from './ValidationError';

interface ActionValueInputProps {
  actionType: ActionType;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  callback_data: 'Введите callback_data',
  url: 'Введите URL',
  web_app: 'Введите ссылку WebApp',
};

export function ActionValueInput({ actionType, value, error, onChange }: ActionValueInputProps) {
  const label = ACTION_LABELS[actionType] ?? 'Значение действия';
  const placeholder = ACTION_PLACEHOLDERS[actionType] ?? '';

  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      <ValidationError message={error} />
    </div>
  );
}
