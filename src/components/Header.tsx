import { useState, useEffect } from 'react';
import styles from '../styles/Header.module.css';

export function Header() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      if (y > 60 && y > lastY) {
        setCompact(true);
      } else if (y < lastY) {
        setCompact(false);
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}>
      <h1 className={styles.title}>Inline Keyboard Constructor</h1>
      <p className={styles.subtitle}>Telegram Bot API · reply_markup builder</p>
    </header>
  );
}
