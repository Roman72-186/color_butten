import { useEffect, useRef, useState } from 'react';
import styles from './SectionMenu.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

type ApiPlatform = 'telegram' | 'max';
type KeyboardPlatform = 'telegram' | 'max';
type MenuLevel = 'root' | 'buttons' | 'api';

interface SectionMenuProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  activeLabel: string;
  onTabChange: (tab: T) => void;
  onOpenCurl: () => void;
  onOpenKeyboard: (platform: KeyboardPlatform) => void;
  onOpenApi: (platform: ApiPlatform) => void;
  onOpenLeadteh: () => void;
}

export function SectionMenu<T extends string>({
  tabs,
  activeTab,
  activeLabel,
  onTabChange,
  onOpenCurl,
  onOpenKeyboard,
  onOpenApi,
  onOpenLeadteh,
}: SectionMenuProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocusRef = useRef(true);
  const [isOpen, setIsOpen] = useState(false);
  const [menuLevel, setMenuLevel] = useState<MenuLevel>('root');
  const isKeyboardActive = activeTab === 'keyboard';
  const isApiActive = activeTab === 'requests' || activeTab === 'leadteh';
  const isCurlActive = activeTab === 'curl';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
  }, [isOpen]);

  const closeMenu = (restoreTriggerFocus = true) => {
    restoreTriggerFocusRef.current = restoreTriggerFocus;
    dialogRef.current?.close();
  };

  const handleClose = () => {
    setIsOpen(false);
    setMenuLevel('root');
    const shouldRestoreTriggerFocus = restoreTriggerFocusRef.current;
    restoreTriggerFocusRef.current = true;
    if (shouldRestoreTriggerFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const handleTabChange = (tab: T) => {
    onTabChange(tab);
    closeMenu();
  };

  const handleOpenCurl = () => {
    onOpenCurl();
    closeMenu(false);
  };

  const handleOpenKeyboard = (platform: KeyboardPlatform) => {
    onOpenKeyboard(platform);
    closeMenu();
  };

  const handleOpenApi = (platform: ApiPlatform) => {
    onOpenApi(platform);
    closeMenu();
  };

  const handleOpenLeadteh = () => {
    onOpenLeadteh();
    closeMenu();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="section-menu"
        aria-label={`Выбрать раздел. Сейчас открыт: ${activeLabel}`}
        onClick={() => {
          setMenuLevel('root');
          setIsOpen(true);
        }}
      >
        <span className={styles.triggerLabel}>Раздел</span>
        <span className={styles.triggerValue}>{activeLabel}</span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>

      <dialog
        ref={dialogRef}
        id="section-menu"
        className={styles.dialog}
        aria-labelledby="section-menu-title"
        onClose={handleClose}
        onClick={event => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className={styles.sheet}>
          <header className={styles.header}>
            {menuLevel !== 'root' ? (
              <button type="button" className={styles.backButton} onClick={() => setMenuLevel('root')}>
                Назад
              </button>
            ) : (
              <h2 id="section-menu-title" className={styles.title}>Разделы</h2>
            )}
            {menuLevel !== 'root' && (
              <h2 id="section-menu-title" className={styles.title}>
                {menuLevel === 'buttons' ? 'Кнопки' : 'API'}
              </h2>
            )}
            <button type="button" className={styles.closeButton} onClick={() => closeMenu()}>
              Закрыть
            </button>
          </header>

          {menuLevel === 'root' ? (
            <>
              <button
                type="button"
                className={`${styles.groupAction} ${isKeyboardActive ? styles.groupActionActive : ''}`}
                aria-current={isKeyboardActive ? 'true' : undefined}
                onClick={() => setMenuLevel('buttons')}
              >
                <span>Кнопки</span>
                <span className={styles.groupActionHint}>
                  {isKeyboardActive ? activeLabel : 'Telegram, MAX'}
                </span>
              </button>

              <button
                type="button"
                className={`${styles.groupAction} ${isApiActive ? styles.groupActionActive : ''}`}
                aria-current={isApiActive ? 'true' : undefined}
                onClick={() => setMenuLevel('api')}
              >
                <span>API</span>
                <span className={styles.groupActionHint}>{isApiActive ? activeLabel : 'Telegram, MAX, LEADTEH'}</span>
              </button>

              <div className={styles.list}>
                <button
                  type="button"
                  className={`${styles.option} ${isCurlActive ? styles.optionActive : ''}`}
                  aria-current={isCurlActive ? 'true' : undefined}
                  onClick={handleOpenCurl}
                >
                  <span>Разобрать curl</span>
                  {isCurlActive && <span className={styles.currentLabel}>Открыт</span>}
                </button>

                {tabs.map(tab => {
                  const isActive = tab.id === activeTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      <span>{tab.label}</span>
                      {isActive && <span className={styles.currentLabel}>Открыт</span>}
                    </button>
                  );
                })}
              </div>
            </>
          ) : menuLevel === 'buttons' ? (
            <div className={styles.list}>
              <button type="button" className={styles.option} onClick={() => handleOpenKeyboard('telegram')}>
                Кнопки Telegram
              </button>
              <button type="button" className={styles.option} onClick={() => handleOpenKeyboard('max')}>
                Кнопки MAX
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              <button type="button" className={styles.option} onClick={() => handleOpenApi('telegram')}>
                API Telegram
              </button>
              <button type="button" className={styles.option} onClick={() => handleOpenApi('max')}>
                API MAX
              </button>
              <button type="button" className={styles.option} onClick={handleOpenLeadteh}>
                API LEADTEH
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
