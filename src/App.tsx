import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ButtonConfig, ButtonStyle, ActionType } from './types';
import { TextFormatter } from './components/TextFormatter';
import { JsonFormatter } from './components/JsonFormatter';
import { RequestBuilder } from './components/RequestBuilder';
import { MaxKeyboardTab } from './components/MaxKeyboardTab';
import { LeadtehRequestBuilder } from './components/LeadtehRequestBuilder';
import { GridConstructor } from './components/GridConstructor';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { SlideTabs } from './components/SlideTabs';
import { AiDictationPanel } from './components/AiDictationPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { validateButton, hasAnyErrors } from './utils/validation';
import { generateJson } from './utils/generateJson';
import { createDefaultButton, groupButtonsByRow, generateId } from './utils/helpers';
import { getLaunchContext } from './utils/launchContext';
import { trackPageview } from './utils/analytics';
import styles from './styles/App.module.css';

const VALID_BUTTON_STYLES: ButtonStyle[] = ['default', 'primary', 'success', 'danger'];
const VALID_ACTION_TYPES: ActionType[] = [
  'callback_data', 'url', 'web_app', 'switch_inline_query', 'switch_inline_query_current_chat',
];

function clampGridIndex(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(7, Math.max(1, Math.round(n)));
}

type TabType = 'keyboard' | 'requests' | 'formatter' | 'json' | 'leadteh' | 'analytics';
type KeyboardPlatform = 'telegram' | 'max';

const TABS = [
  { id: 'keyboard',  label: 'Кнопки' },
  { id: 'requests',  label: 'Запросы' },
  { id: 'formatter', label: 'Текст' },
  { id: 'json',      label: 'JSON-форматор' },
  { id: 'leadteh',   label: 'API LEADTEH' },
] as const satisfies readonly { id: TabType; label: string }[];

const ANALYTICS_TAB = { id: 'analytics', label: 'Аналитика' } as const satisfies { id: TabType; label: string };

const APP_VERSION = '1.1.0';
// Тройной клик по версии в подвале открывает скрытую вкладку «Аналитика» — вместо URL-параметра,
// который в Telegram Mini App неудобно подставлять вручную.
const ADMIN_UNLOCK_CLICKS = 3;
const ADMIN_UNLOCK_WINDOW_MS = 1500;

/**
 * Имя страницы для аналитики. 'requests' возвращает null — вкладка «Запросы» держит
 * свой platform-переключатель внутри RequestBuilder (не поднят в App), поэтому там
 * трекается отдельно через проп isActive.
 */
function pageNameForTab(tab: TabType, keyboardPlatform: KeyboardPlatform): string | null {
  if (tab === 'keyboard') return `keyboard:${keyboardPlatform}`;
  if (tab === 'requests') return null;
  return tab;
}

function App() {
  const launchContext = useMemo(() => getLaunchContext(), []);
  // Скрытая админ-вкладка «Аналитика» — открывается тройным кликом по версии в подвале,
  // обычным пользователям не видна и не показывается в UI до разблокировки.
  const [isAdminMode, setIsAdminMode] = useState(false);
  const unlockClickTimestampsRef = useRef<number[]>([]);
  const tabs = useMemo(() => (isAdminMode ? [...TABS, ANALYTICS_TAB] : TABS), [isAdminMode]);
  const [activeTab, setActiveTab] = useState<TabType>('keyboard');
  const [keyboardPlatform, setKeyboardPlatform] = useState<KeyboardPlatform>('telegram');

  const handleVersionClick = useCallback(() => {
    const now = Date.now();
    const recentClicks = [...unlockClickTimestampsRef.current, now].filter(
      ts => now - ts <= ADMIN_UNLOCK_WINDOW_MS
    );
    unlockClickTimestampsRef.current = recentClicks;
    if (recentClicks.length >= ADMIN_UNLOCK_CLICKS) {
      unlockClickTimestampsRef.current = [];
      setIsAdminMode(true);
      setActiveTab('analytics');
    }
  }, []);

  useEffect(() => {
    const page = pageNameForTab(activeTab, keyboardPlatform);
    if (page) trackPageview(page);
  }, [activeTab, keyboardPlatform]);

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

  const applyAiTelegramButtons = useCallback((result: unknown) => {
    if (!Array.isArray(result)) return;

    const mapped: ButtonConfig[] = result
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(item => ({
        id: generateId(),
        text: String(item.text ?? ''),
        style: VALID_BUTTON_STYLES.includes(item.style as ButtonStyle) ? (item.style as ButtonStyle) : 'default',
        actionType: VALID_ACTION_TYPES.includes(item.actionType as ActionType)
          ? (item.actionType as ActionType)
          : 'callback_data',
        actionValue: String(item.actionValue ?? ''),
        row: clampGridIndex(item.row),
        col: clampGridIndex(item.col),
        iconCustomEmojiId: '',
      }));

    const deduped = Array.from(new Map(mapped.map(b => [`${b.row}:${b.col}`, b])).values());
    setButtons(deduped);
    setShowValidation(false);
  }, []);

  return (
    <div className={`${styles.app} ${launchContext.platform === 'web' ? styles.webMode : ''}`}>
      <div className={styles.content}>
        {!launchContext.isMiniApp && (
          <header className={styles.webHeader}>
            <div>
              <p className={styles.webMeta}>Веб-версия</p>
              <h1 className={styles.webTitle}>Красим кнопки</h1>
              <p className={styles.webSubtitle}>Telegram Bot API, MAX API, JSON и LEADTEH в одном рабочем окне.</p>
            </div>
          </header>
        )}

        <SlideTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

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
              <AiDictationPanel
                mode="telegram-keyboard"
                hint="Опиши голосом раскладку кнопок — например: «кнопка Записаться callback zapis, рядом кнопка Отмена callback cancel»."
                onResult={applyAiTelegramButtons}
              />
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
          <RequestBuilder isActive={activeTab === 'requests'} />
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

        {isAdminMode && (
          <div
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            hidden={activeTab !== 'analytics'}
          >
            <AnalyticsPanel />
          </div>
        )}

        <footer className={styles.footer} data-analytics-skip>
          <button
            type="button"
            className={styles.footerVersion}
            onClick={handleVersionClick}
            aria-label="Версия приложения"
          >
            v:{APP_VERSION}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default App;
