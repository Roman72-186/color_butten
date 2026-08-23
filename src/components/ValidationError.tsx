import styles from './ValidationError.module.css';

interface ValidationErrorProps {
  message?: string;
}

export function ValidationError({ message }: ValidationErrorProps) {
  if (!message) return null;

  return <span className={styles.error}>{message}</span>;
}
