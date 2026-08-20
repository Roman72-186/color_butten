import { useEffect } from 'react';
import { TelegramRequestBuilder } from './request-builder/TelegramRequestBuilder';
import { MaxRequestBuilder } from './MaxRequestBuilder';
import { trackPageview } from '../utils/analytics';
import styles from '../styles/RequestBuilder.module.css';

interface RequestBuilderProps {
  /** Раздел API сейчас видим — компонент не размонтируется при переключении разделов, поэтому pageview трекается по факту видимости, а не по монтированию. */
  isActive: boolean;
  platform: 'telegram' | 'max';
}

export function RequestBuilder({ isActive, platform }: RequestBuilderProps) {
  useEffect(() => {
    if (isActive) trackPageview(`requests:${platform}`);
  }, [isActive, platform]);

  return (
    <div className={styles.builder}>
      {platform === 'max' && <MaxRequestBuilder />}
      {platform === 'telegram' && <TelegramRequestBuilder />}
    </div>
  );
}
