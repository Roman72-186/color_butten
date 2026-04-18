import { useState, useMemo, useCallback, useEffect } from 'react';
import type { ButtonConfig } from './types';
import { TextFormatter } from './components/TextFormatter';
import { JsonFormatter } from './components/JsonFormatter';
import { RequestBuilder } from './components/RequestBuilder';
import { MaxKeyboardTab } from './components/MaxKeyboardTab';
import { LeadtehRequestBuilder } from './components/LeadtehRequestBuilder';
import { GridConstructor } from './components/GridConstructor';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { RadioactiveSnow } from './components/RadioactiveSnow';
import { validateButton, hasAnyErrors } from './utils/validation';
import { generateJson } from './utils/generateJson';
import { createDefaultButton, groupButtonsByRow } from './utils/helpers';
import styles from './styles/App.module.css';

type TabType = 'keyboard' | 'requests' | 'formatter' | 'json' | 'leadteh';
type KeyboardPlatform = 'telegram' | 'max';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('keyboard');
  const [keyboardPlatform, setKeyboardPlatform] = useState<KeyboardPlatform>('telegram');

  // ── Theme state ──────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const applyTheme = useCallback((next: 'dark' | 'light') => {
    setTheme(prev => {
      if (prev === next) return prev;
      document.documentElement.classList.add('theme-switching');
      setTimeout(() => document.documentElement.classList.remove('theme-switching'), 450);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyTheme]);

  const handleThemeClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  // ── Telegram keyboard state ──────────────────────────────────────────────
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const errorsById = useMemo(
    () => new Map(buttons.map(b => [b.id, validateButton(b)])),
    [buttons]
  );

  const hasErrors = useMemo(
    () => hasAnyErrors(Array.from(errorsById.values())),
    [errorsById]
  );

  const jsonResult = useMemo(() => generateJson(buttons), [buttons]);
  const previewRows = useMemo(() => groupButtonsByRow(buttons), [buttons]);

  const toggleCell = useCallback((row: number, col: number) => {
    setButtons(prev => {
      const exists = prev.find(b => b.row === row && b.col === col);
      if (exists) return prev.filter(b => !(b.row === row && b.col === col));
      return [...prev, createDefaultButton(row, col)];
    });
  }, []);

  const updateButtonById = useCallback((id: string, field: keyof ButtonConfig, value: string | number) => {
    setButtons(prev => prev.map(b => {
      if (b.id !== id) return b;
      const updated = { ...b, [field]: value } as ButtonConfig;
      if (field === 'actionType') updated.actionValue = '';
      return updated;
    }));
  }, []);

  const resetAll = useCallback(() => {
    setButtons([]);
    setShowValidation(false);
  }, []);

  const handleCopy = useCallback(() => {
    setShowValidation(true);
  }, []);

  return (
    <div className={styles.app}>
      <RadioactiveSnow />
      <div className={styles.content}>

        {/* Tab bar + theme toggle */}
        <div className={styles.appHeader}>
          <nav className={styles.tabBar} role="tablist">
            {([
              ['keyboard',  'Клавиши'],
              ['requests',  'Запросы'],
              ['formatter', 'Текст'],
              ['json',      'JSON'],
              ['leadteh',   'API LEADTEH'],
            ] as [TabType, string][]).map(([tab, label]) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                className={`${styles.tabBtn}${activeTab === tab ? ' ' + styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </nav>
          <button
            className={styles.themeBtn}
            onClick={handleThemeClick}
            aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>
        </div>

        <div
          role="tabpanel"
          id="panel-keyboard"
          aria-labelledby="tab-keyboard"
          hidden={activeTab !== 'keyboard'}
        >
          {/* Platform switcher */}
          <div className={styles.tabSelect}>
            <select
              className={styles.tabSelectEl}
              value={keyboardPlatform}
              onChange={e => setKeyboardPlatform(e.target.value as KeyboardPlatform)}
            >
              <option value="telegram">Telegram Bot API</option>
              <option value="max">MAX API</option>
            </select>
          </div>

          {/* Telegram keyboard — grid constructor */}
          {keyboardPlatform === 'telegram' && (
            <>
              <GridConstructor
                buttons={buttons}
                errorsById={errorsById}
                showValidation={showValidation}
                onToggleCell={toggleCell}
                onUpdateButton={updateButtonById}
                onReset={resetAll}
              />
              <Preview rows={previewRows} />
              <JsonOutput
                json={jsonResult}
                hasErrors={showValidation && hasErrors}
                onCopy={handleCopy}
              />
            </>
          )}

          {/* MAX keyboard */}
          {keyboardPlatform === 'max' && <MaxKeyboardTab />}
        </div>

        <div
          role="tabpanel"
          id="panel-formatter"
          aria-labelledby="tab-formatter"
          hidden={activeTab !== 'formatter'}
        >
          <TextFormatter />
        </div>

        <div
          role="tabpanel"
          id="panel-requests"
          aria-labelledby="tab-requests"
          hidden={activeTab !== 'requests'}
        >
          <RequestBuilder />
        </div>

        <div
          role="tabpanel"
          id="panel-json"
          aria-labelledby="tab-json"
          hidden={activeTab !== 'json'}
        >
          <JsonFormatter />
        </div>

        <div
          role="tabpanel"
          id="panel-leadteh"
          aria-labelledby="tab-leadteh"
          hidden={activeTab !== 'leadteh'}
        >
          <LeadtehRequestBuilder />
        </div>
      </div>
    </div>
  );
}

export default App;
