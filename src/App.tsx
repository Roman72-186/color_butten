import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ButtonConfig } from './types';
import { MAX_BUTTONS } from './constants';
import { Toolbar } from './components/Toolbar';
import { ButtonCard } from './components/ButtonCard';
import { Preview } from './components/Preview';
import { JsonOutput } from './components/JsonOutput';
import { TextFormatter } from './components/TextFormatter';
import { JsonFormatter } from './components/JsonFormatter';
import { RequestBuilder } from './components/RequestBuilder';
import { MaxKeyboardTab } from './components/MaxKeyboardTab';
import { RadioactiveSnow } from './components/RadioactiveSnow';
import { validateButton, hasAnyErrors } from './utils/validation';
import { generateJson } from './utils/generateJson';
import { createDefaultButton, getNextAvailableRow, groupButtonsByRow } from './utils/helpers';
import styles from './styles/App.module.css';

type TabType = 'keyboard' | 'requests' | 'formatter' | 'json';
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

  // ── Swipe hint (убирается после первого взаимодействия) ────────────────
  const hintedRef = useRef(!!localStorage.getItem('swipe-hinted'));
  const [hinted, setHinted] = useState(hintedRef.current);

  const markHinted = useCallback(() => {
    if (!hintedRef.current) {
      hintedRef.current = true;
      setHinted(true);
      localStorage.setItem('swipe-hinted', '1');
    }
  }, []);

  // ── Swipe detection (native listeners, passive:false на move) ────────────
  const barRef = useRef<HTMLDivElement>(null);
  const lastTouchEnd = useRef(0);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > dy && dx > 8) e.preventDefault();
    };

    const onEnd = (e: TouchEvent) => {
      lastTouchEnd.current = Date.now();
      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;
      markHinted();
      if (Math.abs(deltaX) < 30 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      applyTheme(deltaX < 0 ? 'light' : 'dark');
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    el.addEventListener('touchend',   onEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onEnd);
    };
  }, [applyTheme, markHinted]);

  const handleThemeClick = useCallback(() => {
    if (Date.now() - lastTouchEnd.current < 500) return;
    markHinted();
    toggleTheme();
  }, [toggleTheme, markHinted]);

  // ── Telegram keyboard state ──────────────────────────────────────────────
  const [buttons, setButtons] = useState<ButtonConfig[]>(() => [createDefaultButton(1)]);
  const [showValidation, setShowValidation] = useState(false);

  const allErrors  = useMemo(() => buttons.map(validateButton), [buttons]);
  const hasErrors  = useMemo(() => hasAnyErrors(allErrors), [allErrors]);
  const jsonResult = useMemo(() => generateJson(buttons), [buttons]);
  const previewRows = useMemo(() => groupButtonsByRow(buttons), [buttons]);
  const rowCount   = useMemo(() => new Set(buttons.map(b => b.row)).size, [buttons]);

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
      <RadioactiveSnow />
      <div className={styles.content}>

        {/* Theme toggle */}
        <div
          ref={barRef}
          className={styles.themeBar}
          onClick={handleThemeClick}
          role="button"
        >
          <div className={`${styles.themeBarThumb} ${theme === 'light' ? styles.themeBarThumbLeft : styles.themeBarThumbRight} ${!hinted ? styles.themeBarThumbSwing : ''}`} />
          {!hinted && <div className={styles.themeBarShimmer} />}
          <div className={`${styles.themeBarOption} ${theme === 'light' ? styles.themeBarOptionActive : ''}`}>
            {!hinted && <span className={styles.themeHintArrow}>‹</span>}
            <span className={styles.themeBarEmoji}>☀</span>
            <span>Светлая</span>
          </div>
          <div className={`${styles.themeBarOption} ${theme === 'dark' ? styles.themeBarOptionActive : ''}`}>
            <span>Тёмная</span>
            <span className={styles.themeBarEmoji}>☽</span>
            {!hinted && <span className={styles.themeHintArrow}>›</span>}
          </div>
        </div>

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
          {/* Platform switcher */}
          <div className={styles.platformTabs}>
            <button
              className={`${styles.platformTab} ${keyboardPlatform === 'telegram' ? styles.platformTabActive : ''}`}
              onClick={() => setKeyboardPlatform('telegram')}
            >
              Telegram Bot API
            </button>
            <button
              className={`${styles.platformTab} ${keyboardPlatform === 'max' ? styles.platformTabActive : ''}`}
              onClick={() => setKeyboardPlatform('max')}
            >
              MAX API
            </button>
          </div>

          {/* Telegram keyboard */}
          {keyboardPlatform === 'telegram' && (
            <>
              <Toolbar buttonCount={buttons.length} rowCount={rowCount} />

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
            </>
          )}

          {/* MAX keyboard */}
          {keyboardPlatform === 'max' && <MaxKeyboardTab />}
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
