import { useEffect, useRef, useState } from 'react';
import styles from './SectionMenu.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

type ApiPlatform = 'telegram' | 'max';
type MenuLevel = 'root' | 'api';

interface SectionMenuProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  activeLabel: string;
  onTabChange: (tab: T) => void;
  onOpenCurl: () => void;
  onOpenApi: (platform: ApiPlatform) => void;
  onOpenLeadteh: () => void;
}

export function SectionMenu<T extends string>({
  tabs,
  activeTab,
  activeLabel,
  onTabChange,
  onOpenCurl,
  onOpenApi,
  onOpenLeadteh,
}: SectionMenuProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreTriggerFocusRef = useRef(true);
  const [isOpen, setIsOpen] = useState(false);
  const [menuLevel, setMenuLevel] = useState<MenuLevel>('root');
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
            {menuLevel === 'api' ? (
              <button type="button" className={styles.backButton} onClick={() => setMenuLevel('root')}>
                Назад
              </button>
            ) : (
              <h2 id="section-menu-title" className={styles.title}>Разделы</h2>
            )}
            {menuLevel === 'api' && <h2 id="section-menu-title" className={styles.title}>API</h2>}
            <button type="button" className={styles.closeButton} onClick={() => closeMenu()}>
              Закрыть
            </button>
          </header>

          {menuLevel === 'root' ? (
            <>
              <button
                type="button"
                className={`${styles.apiAction} ${isApiActive ? styles.apiActionActive : ''}`}
                aria-current={isApiActive ? 'true' : undefined}
                onClick={() => setMenuLevel('api')}
              >
                <span>API</span>
                <span className={styles.apiActionHint}>{isApiActive ? activeLabel : 'Telegram, MAX, LEADTEH'}</span>
              </button>

              <button
                type="button"
                className={`${styles.curlAction} ${isCurlActive ? styles.curlActionActive : ''}`}
                aria-current={isCurlActive ? 'true' : undefined}
                onClick={handleOpenCurl}
              >
                <span>Разобрать curl</span>
                <span className={styles.curlActionHint}>Вставить команду</span>
              </button>

              <div className={styles.list}>
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
