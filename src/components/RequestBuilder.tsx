import { useEffect, useState } from 'react';
import { TelegramRequestBuilder } from './request-builder/TelegramRequestBuilder';
import { MaxRequestBuilder } from './MaxRequestBuilder';
import { trackPageview } from '../utils/analytics';
import styles from '../styles/RequestBuilder.module.css';

interface RequestBuilderProps {
  /** Вкладка «Запросы» сейчас видима — компонент не размонтируется при переключении вкладок, поэтому pageview трекается по факту видимости, а не по монтированию. */
  isActive: boolean;
}

export function RequestBuilder({ isActive }: RequestBuilderProps) {
  const [platform, setPlatform] = useState<'telegram' | 'max'>('telegram');

  useEffect(() => {
    if (isActive) trackPageview(`requests:${platform}`);
  }, [isActive, platform]);

  return (
    <div className={styles.builder}>
      <select
        className={styles.platformSelect}
        value={platform}
        onChange={e => setPlatform(e.target.value as 'telegram' | 'max')}
      >
        <option value="telegram">Telegram Bot API</option>
        <option value="max">MAX API</option>
      </select>

      {platform === 'max' && <MaxRequestBuilder />}
      {platform === 'telegram' && <TelegramRequestBuilder />}
    </div>
  );
}
