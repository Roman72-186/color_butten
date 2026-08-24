import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from './SectionMenu.module.css';

interface Tab<T extends string> {
  id: T;
  label: string;
}

type ApiPlatform = 'telegram' | 'max';
type KeyboardPlatform = 'telegram' | 'max';
type MenuLevel = 'root' | 'buttons' | 'api';

// Критически задемпфированная пружина (damping 1.0), response ~0.35s —
// см. .claude/skills/apple-design. stiffness/damping посчитаны из него,
// а не подобраны на глаз: response = 2π / sqrt(stiffness), damping = 2*sqrt(stiffness).
const SPRING_STIFFNESS = 320;
const SPRING_DAMPING = 36;
const CLOSE_DISTANCE_RATIO = 0.3; // утянуть шит больше чем на 30% его высоты — закрыть
const CLOSE_VELOCITY = 600; // px/s — быстрый флик вниз закрывает независимо от дистанции
const RUBBERBAND_DIMENSION = 60;

function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface DragState {
  pointerId: number;
  startY: number;
  startPosition: number;
  lastY: number;
  lastTime: number;
  velocity: number;
}

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

  const sheetHeightRef = useRef(0);
  const positionRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopSpring = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const applyDragPosition = (y: number) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const sheetHeight = sheetHeightRef.current || 1;
    const opacity = 1 - Math.min(Math.max(y, 0), sheetHeight) / sheetHeight;
    dialog.style.transform = `translateY(${y}px)`;
    dialog.style.setProperty('--backdrop-opacity', String(opacity));
  };

  const releaseDialogControl = () => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.classList.remove(styles.dragging);
    dialog.style.transform = '';
    dialog.style.removeProperty('--backdrop-opacity');
  };

  // Пружина от текущей (живой) позиции к target — никогда не от целевого значения
  // в обход текущего: если жест уже в полёте, следующий drag подхватит именно эту точку.
  const runSpring = (target: number, initialVelocity: number, onSettle: () => void) => {
    stopSpring();

    if (prefersReducedMotion()) {
      positionRef.current = target;
      onSettle();
      return;
    }

    let position = positionRef.current;
    let velocity = initialVelocity;
    let lastTime: number | null = null;

    const step = (now: number) => {
      if (lastTime === null) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;

      const springForce = -SPRING_STIFFNESS * (position - target);
      const dampingForce = -SPRING_DAMPING * velocity;
      velocity += (springForce + dampingForce) * dt;
      position += velocity * dt;

      const settled = Math.abs(position - target) < 0.5 && Math.abs(velocity) < 20;
      if (settled) {
        positionRef.current = target;
        rafRef.current = null;
        onSettle();
        return;
      }

      positionRef.current = position;
      applyDragPosition(position);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  };

  const handleGrabberPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    stopSpring();
    sheetHeightRef.current = dialog.getBoundingClientRect().height;
    dialog.classList.add(styles.dragging);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startPosition: positionRef.current,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const handleGrabberPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const target = drag.startPosition + (event.clientY - drag.startY);
    const delta = target < 0 ? rubberband(target, RUBBERBAND_DIMENSION) : target;

    const dt = event.timeStamp - drag.lastTime;
    if (dt > 0) {
      drag.velocity = ((event.clientY - drag.lastY) / dt) * 1000;
    }
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;

    positionRef.current = delta;
    applyDragPosition(delta);
  };

  const finishDrag = (commitClose: boolean, velocity: number) => {
    const sheetHeight = sheetHeightRef.current || 1;
    if (commitClose) {
      runSpring(sheetHeight, velocity, () => {
        releaseDialogControl();
        closeMenu();
      });
    } else {
      runSpring(0, velocity, () => {
        releaseDialogControl();
      });
    }
  };

  const handleGrabberPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    const sheetHeight = sheetHeightRef.current || 1;
    const shouldClose = positionRef.current > sheetHeight * CLOSE_DISTANCE_RATIO || drag.velocity > CLOSE_VELOCITY;
    finishDrag(shouldClose, drag.velocity);
  };

  const handleGrabberPointerCancel = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    finishDrag(false, 0);
  };

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      positionRef.current = 0;
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
          <div
            className={styles.grabber}
            aria-hidden="true"
            onPointerDown={handleGrabberPointerDown}
            onPointerMove={handleGrabberPointerMove}
            onPointerUp={handleGrabberPointerUp}
            onPointerCancel={handleGrabberPointerCancel}
          />
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
                  const isFreshlyUnlocked = (tab.id as string) === 'analytics';
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`${styles.option} ${isActive ? styles.optionActive : ''} ${isFreshlyUnlocked ? styles.optionUnlock : ''}`}
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
