interface ValidationErrorProps {
  message?: string;
}

export function ValidationError({ message }: ValidationErrorProps) {
  if (!message) return null;

  return (
    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '2px', display: 'block' }}>
      {message}
    </span>
  );
}
