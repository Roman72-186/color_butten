import { useState, useEffect, useRef } from 'react';
import styles from './BurgerMenu.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface BurgerMenuProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export function BurgerMenu<T extends string>({ tabs, activeTab, onTabChange }: BurgerMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLabel = tabs.find(t => t.id === activeTab)?.label ?? '';

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleSelect = (id: T) => {
    onTabChange(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Меню навигации"
      >
        <span className={`${styles.icon} ${open ? styles.iconOpen : ''}`}>
          <span />
          <span />
          <span />
        </span>
        <span className={styles.label}>{activeLabel}</span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▾</span>
      </button>

      <div className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`} role="listbox">
        {tabs.map(({ id, label }) => {
          const isActive = id === activeTab;
          return (
            <button
              key={id}
              role="option"
              aria-selected={isActive}
              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              onClick={() => handleSelect(id)}
            >
              <span className={styles.dot} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
