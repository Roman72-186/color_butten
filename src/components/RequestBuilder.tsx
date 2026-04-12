import { useState } from 'react';
import { TelegramRequestBuilder } from './request-builder/TelegramRequestBuilder';
import { MaxRequestBuilder } from './MaxRequestBuilder';
import styles from '../styles/RequestBuilder.module.css';

export function RequestBuilder() {
  const [platform, setPlatform] = useState<'telegram' | 'max'>('telegram');

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
