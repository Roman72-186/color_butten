import { useCallback, useRef, useState } from 'react';
import { transcribeAudio, generateFromText, type GenerateMode } from '../utils/aiClient';

export type DictationStatus = 'idle' | 'recording' | 'transcribing' | 'ready' | 'generating' | 'error';

// Верхний предел одной записи — держит base64-тело запроса в пределах лимита
// Vercel и не даёт пользователю случайно наговорить многоминутный монолог.
const MAX_RECORDING_MS = 90_000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return '';
}

export function useAiDictation(mode: GenerateMode, existingText?: string) {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | undefined>(undefined);

  const startRecording = useCallback(async () => {
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        window.clearTimeout(stopTimerRef.current);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setStatus('idle');
          return;
        }

        setStatus('transcribing');
        void (async () => {
          try {
            const format = (recorder.mimeType || 'audio/webm').split('/')[1]?.split(';')[0] || 'webm';
            const base64 = await blobToBase64(blob);
            const recognized = await transcribeAudio(base64, format);
            setTranscript(recognized);
            setStatus('ready');
          } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Не удалось распознать речь');
            setStatus('error');
          }
        })();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');

      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_RECORDING_MS);
    } catch {
      setErrorMessage('Нет доступа к микрофону — разрешите доступ в браузере');
      setStatus('error');
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
  }, []);

  const generate = useCallback(async (): Promise<unknown> => {
    if (!transcript.trim()) return null;
    setStatus('generating');
    setErrorMessage('');
    try {
      const trimmedExisting = existingText?.trim() || undefined;
      const result = await generateFromText(transcript.trim(), mode, trimmedExisting);
      setStatus('idle');
      return result;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Не удалось сгенерировать результат');
      setStatus('error');
      return null;
    }
  }, [transcript, mode, existingText]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTranscript('');
    setErrorMessage('');
  }, []);

  return {
    status,
    transcript,
    setTranscript,
    errorMessage,
    startRecording,
    stopRecording,
    generate,
    reset,
  };
}
