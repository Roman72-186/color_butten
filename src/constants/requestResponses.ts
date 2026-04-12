import type { RequestMethodId } from '../types/requestBuilder';

const MESSAGE_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    message_id: 123,
    from: { id: 1234567890, is_bot: true, first_name: 'MyBot', username: 'mybot' },
    chat: { id: 87654321, first_name: 'User', type: 'private' },
    date: 1700000000,
    text: 'Hello, World!',
  },
}, null, 2);

const TRUE_RESPONSE = JSON.stringify({ ok: true, result: true }, null, 2);

const ME_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    id: 1234567890,
    is_bot: true,
    first_name: 'MyBot',
    username: 'mybot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  },
}, null, 2);

const CHAT_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    id: -1001234567890,
    title: 'My Channel',
    type: 'supergroup',
    username: 'mychannel',
    description: 'Channel description',
    member_count: 1500,
  },
}, null, 2);

const CHAT_MEMBER_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    status: 'member',
    user: { id: 87654321, is_bot: false, first_name: 'User', username: 'username' },
  },
}, null, 2);

const CHAT_ADMIN_RESPONSE = JSON.stringify({
  ok: true,
  result: [
    { status: 'creator', user: { id: 87654321, is_bot: false, first_name: 'Owner' } },
    { status: 'administrator', user: { id: 11111111, is_bot: false, first_name: 'Admin' } },
  ],
}, null, 2);

const CHAT_COUNT_RESPONSE = JSON.stringify({ ok: true, result: 1500 }, null, 2);

const FILE_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    file_id: 'BQACAgIAAxkBAAIBW2...',
    file_unique_id: 'AgADAgADkaoxG',
    file_size: 10240,
    file_path: 'documents/file_123.pdf',
  },
}, null, 2);

const USER_PHOTOS_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    total_count: 3,
    photos: [
      [{ file_id: 'AgACAgI...', file_unique_id: 'AQADsr...', width: 160, height: 160, file_size: 8012 }],
    ],
  },
}, null, 2);

const WEBHOOK_INFO_RESPONSE = JSON.stringify({
  ok: true,
  result: {
    url: 'https://example.com/webhook',
    has_custom_certificate: false,
    pending_update_count: 0,
    last_error_date: null,
    last_error_message: null,
    max_connections: 40,
    allowed_updates: ['message', 'callback_query'],
  },
}, null, 2);

const UPDATES_RESPONSE = JSON.stringify({
  ok: true,
  result: [
    {
      update_id: 100000001,
      message: {
        message_id: 1,
        from: { id: 87654321, is_bot: false, first_name: 'User' },
        chat: { id: 87654321, first_name: 'User', type: 'private' },
        date: 1700000000,
        text: '/start',
      },
    },
  ],
}, null, 2);

const INLINE_QUERY_RESPONSE = JSON.stringify({ ok: true, result: true }, null, 2);

export const ERROR_400_EXAMPLE = JSON.stringify({
  ok: false,
  error_code: 400,
  description: 'Bad Request: message text is empty',
}, null, 2);

export const ERROR_403_EXAMPLE = JSON.stringify({
  ok: false,
  error_code: 403,
  description: 'Forbidden: bot was blocked by the user',
}, null, 2);

const RESPONSE_MAP: Partial<Record<RequestMethodId, string>> = {
  sendMessage: MESSAGE_RESPONSE,
  sendPhoto: MESSAGE_RESPONSE,
  sendVideo: MESSAGE_RESPONSE,
  sendAnimation: MESSAGE_RESPONSE,
  sendAudio: MESSAGE_RESPONSE,
  sendDocument: MESSAGE_RESPONSE,
  sendSticker: MESSAGE_RESPONSE,
  sendVoice: MESSAGE_RESPONSE,
  sendVideoNote: MESSAGE_RESPONSE,
  sendMediaGroup: JSON.stringify({
    ok: true,
    result: [
      { message_id: 123, chat: { id: 87654321, type: 'private' }, date: 1700000000 },
      { message_id: 124, chat: { id: 87654321, type: 'private' }, date: 1700000000 },
    ],
  }, null, 2),
  sendLocation: MESSAGE_RESPONSE,
  sendVenue: MESSAGE_RESPONSE,
  sendContact: MESSAGE_RESPONSE,
  sendPoll: MESSAGE_RESPONSE,
  sendDice: MESSAGE_RESPONSE,
  getMe: ME_RESPONSE,
  getChat: CHAT_RESPONSE,
  getChatMember: CHAT_MEMBER_RESPONSE,
  getChatAdministrators: CHAT_ADMIN_RESPONSE,
  getChatMemberCount: CHAT_COUNT_RESPONSE,
  getFile: FILE_RESPONSE,
  getUserProfilePhotos: USER_PHOTOS_RESPONSE,
  banChatMember: TRUE_RESPONSE,
  unbanChatMember: TRUE_RESPONSE,
  restrictChatMember: TRUE_RESPONSE,
  pinChatMessage: TRUE_RESPONSE,
  unpinChatMessage: TRUE_RESPONSE,
  unpinAllChatMessages: TRUE_RESPONSE,
  setMyCommands: TRUE_RESPONSE,
  deleteMyCommands: TRUE_RESPONSE,
  setWebhook: TRUE_RESPONSE,
  deleteWebhook: TRUE_RESPONSE,
  getWebhookInfo: WEBHOOK_INFO_RESPONSE,
  getUpdates: UPDATES_RESPONSE,
  answerInlineQuery: INLINE_QUERY_RESPONSE,
  answerWebAppQuery: INLINE_QUERY_RESPONSE,
};

export function getSuccessResponseExample(methodId: RequestMethodId): string {
  return RESPONSE_MAP[methodId] ?? TRUE_RESPONSE;
}
