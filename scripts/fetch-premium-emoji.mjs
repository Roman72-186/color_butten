#!/usr/bin/env node
/**
 * Fetches Telegram premium emoji IDs from Bot API and generates src/constants/premiumEmojiData.ts
 *
 * Usage:
 *   node scripts/fetch-premium-emoji.mjs <BOT_TOKEN>
 *
 * What it fetches:
 *   - getForumTopicIconStickers  — ~107 иконок для форум-топиков (не требует Premium)
 *   - getStickerSet TgPremiumIcon — 116 premium UI-иконок (⭐ ⚡ ❤ и т.д.)
 *   - getStickerSet для известных emoji-паков
 *
 * Output: src/constants/premiumEmojiData.ts
 */

const token = process.argv[2];
if (!token) {
  console.error('Usage: node scripts/fetch-premium-emoji.mjs <BOT_TOKEN>');
  process.exit(1);
}

const BASE = `https://api.telegram.org/bot${token}`;

// ─── Known sticker set names to fetch ────────────────────────────────────────
const PACK_NAMES = [
  'TgPremiumIcon',
  'AnimatedEmojies',
  'duck',
  'frog',
  'ghost',
  'moon',
  'cherry',
  'rabbit',
  'panda',
  'koala',
  'shark',
  'bubble',
];

// ─── Unicode emoji → label mapping ───────────────────────────────────────────
// Используется для присвоения читаемого имени и тегов поиска
const EMOJI_LABELS = {
  '😀': { ru: 'Улыбка', tags: ['smile', 'happy', 'улыбка'] },
  '😂': { ru: 'Смех', tags: ['laugh', 'lol', 'смех', 'хаха'] },
  '😍': { ru: 'Влюблённость', tags: ['love', 'heart eyes', 'влюблённость'] },
  '😭': { ru: 'Плач', tags: ['cry', 'sad', 'плач', 'слёзы'] },
  '😊': { ru: 'Довольный', tags: ['happy', 'blush', 'довольный'] },
  '🥰': { ru: 'Любовь', tags: ['love', 'hearts', 'любовь'] },
  '😎': { ru: 'Крутой', tags: ['cool', 'sunglasses', 'крутой'] },
  '🤔': { ru: 'Думает', tags: ['think', 'hmm', 'думает'] },
  '😏': { ru: 'Ухмылка', tags: ['smirk', 'ухмылка'] },
  '😤': { ru: 'Злость', tags: ['angry', 'frustrated', 'злость'] },
  '🤩': { ru: 'Восторг', tags: ['star struck', 'excited', 'восторг'] },
  '😈': { ru: 'Чертёнок', tags: ['devil', 'evil', 'чертёнок'] },
  '🥳': { ru: 'Праздник', tags: ['party', 'celebrate', 'праздник'] },
  '😴': { ru: 'Сон', tags: ['sleep', 'tired', 'сон'] },
  '🤯': { ru: 'Взрыв мозга', tags: ['mind blown', 'shocked', 'шок'] },
  '👍': { ru: 'Лайк', tags: ['like', 'thumbs up', 'лайк', 'одобрение'] },
  '👎': { ru: 'Дизлайк', tags: ['dislike', 'thumbs down', 'дизлайк'] },
  '👏': { ru: 'Аплодисменты', tags: ['clap', 'applause', 'аплодисменты'] },
  '🙌': { ru: 'Ура', tags: ['celebrate', 'hooray', 'ура'] },
  '🤝': { ru: 'Рукопожатие', tags: ['handshake', 'deal', 'рукопожатие'] },
  '✌️': { ru: 'Победа', tags: ['peace', 'victory', 'победа'] },
  '🤞': { ru: 'Удача', tags: ['fingers crossed', 'luck', 'удача'] },
  '👀': { ru: 'Глаза', tags: ['eyes', 'look', 'watching', 'глаза'] },
  '💪': { ru: 'Сила', tags: ['muscle', 'strong', 'сила', 'мышца'] },
  '🙏': { ru: 'Просьба', tags: ['pray', 'please', 'thank you', 'просьба', 'спасибо'] },
  '💋': { ru: 'Поцелуй', tags: ['kiss', 'lips', 'поцелуй'] },
  '❤️': { ru: 'Красное сердце', tags: ['heart', 'love', 'red', 'сердце', 'любовь'] },
  '🧡': { ru: 'Оранжевое сердце', tags: ['orange heart', 'оранжевое сердце'] },
  '💛': { ru: 'Жёлтое сердце', tags: ['yellow heart', 'жёлтое сердце'] },
  '💚': { ru: 'Зелёное сердце', tags: ['green heart', 'зелёное сердце'] },
  '💙': { ru: 'Синее сердце', tags: ['blue heart', 'синее сердце'] },
  '💜': { ru: 'Фиолетовое сердце', tags: ['purple heart', 'фиолетовое сердце'] },
  '🖤': { ru: 'Чёрное сердце', tags: ['black heart', 'чёрное сердце'] },
  '🤍': { ru: 'Белое сердце', tags: ['white heart', 'белое сердце'] },
  '💔': { ru: 'Разбитое сердце', tags: ['broken heart', 'разбитое сердце'] },
  '💕': { ru: 'Два сердца', tags: ['two hearts', 'два сердца'] },
  '💞': { ru: 'Вращающиеся сердца', tags: ['revolving hearts', 'сердца'] },
  '💯': { ru: '100 процентов', tags: ['100', 'perfect', 'идеально'] },
  '🔥': { ru: 'Огонь', tags: ['fire', 'flame', 'hot', 'огонь', 'пламя'] },
  '⚡': { ru: 'Молния', tags: ['lightning', 'electric', 'молния', 'электричество'] },
  '✨': { ru: 'Искры', tags: ['sparkles', 'glitter', 'искры', 'блёстки'] },
  '💫': { ru: 'Вспышка', tags: ['dizzy', 'flash', 'вспышка'] },
  '🌟': { ru: 'Светящаяся звезда', tags: ['glowing star', 'светящаяся звезда'] },
  '⭐': { ru: 'Звезда', tags: ['star', 'звезда'] },
  '🌠': { ru: 'Падающая звезда', tags: ['shooting star', 'падающая звезда'] },
  '🌈': { ru: 'Радуга', tags: ['rainbow', 'радуга'] },
  '☀️': { ru: 'Солнце', tags: ['sun', 'sunny', 'солнце'] },
  '🌙': { ru: 'Луна', tags: ['moon', 'night', 'луна', 'ночь'] },
  '❄️': { ru: 'Снежинка', tags: ['snowflake', 'cold', 'снежинка', 'холод'] },
  '🌊': { ru: 'Волна', tags: ['wave', 'ocean', 'волна', 'океан'] },
  '💎': { ru: 'Алмаз', tags: ['diamond', 'gem', 'алмаз', 'бриллиант'] },
  '👑': { ru: 'Корона', tags: ['crown', 'king', 'queen', 'корона', 'король'] },
  '🏆': { ru: 'Трофей', tags: ['trophy', 'winner', 'трофей', 'победитель'] },
  '🥇': { ru: 'Золотая медаль', tags: ['gold medal', 'first place', 'золото'] },
  '🎯': { ru: 'Цель', tags: ['target', 'bullseye', 'цель'] },
  '🚀': { ru: 'Ракета', tags: ['rocket', 'launch', 'ракета', 'запуск'] },
  '🎁': { ru: 'Подарок', tags: ['gift', 'present', 'подарок'] },
  '🎉': { ru: 'Конфетти', tags: ['party', 'celebrate', 'праздник', 'конфетти'] },
  '🎊': { ru: 'Хлопушка', tags: ['confetti ball', 'party', 'хлопушка'] },
  '🎈': { ru: 'Шарик', tags: ['balloon', 'party', 'шарик'] },
  '🎵': { ru: 'Нота', tags: ['music', 'note', 'музыка', 'нота'] },
  '🎶': { ru: 'Музыка', tags: ['music', 'notes', 'музыка'] },
  '💡': { ru: 'Идея', tags: ['idea', 'light bulb', 'идея', 'лампочка'] },
  '📌': { ru: 'Кнопка', tags: ['pin', 'pushpin', 'кнопка'] },
  '📍': { ru: 'Метка', tags: ['location', 'pin', 'метка', 'локация'] },
  '🔑': { ru: 'Ключ', tags: ['key', 'ключ'] },
  '🔒': { ru: 'Замок закрыт', tags: ['lock', 'secure', 'замок'] },
  '🔓': { ru: 'Замок открыт', tags: ['unlock', 'open', 'открытый замок'] },
  '⚙️': { ru: 'Шестерёнка', tags: ['gear', 'settings', 'шестерёнка', 'настройки'] },
  '🛡️': { ru: 'Щит', tags: ['shield', 'protect', 'щит', 'защита'] },
  '⚔️': { ru: 'Мечи', tags: ['swords', 'fight', 'мечи'] },
  '🏠': { ru: 'Дом', tags: ['house', 'home', 'дом'] },
  '🌍': { ru: 'Земля', tags: ['earth', 'globe', 'world', 'земля', 'мир'] },
  '💰': { ru: 'Деньги', tags: ['money', 'cash', 'деньги'] },
  '💳': { ru: 'Карта', tags: ['card', 'credit', 'карта'] },
  '📊': { ru: 'График', tags: ['chart', 'stats', 'график', 'статистика'] },
  '📈': { ru: 'Рост', tags: ['chart up', 'growth', 'рост'] },
  '📉': { ru: 'Падение', tags: ['chart down', 'decline', 'падение'] },
  '🛒': { ru: 'Корзина', tags: ['shopping cart', 'shop', 'корзина'] },
  '📱': { ru: 'Телефон', tags: ['phone', 'mobile', 'телефон'] },
  '💻': { ru: 'Ноутбук', tags: ['laptop', 'computer', 'ноутбук', 'компьютер'] },
  '📷': { ru: 'Камера', tags: ['camera', 'photo', 'камера', 'фото'] },
  '🎥': { ru: 'Видео', tags: ['video', 'camera', 'видео'] },
  '📞': { ru: 'Звонок', tags: ['phone', 'call', 'звонок'] },
  '✉️': { ru: 'Письмо', tags: ['email', 'mail', 'письмо'] },
  '📧': { ru: 'Email', tags: ['email', 'mail', 'электронная почта'] },
  '🔔': { ru: 'Уведомление', tags: ['bell', 'notification', 'уведомление', 'звонок'] },
  '🔕': { ru: 'Без звука', tags: ['mute', 'no bell', 'без звука'] },
  '✅': { ru: 'Галочка', tags: ['check', 'done', 'ok', 'галочка', 'готово'] },
  '❌': { ru: 'Крест', tags: ['cross', 'no', 'error', 'крест', 'нет'] },
  '⚠️': { ru: 'Предупреждение', tags: ['warning', 'alert', 'предупреждение'] },
  '🚫': { ru: 'Запрет', tags: ['no', 'ban', 'prohibited', 'запрет', 'бан'] },
  '❓': { ru: 'Вопрос', tags: ['question', 'вопрос'] },
  '❗': { ru: 'Восклицание', tags: ['exclamation', 'important', 'восклицание', 'важно'] },
  '💬': { ru: 'Чат', tags: ['chat', 'message', 'чат', 'сообщение'] },
  '💭': { ru: 'Мысль', tags: ['thought', 'thinking', 'мысль'] },
  '📣': { ru: 'Мегафон', tags: ['megaphone', 'announce', 'мегафон', 'анонс'] },
  '📢': { ru: 'Громкоговоритель', tags: ['loudspeaker', 'announce', 'громкоговоритель'] },
  '🏅': { ru: 'Медаль', tags: ['medal', 'award', 'медаль'] },
  '🎖️': { ru: 'Военная медаль', tags: ['military medal', 'award', 'медаль'] },
  '🎗️': { ru: 'Лента', tags: ['ribbon', 'лента'] },
  '🌺': { ru: 'Цветок', tags: ['flower', 'hibiscus', 'цветок'] },
  '🌸': { ru: 'Сакура', tags: ['cherry blossom', 'sakura', 'сакура'] },
  '🌹': { ru: 'Роза', tags: ['rose', 'роза'] },
  '🍀': { ru: 'Клевер', tags: ['clover', 'lucky', 'клевер', 'удача'] },
  '🌿': { ru: 'Листья', tags: ['leaves', 'plant', 'листья'] },
  '🦋': { ru: 'Бабочка', tags: ['butterfly', 'бабочка'] },
  '🐝': { ru: 'Пчела', tags: ['bee', 'пчела'] },
  '🦄': { ru: 'Единорог', tags: ['unicorn', 'единорог'] },
  '🐉': { ru: 'Дракон', tags: ['dragon', 'дракон'] },
  '🐱': { ru: 'Кошка', tags: ['cat', 'кошка'] },
  '🐶': { ru: 'Собака', tags: ['dog', 'собака'] },
  '🦊': { ru: 'Лиса', tags: ['fox', 'лиса'] },
  '🐸': { ru: 'Лягушка', tags: ['frog', 'лягушка'] },
  '🐼': { ru: 'Панда', tags: ['panda', 'панда'] },
  '🐨': { ru: 'Коала', tags: ['koala', 'коала'] },
  '🦈': { ru: 'Акула', tags: ['shark', 'акула'] },
  '🎮': { ru: 'Игры', tags: ['game', 'gaming', 'игры', 'геймплей'] },
  '🏀': { ru: 'Баскетбол', tags: ['basketball', 'баскетбол'] },
  '⚽': { ru: 'Футбол', tags: ['football', 'soccer', 'футбол'] },
  '🎲': { ru: 'Кубик', tags: ['dice', 'game', 'кубик'] },
  '🍕': { ru: 'Пицца', tags: ['pizza', 'пицца'] },
  '☕': { ru: 'Кофе', tags: ['coffee', 'кофе'] },
  '🍺': { ru: 'Пиво', tags: ['beer', 'пиво'] },
  '🎂': { ru: 'Торт', tags: ['cake', 'birthday', 'торт', 'день рождения'] },
  '🍭': { ru: 'Леденец', tags: ['candy', 'sweet', 'леденец', 'конфета'] },
  '🚗': { ru: 'Машина', tags: ['car', 'машина'] },
  '✈️': { ru: 'Самолёт', tags: ['plane', 'fly', 'самолёт'] },
  '⛵': { ru: 'Лодка', tags: ['sailboat', 'boat', 'лодка'] },
};

async function apiCall(method, params = {}) {
  const url = new URL(`${BASE}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) throw new Error(`${method} failed: ${data.description}`);
  return data.result;
}

function labelForEmoji(emoji) {
  const info = EMOJI_LABELS[emoji];
  if (info) return { label: info.ru, tags: info.tags };
  return { label: emoji, tags: [] };
}

const emojis = [];
const seen = new Set();

function addEmoji(sticker, setName) {
  const id = sticker.custom_emoji_id;
  const fallback = sticker.emoji || '?';
  if (!id || seen.has(id)) return;
  seen.add(id);
  const { label, tags } = labelForEmoji(fallback);
  emojis.push({ id, fallback, label, tags, set: setName });
}

// 1. Forum topic icon stickers
console.log('Fetching getForumTopicIconStickers...');
try {
  const stickers = await apiCall('getForumTopicIconStickers');
  stickers.forEach(s => addEmoji(s, 'forum_icons'));
  console.log(`  ✓ forum icons: ${stickers.length} stickers`);
} catch (e) {
  console.error(`  ✗ forum icons: ${e.message}`);
}

// 2. Known packs
for (const name of PACK_NAMES) {
  process.stdout.write(`Fetching pack "${name}"...`);
  try {
    const set = await apiCall('getStickerSet', { name });
    const before = emojis.length;
    set.stickers.forEach(s => addEmoji(s, name));
    console.log(` ✓ ${set.stickers.length} stickers (+${emojis.length - before} new)`);
  } catch (e) {
    console.log(` ✗ ${e.message}`);
  }
}

console.log(`\nTotal unique emoji: ${emojis.length}`);

// ─── Generate TypeScript output ───────────────────────────────────────────────
const fs = await import('fs');

const tsContent = `// Auto-generated by scripts/fetch-premium-emoji.mjs
// Last updated: ${new Date().toISOString()}
// Total: ${emojis.length} emoji

export interface PremiumEmojiEntry {
  id: string;
  fallback: string;
  label: string;
  tags: string[];
  set: string;
}

export const PREMIUM_EMOJI_DATA: PremiumEmojiEntry[] = ${JSON.stringify(emojis, null, 2)};
`;

fs.writeFileSync('src/constants/premiumEmojiData.ts', tsContent, 'utf8');
console.log('✓ Written to src/constants/premiumEmojiData.ts');
console.log('\nNext step: npm run dev — emoji picker will use the new data automatically.');
