import { useState, useMemo, useCallback } from 'react';
import type { ButtonConfig, MessageConfig } from './types';
import { MAX_BUTTONS } from './constants';
import { Toolbar } from './components/Toolbar';
import { MessageFields } from './components/MessageFields';
import { ButtonCard } from './components/ButtonCard';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { validateButton, hasAnyErrors } from './utils/validation';
import { generateJson } from './utils/generateJson';
import { createDefaultButton, getNextAvailableRow, groupButtonsByRow } from './utils/helpers';
import styles from './styles/App.module.css';

function App() {
  const [buttons, setButtons] = useState<ButtonConfig[]>(() => [createDefaultButton(1)]);
  const [message, setMessage] = useState<MessageConfig>({
    chatId: '',
    text: '',
    parseMode: 'HTML',
  });
  const [showValidation, setShowValidation] = useState(false);

  const allErrors = useMemo(() => buttons.map(validateButton), [buttons]);
  const hasErrors = useMemo(() => hasAnyErrors(allErrors), [allErrors]);
  const jsonResult = useMemo(() => generateJson(buttons, message), [buttons, message]);
  const previewRows = useMemo(() => groupButtonsByRow(buttons), [buttons]);
  const rowCount = useMemo(() => new Set(buttons.map(b => b.row)).size, [buttons]);

  const addButton = useCallback(() => {
    setButtons(prev => {
      const row = getNextAvailableRow(prev);
      return [...prev, createDefaultButton(row)];
    });
  }, []);

  const removeButton = useCallback((index: number) => {
    setButtons(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateButton = useCallback((index: number, field: keyof ButtonConfig, value: string | number) => {
    setButtons(prev =>
      prev.map((btn, i): ButtonConfig => {
        if (i !== index) return btn;
        const updated = { ...btn, [field]: value } as ButtonConfig;
        if (field === 'actionType' && value !== btn.actionType) {
          updated.actionValue = '';
        }
        return updated;
      })
    );
  }, []);

  const updateMessage = useCallback((field: keyof MessageConfig, value: string) => {
    setMessage(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setButtons([createDefaultButton(1)]);
    setMessage({ chatId: '', text: '', parseMode: 'HTML' });
    setShowValidation(false);
  }, []);

  const handleCopy = useCallback(() => {
    setShowValidation(true);
  }, []);

  const isMaxButtons = buttons.length >= MAX_BUTTONS;

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <Toolbar
          buttonCount={buttons.length}
          rowCount={rowCount}
        />

        <MessageFields message={message} onChange={updateMessage} />

        <div className={styles.section}>
          {buttons.map((button, index) => (
            <ButtonCard
              key={button.id}
              button={button}
              index={index}
              buttons={buttons}
              errors={allErrors[index]}
              showValidation={showValidation}
              canDelete={buttons.length > 1}
              onUpdate={updateButton}
              onRemove={removeButton}
            />
          ))}

          <div className={styles.cardActions}>
            <button
              className={styles.addBtn}
              onClick={addButton}
              disabled={isMaxButtons}
            >
              + Кнопка
            </button>
            <button className={styles.resetBtn} onClick={resetAll}>
              Сбросить
            </button>
          </div>
        </div>

        <Preview rows={previewRows} />

        <JsonOutput
          json={jsonResult}
          hasErrors={showValidation && hasErrors}
          onCopy={handleCopy}
        />
      </div>
    </div>
  );
}

export default App;
