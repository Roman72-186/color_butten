type TelegramWebApp = {
  initData?: string;
  platform?: string;
};

type WindowWithMiniAppBridge = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};

export type LaunchContext = {
  isMiniApp: boolean;
  platform: 'telegram' | 'web';
};

function hasTelegramLaunchParams(): boolean {
  const rawParams = `${window.location.search}&${window.location.hash.replace(/^#/, '')}`;
  const params = new URLSearchParams(rawParams);

  return (
    params.has('tgWebAppData') ||
    params.has('tgWebAppVersion') ||
    params.has('tgWebAppPlatform')
  );
}

export function getLaunchContext(): LaunchContext {
  const telegramWebApp = (window as WindowWithMiniAppBridge).Telegram?.WebApp;
  const hasTelegramBridge = Boolean(telegramWebApp?.initData || telegramWebApp?.platform);
  const isMiniApp = hasTelegramBridge || hasTelegramLaunchParams();

  return {
    isMiniApp,
    platform: isMiniApp ? 'telegram' : 'web',
  };
}
