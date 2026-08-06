import { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
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

interface FadeStyle {
  left: number;
  right: number;
}

// Ширина затухания у края и отступ, на который активная вкладка отодвигается
// от края при автопрокрутке: под затуханием должен оставаться читаемый текст.
const FADE_PX = 24;

export function SlideTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel = 'Навигация',
}: SlideTabsProps<T>) {
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillStyle, setPillStyle] = useState<PillStyle>({ left: 0, width: 0, opacity: 0 });
  const [fade, setFade] = useState<FadeStyle>({ left: 0, right: 0 });

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

  // Все setState ниже возвращают прежний объект, если значения не изменились.
  // Без этого ResizeObserver и слушатель прокрутки уходят в бесконечный
  // ререндер: новый объект при каждом замере считается новым состоянием.
  const applyPill = useCallback((next: PillStyle) => {
    setPillStyle(prev =>
      prev.left === next.left && prev.width === next.width && prev.opacity === next.opacity
        ? prev
        : next
    );
  }, []);

  const updatePillToActive = useCallback(() => {
    const style = getPillForIndex(activeIndex);
    if (style) applyPill(style);
  }, [activeIndex, getPillForIndex, applyPill]);

  // Затухание у края — единственный признак того, что ряд продолжается за границей:
  // полоса прокрутки скрыта намеренно, без затухания обрез по границе вкладки
  // выглядит как законченный список.
  const updateFade = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const maxScroll = nav.scrollWidth - nav.clientWidth;
    const left = nav.scrollLeft > 1 ? FADE_PX : 0;
    const right = nav.scrollLeft < maxScroll - 1 ? FADE_PX : 0;
    setFade(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // Активная вкладка не должна оставаться за краем: пользователь нажал на неё
  // либо она появилась динамически (скрытая «Аналитика»), и подтверждение выбора
  // обязано быть видно.
  // Прокрутка мгновенная и через присваивание scrollLeft. `behavior: 'smooth'`
  // здесь сознательно не используется: в части webview он молча ничего не делает,
  // а его отказ возвращает исходный дефект — активную вкладку за краем экрана.
  const scrollActiveIntoView = useCallback(() => {
    const nav = navRef.current;
    const el = tabRefs.current[activeIndex];
    if (!nav || !el) return;

    const visibleLeft = nav.scrollLeft + FADE_PX;
    const visibleRight = nav.scrollLeft + nav.clientWidth - FADE_PX;
    const tabLeft = el.offsetLeft;
    const tabRight = tabLeft + el.offsetWidth;

    let target: number;
    if (tabLeft < visibleLeft) target = tabLeft - FADE_PX;
    else if (tabRight > visibleRight) target = tabRight - nav.clientWidth + FADE_PX;
    else return;

    nav.scrollLeft = Math.max(0, target);
    // Пересчёт затухания здесь обязателен и не дублирует слушатель: событие
    // scroll от программного присваивания приходит не во всех движках, а без
    // пересчёта затухание отстаёт на одно переключение и показывает край не с
    // той стороны. Слушатель остаётся для прокрутки пальцем.
    updateFade();
  }, [activeIndex, updateFade]);

  // Слушатели регистрируются один раз, а до свежих замеров дотягиваются через ref.
  // Иначе эффект перерегистрируется на каждой смене вкладки и ResizeObserver
  // срабатывает заново при каждом подключении.
  const measureRef = useRef({ updatePillToActive, scrollActiveIntoView });
  useLayoutEffect(() => {
    measureRef.current = { updatePillToActive, scrollActiveIntoView };
  });

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- измерение DOM для позиции плашки и затухания, канонический кейс useLayoutEffect
    updatePillToActive();
    updateFade();
  }, [updatePillToActive, updateFade]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- прокрутка к активной вкладке и синхронный пересчёт затухания по фактической геометрии DOM
    scrollActiveIntoView();
  }, [scrollActiveIntoView]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleResize = () => {
      measureRef.current.updatePillToActive();
      updateFade();
      measureRef.current.scrollActiveIntoView();
    };

    // Слушатель на самом контейнере, а не на window: следим за его горизонтальной
    // прокруткой, а не за прокруткой страницы.
    nav.addEventListener('scroll', updateFade, { passive: true });
    window.addEventListener('resize', handleResize);

    // Ширина ряда меняется и без ресайза окна — например, когда добавляется
    // скрытая вкладка «Аналитика».
    const observer = new ResizeObserver(handleResize);
    observer.observe(nav);

    return () => {
      nav.removeEventListener('scroll', updateFade);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [updateFade]);

  const handleHover = (index: number) => {
    const style = getPillForIndex(index);
    if (style) applyPill(style);
  };

  // Роving tabindex без стрелок оставлял неактивные вкладки недостижимыми
  // с клавиатуры — из Tab-обхода они исключены по aria-паттерну tablist.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const last = tabs.length - 1;
    let next: number | null = null;

    if (event.key === 'ArrowRight') next = activeIndex >= last ? 0 : activeIndex + 1;
    else if (event.key === 'ArrowLeft') next = activeIndex <= 0 ? last : activeIndex - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next === null) return;
    event.preventDefault();
    onTabChange(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <nav
      ref={navRef}
      className={styles.tabBar}
      role="tablist"
      aria-label={ariaLabel}
      onMouseLeave={updatePillToActive}
      onKeyDown={handleKeyDown}
      style={{
        '--fade-start': `${fade.left}px`,
        '--fade-end': `${fade.right}px`,
      } as React.CSSProperties}
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
