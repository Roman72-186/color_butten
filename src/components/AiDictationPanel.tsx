import { useAiDictation, type DictationStatus } from '../hooks/useAiDictation';
import type { GenerateMode } from '../utils/aiClient';
import styles from '../styles/AiDictationPanel.module.css';

interface AiDictationPanelProps {
  mode: GenerateMode;
  hint: string;
  onResult: (result: unknown) => void;
  existingText?: string;
  modeLabel?: string;
}

const STATUS_LABEL: Record<DictationStatus, string> = {
  idle: '',
  recording: 'Идёт запись...',
  transcribing: 'Распознаём речь...',
  ready: '',
  generating: 'Генерируем результат...',
  error: '',
};

export function AiDictationPanel({ mode, hint, onResult, existingText, modeLabel }: AiDictationPanelProps) {
  const { status, transcript, setTranscript, errorMessage, startRecording, stopRecording, generate, reset } =
    useAiDictation(mode, existingText);

  const hasExistingText = Boolean(existingText?.trim());
  const busy = status === 'transcribing' || status === 'generating';
  const showTranscript = status === 'ready' || status === 'generating' || (status === 'error' && Boolean(transcript));

  const handleGenerate = async () => {
    const result = await generate();
    if (result !== null && result !== undefined) {
      onResult(result);
      reset();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <span className={styles.title}>✨ ИИ-диктовка</span>
        <div className={styles.badges}>
          {modeLabel && <span className={styles.modeBadge}>{modeLabel}</span>}
          {STATUS_LABEL[status] && <span className={styles.status}>{STATUS_LABEL[status]}</span>}
        </div>
      </div>

      <p className={styles.hint}>{hint}</p>

      {status !== 'recording' && (
        <button className={styles.micBtn} onClick={() => void startRecording()} disabled={busy}>
          🎤 Надиктовать
        </button>
      )}

      {status === 'recording' && (
        <button className={`${styles.micBtn} ${styles.micBtnActive}`} onClick={stopRecording}>
          ⏹ Остановить запись
        </button>
      )}

      {showTranscript && (
        <>
          <textarea
            className={styles.textarea}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Распознанный текст появится здесь — можно поправить перед генерацией"
            rows={3}
            disabled={busy}
          />
          <div className={styles.actions}>
            <button
              className={styles.generateBtn}
              onClick={() => void handleGenerate()}
              disabled={busy || !transcript.trim()}
            >
              {status === 'generating'
                ? 'Генерируем...'
                : hasExistingText
                  ? '✨ Применить к тексту'
                  : '✨ Сгенерировать'}
            </button>
            <button className={styles.cancelBtn} onClick={reset} disabled={busy}>
              Отмена
            </button>
          </div>
        </>
      )}

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
    </div>
  );
}
