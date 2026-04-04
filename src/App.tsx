import { useState, useMemo, useCallback } from 'react';
import type { ButtonConfig } from './types';
import { MAX_BUTTONS } from './constants';
import { Toolbar } from './components/Toolbar';
import { ButtonCard } from './components/ButtonCard';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { TextFormatter } from './components/TextFormatter';
import { JsonFormatter } from './components/JsonFormatter';
import { RequestBuilder } from './components/RequestBuilder';
import { validateButton, hasAnyErrors } from './utils/validation';
import { generateJson } from './utils/generateJson';
import { generateMaxJson } from './utils/generateMaxJson';
import { createDefaultButton, getNextAvailableRow, groupButtonsByRow } from './utils/helpers';
import styles from './styles/App.module.css';

type TabType = 'keyboard' | 'requests' | 'formatter' | 'json';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('keyboard');
  const [buttons, setButtons] = useState<ButtonConfig[]>(() => [createDefaultButton(1)]);
  const [showValidation, setShowValidation] = useState(false);

  const allErrors = useMemo(() => buttons.map(validateButton), [buttons]);
  const hasErrors = useMemo(() => hasAnyErrors(allErrors), [allErrors]);
  const jsonResult = useMemo(() => generateJson(buttons), [buttons]);
  const maxJsonResult = useMemo(() => generateMaxJson(buttons), [buttons]);
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

  const resetAll = useCallback(() => {
    setButtons([createDefaultButton(1)]);
    setShowValidation(false);
  }, []);

  const handleCopy = useCallback(() => {
    setShowValidation(true);
  }, []);

  const isMaxButtons = buttons.length >= MAX_BUTTONS;

  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'keyboard' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('keyboard')}
          >
            Конструктор кнопок
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Конструктор запросов
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'formatter' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('formatter')}
          >
            Форматирование текста
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'json' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON-форматор
          </button>
        </div>

        <div style={{ display: activeTab === 'keyboard' ? undefined : 'none' }}>
          <Toolbar
            buttonCount={buttons.length}
            rowCount={rowCount}
          />

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

          <JsonOutput
            title="MAX API (platform-api.max.ru)"
            json={maxJsonResult}
            hasErrors={false}
            onCopy={() => {}}
          />
        </div>

        <div style={{ display: activeTab === 'formatter' ? undefined : 'none' }}>
          <TextFormatter />
        </div>

        <div style={{ display: activeTab === 'requests' ? undefined : 'none' }}>
          <RequestBuilder />
        </div>

        <div style={{ display: activeTab === 'json' ? undefined : 'none' }}>
          <JsonFormatter />
        </div>
      </div>
    </div>
  );
}

export default App;
