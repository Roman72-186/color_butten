import { useRef, useState, useEffect, useCallback } from 'react';
import styles from './SlideTabs.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface SlideTabsProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  ariaLabel?: string;
}

interface PillStyle {
  left: number;
  width: number;
  opacity: number;
}

export function SlideTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Навигация',
}: SlideTabsProps<T>) {
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<PillStyle>({ left: 0, width: 0, opacity: 0 });

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  const getPillForIndex = useCallback((index: number): PillStyle | null => {
    const el = tabRefs.current[index];
    const nav = navRef.current;
    if (!el || !nav) return null;
    const navRect = nav.getBoundingClientRect();
    const tabRect = el.getBoundingClientRect();
    return {
      left: tabRect.left - navRect.left + nav.scrollLeft,
      width: tabRect.width,
      opacity: 1,
    };
  }, []);

  const updatePillToActive = useCallback(() => {
    const style = getPillForIndex(activeIndex);
    if (style) setPillStyle(style);
  }, [activeIndex, getPillForIndex]);

  useEffect(() => {
    updatePillToActive();
    window.addEventListener('resize', updatePillToActive);
    return () => window.removeEventListener('resize', updatePillToActive);
  }, [updatePillToActive]);

  const handleHover = (index: number) => {
    const style = getPillForIndex(index);
    if (style) setPillStyle(style);
  };

  return (
    <nav
      ref={navRef}
      className={styles.tabBar}
      role="tablist"
      aria-label={ariaLabel}
      onMouseLeave={updatePillToActive}
    >
      {tabs.map(({ id, label }, i) => (
        <button
          key={id}
          ref={el => { tabRefs.current[i] = el; }}
          id={`tab-${id}`}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          tabIndex={activeTab === id ? 0 : -1}
          className={styles.tab}
          onClick={() => onTabChange(id)}
          onMouseEnter={() => handleHover(i)}
          onFocus={() => handleHover(i)}
        >
          {label}
        </button>
      ))}
      <span
        className={styles.pill}
        style={{ left: pillStyle.left, width: pillStyle.width, opacity: pillStyle.opacity }}
        aria-hidden="true"
      />
    </nav>
  );
}
