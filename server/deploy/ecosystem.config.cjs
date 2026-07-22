// PM2-конфиг для server-main (72.56.77.253). Секрет OPENROUTER_API_KEY НЕ здесь —
// он в /opt/knopki-ai/server/.env (не в git), подхватывается через dotenv/config.
module.exports = {
  apps: [
    {
      name: 'knopki-ai-api',
      script: 'index.js',
      cwd: '/opt/knopki-ai/server',
      env: {
        NODE_ENV: 'production',
        PORT: '8788',
        HOST: '127.0.0.1',
      },
    },
  ],
};
