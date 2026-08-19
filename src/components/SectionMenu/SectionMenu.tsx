import { useEffect, useRef, useState } from 'react';
import styles from './SectionMenu.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface SectionMenuProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export function SectionMenu<T extends string>({ tabs, activeTab, onTabChange }: SectionMenuProps<T>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const active = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      return;
    }

    if (dialog.open) dialog.close();
  }, [isOpen]);

  const closeMenu = () => {
    dialogRef.current?.close();
  };

  const handleClose = () => {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleTabChange = (tab: T) => {
    onTabChange(tab);
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
        aria-label={`Выбрать раздел. Сейчас открыт: ${active.label}`}
        onClick={() => setIsOpen(true)}
      >
        <span className={styles.triggerLabel}>Раздел</span>
        <span className={styles.triggerValue}>{active.label}</span>
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
            <h2 id="section-menu-title" className={styles.title}>Разделы</h2>
            <button type="button" className={styles.closeButton} onClick={closeMenu}>
              Закрыть
            </button>
          </header>

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
        </div>
      </dialog>
    </>
  );
}
