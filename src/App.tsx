import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ButtonConfig, ButtonStyle, ActionType } from './types';
import { TextFormatter } from './components/TextFormatter';
import { JsonFormatter } from './components/JsonFormatter';
import { RequestBuilder } from './components/RequestBuilder';
import { MaxKeyboardTab } from './components/MaxKeyboardTab';
import { LeadtehRequestBuilder } from './components/LeadtehRequestBuilder';
import { CurlImportPanel } from './components/CurlImportPanel';
import { GridConstructor } from './components/GridConstructor';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { SectionMenu } from './components/SectionMenu';
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

type TabType = 'keyboard' | 'requests' | 'formatter' | 'json' | 'curl' | 'leadteh' | 'analytics';
type KeyboardPlatform = 'telegram' | 'max';
type RequestPlatform = 'telegram' | 'max';

const TABS = [
  { id: 'formatter', label: 'Текст' },
  { id: 'json',      label: 'Форматор' },
] as const satisfies readonly { id: TabType; label: string }[];

const ANALYTICS_TAB = { id: 'analytics', label: 'Аналитика' } as const satisfies { id: TabType; label: string };

const APP_VERSION = '1.1.0';
// Тройной клик по версии в подвале открывает скрытую вкладку «Аналитика» — вместо URL-параметра,
// который в Telegram Mini App неудобно подставлять вручную.
const ADMIN_UNLOCK_CLICKS = 3;
const ADMIN_UNLOCK_WINDOW_MS = 1500;

/**
 * Имя страницы для аналитики. Для запросов pageview отправляет RequestBuilder
 * с выбранной платформой.
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
  // Стартовый раздел — API Telegram: он открывает самый частый сценарий работы.
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [isCurlOpen, setIsCurlOpen] = useState(false);
  const [requestPlatform, setRequestPlatform] = useState<RequestPlatform>('telegram');
  const [keyboardPlatform, setKeyboardPlatform] = useState<KeyboardPlatform>('telegram');

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'curl') setIsCurlOpen(false);
  }, []);

  const handleOpenCurl = useCallback(() => {
    setActiveTab('curl');
    setIsCurlOpen(true);
  }, []);

  const handleOpenKeyboard = useCallback((platform: KeyboardPlatform) => {
    setKeyboardPlatform(platform);
    setActiveTab('keyboard');
    setIsCurlOpen(false);
  }, []);

  const handleOpenApi = useCallback((platform: RequestPlatform) => {
    setRequestPlatform(platform);
    setActiveTab('requests');
    setIsCurlOpen(false);
  }, []);

  const handleOpenLeadteh = useCallback(() => {
    setActiveTab('leadteh');
    setIsCurlOpen(false);
  }, []);

  const activeSectionLabel = useMemo(() => {
    if (activeTab === 'keyboard') return keyboardPlatform === 'telegram' ? 'Кнопки Telegram' : 'Кнопки MAX';
    if (activeTab === 'requests') return requestPlatform === 'telegram' ? 'API Telegram' : 'API MAX';
    if (activeTab === 'leadteh') return 'API LEADTEH';
    if (activeTab === 'curl') return 'Разобрать curl';
    return tabs.find(tab => tab.id === activeTab)?.label ?? 'Раздел';
  }, [activeTab, keyboardPlatform, requestPlatform, tabs]);

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

  // Запрет зума только внутри Mini App (Telegram/MAX) — обычная веб-версия
  // сохраняет стандартный зум браузера ради доступности.
  useEffect(() => {
    if (!launchContext.isMiniApp) return;

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const previousContent = viewportMeta?.getAttribute('content') ?? null;
    viewportMeta?.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
    );

    document.documentElement.classList.add('mini-app-no-zoom');

    const preventGesture = (e: Event) => e.preventDefault();
    const preventPinch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('touchmove', preventPinch, { passive: false });

    return () => {
      document.documentElement.classList.remove('mini-app-no-zoom');
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('touchmove', preventPinch);
      if (previousContent !== null) viewportMeta?.setAttribute('content', previousContent);
    };
  }, [launchContext.isMiniApp]);

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

        <div className={styles.sectionNavigation}>
          <SectionMenu
            tabs={tabs}
            activeTab={activeTab}
            activeLabel={activeSectionLabel}
            onTabChange={handleTabChange}
            onOpenCurl={handleOpenCurl}
            onOpenKeyboard={handleOpenKeyboard}
            onOpenApi={handleOpenApi}
            onOpenLeadteh={handleOpenLeadteh}
          />
        </div>

        <section aria-label="Кнопки" hidden={activeTab !== 'keyboard'}>
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
        </section>

        <section aria-label="Текст" hidden={activeTab !== 'formatter'}>
          <TextFormatter />
        </section>

        <section aria-label="Запросы" hidden={activeTab !== 'requests'}>
          <RequestBuilder
            isActive={activeTab === 'requests'}
            platform={requestPlatform}
            onPlatformChange={setRequestPlatform}
          />
        </section>

        <section aria-label="Разобрать curl" hidden={activeTab !== 'curl'}>
          <CurlImportPanel isOpen={isCurlOpen} onOpenChange={setIsCurlOpen} />
        </section>

        <section aria-label="Форматор" hidden={activeTab !== 'json'}>
          <JsonFormatter />
        </section>

        <section aria-label="API LEADTEH" hidden={activeTab !== 'leadteh'}>
          <LeadtehRequestBuilder />
        </section>

        {isAdminMode && (
          <section aria-label="Аналитика" hidden={activeTab !== 'analytics'}>
            <AnalyticsPanel />
          </section>
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
