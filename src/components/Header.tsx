import styles from '../styles/Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Inline Keyboard Constructor</h1>
      <p className={styles.subtitle}>Telegram Bot API · reply_markup builder</p>
    </header>
  );
}
