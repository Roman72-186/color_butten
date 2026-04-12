import { useCallback, useMemo, useState } from 'react';
import {
  ALBUM_ITEM_TYPE_OPTIONS,
  CATEGORY_LABELS,
  DICE_EMOJI_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
  MESSAGE_EFFECT_OPTIONS,
  PARSE_MODE_OPTIONS,
  POLL_TYPE_OPTIONS,
  REQUEST_METHODS,
} from '../../constants/requestBuilder';
import { LOCATION_PRESETS } from '../../constants/requestPresets';
import { ERROR_400_EXAMPLE, ERROR_403_EXAMPLE, getSuccessResponseExample } from '../../constants/requestResponses';
import type { ButtonConfig } from '../../types';
import type {
  AlbumItem,
  BotCommandItem,
  ChatPermissions,
  MediaGroupItemType,
  MediaSourceMode,
  PollOptionItem,
  RequestFormState,
  RequestMethodId,
} from '../../types/requestBuilder';
import { createDefaultButton } from '../../utils/helpers';
import {
  buildRequestPreview,
  createDefaultAlbumItem,
  createDefaultBotCommand,
  createDefaultPollOption,
  createDefaultRequestForm,
  validateRequestForm,
} from '../../utils/requestBuilder';
import { FormattedTextField } from '../FormattedTextField';
import { ChatIdSelector } from './ChatIdSelector';
import { InlineKeyboardSection } from './InlineKeyboardSection';
import styles from '../../styles/RequestBuilder.module.css';

function getSourcePlaceholder(mode: MediaSourceMode, fieldName: string): string {
  if (mode === 'file_id') return `Введите ${fieldName} как file_id`;
  return `Введите ${fieldName} как https://...`;
}

function getAlbumSourcePlaceholder(mode: MediaSourceMode, type: MediaGroupItemType): string {
  if (mode === 'file_id') return `Введите ${type} как file_id`;
  return `Введите ${type} как https://...`;
}

const SEND_OPTION_DESCRIPTIONS = [
  {
    key: 'disableNotification' as const,
    apiName: 'disable_notification',
    description: 'Отправить без звука. У пользователя появится уведомление, но без звукового сигнала.',
  },
  {
    key: 'protectContent' as const,
    apiName: 'protect_content',
    description: 'Защитить контент от пересылки и сохранения внутри Telegram.',
  },
  {
    key: 'allowPaidBroadcast' as const,
    apiName: 'allow_paid_broadcast',
    description: 'Разрешить массовую отправку до 1000 сообщений в секунду за Stars.',
  },
] as const;

const PERMISSION_KEYS: Array<keyof ChatPermissions> = [
  'can_send_messages',
  'can_send_audios',
  'can_send_documents',
  'can_send_photos',
  'can_send_videos',
  'can_send_video_notes',
  'can_send_voice_notes',
  'can_send_polls',
  'can_send_other_messages',
  'can_add_web_page_previews',
  'can_change_info',
  'can_invite_users',
  'can_pin_messages',
  'can_manage_topics',
];

const SEND_CATEGORIES = new Set(['text', 'media', 'album', 'location', 'venue', 'contact', 'poll', 'dice']);

export function TelegramRequestBuilder() {
  const [form, setForm] = useState<RequestFormState>(() => createDefaultRequestForm());
  const [copiedBody, setCopiedBody] = useState(false);
  const [showResponseExamples, setShowResponseExamples] = useState(false);

  const methodConfig = useMemo(
    () => REQUEST_METHODS.find(item => item.id === form.method) ?? REQUEST_METHODS[0],
    [form.method]
  );
  const isSend = useMemo(() => SEND_CATEGORIES.has(methodConfig.category), [methodConfig.category]);
  const validationErrors = useMemo(() => validateRequestForm(form), [form]);
  const preview = useMemo(() => buildRequestPreview(form), [form]);

  const selectedMessageEffectPreset = useMemo(() => {
    const trimmed = form.messageEffectId.trim();
    if (!trimmed) return '';
    return MESSAGE_EFFECT_OPTIONS.some(option => option.value === trimmed) ? trimmed : 'custom';
  }, [form.messageEffectId]);

  const groupedMethods = useMemo(() => {
    const groups = new Map<string, typeof REQUEST_METHODS>();
    for (const method of REQUEST_METHODS) {
      if (!groups.has(method.category)) groups.set(method.category, []);
      groups.get(method.category)!.push(method);
    }
    return groups;
  }, []);

  const updateField = useCallback(<K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMethodChange = useCallback((method: RequestMethodId) => {
    setForm(prev => ({ ...prev, method }));
  }, []);

  const handleMediaSourceChange = useCallback((sourceMode: MediaSourceMode) => {
    setForm(prev => ({ ...prev, mediaSource: sourceMode, mediaValue: '' }));
  }, []);

  const handleMessageEffectPresetChange = useCallback((value: string) => {
    if (!value) { updateField('messageEffectId', ''); return; }
    if (value === 'custom') {
      const isPresetSelected = MESSAGE_EFFECT_OPTIONS.some(
        option => option.value === form.messageEffectId.trim()
      );
      if (isPresetSelected) updateField('messageEffectId', '');
      return;
    }
    updateField('messageEffectId', value);
  }, [form.messageEffectId, updateField]);

  const updateAlbumItem = useCallback((id: string, updater: (item: AlbumItem) => AlbumItem) => {
    setForm(prev => ({ ...prev, albumItems: prev.albumItems.map(item => item.id === id ? updater(item) : item) }));
  }, []);

  const addAlbumItem = useCallback(() => {
    setForm(prev => {
      if (prev.albumItems.length >= 10) return prev;
      return { ...prev, albumItems: [...prev.albumItems, createDefaultAlbumItem()] };
    });
  }, []);

  const removeAlbumItem = useCallback((id: string) => {
    setForm(prev => {
      if (prev.albumItems.length <= 2) return prev;
      return { ...prev, albumItems: prev.albumItems.filter(item => item.id !== id) };
    });
  }, []);

  const updatePollOption = useCallback((id: string, updater: (item: PollOptionItem) => PollOptionItem) => {
    setForm(prev => ({ ...prev, pollOptions: prev.pollOptions.map(item => item.id === id ? updater(item) : item) }));
  }, []);

  const addPollOption = useCallback(() => {
    setForm(prev => {
      if (prev.pollOptions.length >= 12) return prev;
      return { ...prev, pollOptions: [...prev.pollOptions, createDefaultPollOption()] };
    });
  }, []);

  const removePollOption = useCallback((id: string) => {
    setForm(prev => {
      if (prev.pollOptions.length <= 2) return prev;
      return {
        ...prev,
        pollOptions: prev.pollOptions.filter(item => item.id !== id),
        pollCorrectOptionId: prev.pollCorrectOptionId === id ? '' : prev.pollCorrectOptionId,
      };
    });
  }, []);

  const handlePollTypeChange = useCallback((pollType: RequestFormState['pollType']) => {
    setForm(prev => ({
      ...prev,
      pollType,
      pollAllowsMultipleAnswers: pollType === 'quiz' ? false : prev.pollAllowsMultipleAnswers,
      pollExplanation: pollType === 'quiz' ? prev.pollExplanation : '',
      pollExplanationParseMode: pollType === 'quiz' ? prev.pollExplanationParseMode : 'HTML',
      pollCorrectOptionId: pollType === 'quiz' ? prev.pollCorrectOptionId : '',
    }));
  }, []);

  const updateBotCommand = useCallback((id: string, updater: (cmd: BotCommandItem) => BotCommandItem) => {
    setForm(prev => ({ ...prev, botCommands: prev.botCommands.map(cmd => cmd.id === id ? updater(cmd) : cmd) }));
  }, []);

  const addBotCommand = useCallback(() => {
    setForm(prev => ({ ...prev, botCommands: [...prev.botCommands, createDefaultBotCommand()] }));
  }, []);

  const removeBotCommand = useCallback((id: string) => {
    setForm(prev => ({ ...prev, botCommands: prev.botCommands.filter(cmd => cmd.id !== id) }));
  }, []);

  const handleCopy = useCallback((value: string) => {
    if (validationErrors.length > 0) return;
    try {
      navigator.clipboard.writeText(value).then(() => {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 1800);
      });
    } catch {
      // clipboard not available
    }
  }, [validationErrors.length]);

  const handleReset = useCallback(() => {
    setForm(createDefaultRequestForm());
    setCopiedBody(false);
  }, []);

  const toggleInlineCell = useCallback((row: number, col: number) => {
    setForm(prev => {
      const exists = prev.inlineButtons.find(b => b.row === row && b.col === col);
      if (exists) return { ...prev, inlineButtons: prev.inlineButtons.filter(b => !(b.row === row && b.col === col)) };
      return { ...prev, inlineButtons: [...prev.inlineButtons, createDefaultButton(row, col)] };
    });
  }, []);

  const updateInlineButton = useCallback((id: string, patch: Partial<ButtonConfig>) => {
    setForm(prev => ({
      ...prev,
      inlineButtons: prev.inlineButtons.map(b => b.id === id ? { ...b, ...patch } : b),
    }));
  }, []);

  const updatePermission = useCallback((key: keyof ChatPermissions, value: boolean) => {
    setForm(prev => ({ ...prev, chatPermissions: { ...prev.chatPermissions, [key]: value } }));
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderChatIdField = (hint?: string) => (
    <div className={styles.fieldFull}>
      <label className={styles.label}>chat_id</label>
      <ChatIdSelector
        value={form.chatId}
        onChange={value => updateField('chatId', value)}
      />
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );

  const renderUserIdField = (hint?: string) => (
    <div className={styles.field}>
      <label className={styles.label}>user_id</label>
      <input
        type="text"
        value={form.userId}
        placeholder="Telegram ID пользователя"
        onChange={e => updateField('userId', e.target.value)}
      />
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );

  const renderMediaSourceInput = () => {
    const fieldName = methodConfig.mediaField ?? 'media';
    return (
      <>
        <div className={styles.field}>
          <label className={styles.label}>Источник файла</label>
          <select
            value={form.mediaSource}
            onChange={e => handleMediaSourceChange(e.target.value as MediaSourceMode)}
          >
            {MEDIA_SOURCE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>{fieldName}</label>
          <input
            type="text"
            value={form.mediaValue}
            placeholder={getSourcePlaceholder(form.mediaSource, fieldName)}
            onChange={e => updateField('mediaValue', e.target.value)}
          />
        </div>

        {methodConfig.supportsCaption && (
          <div className={styles.fieldFull}>
            <label className={styles.label}>caption</label>
            <FormattedTextField
              value={form.caption}
              parseMode={form.parseMode}
              rows={4}
              placeholder="Подпись к медиа"
              onChange={value => updateField('caption', value)}
            />
          </div>
        )}

        {methodConfig.supportsParseMode && (
          <div className={styles.field}>
            <label className={styles.label}>parse_mode</label>
            <select
              value={form.parseMode}
              onChange={e => updateField('parseMode', e.target.value as RequestFormState['parseMode'])}
            >
              {PARSE_MODE_OPTIONS.map(option => (
                <option key={option.value || 'none'} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className={styles.fieldHint}>HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;code&gt;код&lt;/code&gt;</div>
          </div>
        )}

        {methodConfig.id === 'sendSticker' && (
          <div className={styles.field}>
            <label className={styles.label}>emoji</label>
            <input
              type="text"
              value={form.stickerEmoji}
              placeholder="Например: 👍"
              onChange={e => updateField('stickerEmoji', e.target.value)}
            />
          </div>
        )}

        {(methodConfig.supportsShowCaptionAboveMedia || methodConfig.supportsSpoiler) && (
          <div className={styles.fieldFull}>
            <div className={styles.checkboxRow}>
              {methodConfig.supportsShowCaptionAboveMedia && (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.showCaptionAboveMedia}
                    onChange={e => updateField('showCaptionAboveMedia', e.target.checked)}
                  />
                  <span>show_caption_above_media</span>
                </label>
              )}
              {methodConfig.supportsSpoiler && (
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.hasSpoiler}
                    onChange={e => updateField('hasSpoiler', e.target.checked)}
                  />
                  <span>has_spoiler</span>
                </label>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderAlbumFields = () => (
    <>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Подпись первого элемента</label>
        <FormattedTextField
          value={form.caption}
          parseMode={form.parseMode}
          rows={4}
          placeholder="caption для первого элемента media group"
          onChange={value => updateField('caption', value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>parse_mode</label>
        <select
          value={form.parseMode}
          onChange={e => updateField('parseMode', e.target.value as RequestFormState['parseMode'])}
        >
          {PARSE_MODE_OPTIONS.map(option => (
            <option key={option.value || 'none'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.fieldFull}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Элементы media</div>
            <div className={styles.sectionText}>От 2 до 10 элементов.</div>
          </div>
          <button
            className={styles.secondaryBtn}
            onClick={addAlbumItem}
            disabled={form.albumItems.length >= 10}
          >
            + Элемент
          </button>
        </div>

        <div className={styles.albumList}>
          {form.albumItems.map((item, index) => (
            <div key={item.id} className={styles.albumCard}>
              <div className={styles.albumHeader}>
                <span className={styles.albumTitle}>Элемент {index + 1}</span>
                <button
                  className={styles.linkBtn}
                  onClick={() => removeAlbumItem(item.id)}
                  disabled={form.albumItems.length <= 2}
                >
                  Удалить
                </button>
              </div>

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label}>type</label>
                  <select
                    value={item.type}
                    onChange={e => updateAlbumItem(item.id, current => ({
                      ...current,
                      type: e.target.value as MediaGroupItemType,
                      value: '',
                    }))}
                  >
                    {ALBUM_ITEM_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Источник</label>
                  <select
                    value={item.sourceMode}
                    onChange={e => updateAlbumItem(item.id, current => ({
                      ...current,
                      sourceMode: e.target.value as MediaSourceMode,
                      value: '',
                    }))}
                  >
                    {MEDIA_SOURCE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldFull}>
                  <label className={styles.label}>media</label>
                  <input
                    type="text"
                    value={item.value}
                    placeholder={getAlbumSourcePlaceholder(item.sourceMode, item.type)}
                    onChange={e => updateAlbumItem(item.id, current => ({ ...current, value: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderGetFields = () => {
    switch (methodConfig.id) {
      case 'getMe':
      case 'getWebhookInfo':
        return (
          <div className={styles.fieldHint}>Метод не требует параметров.</div>
        );
      case 'getChat':
      case 'getChatAdministrators':
      case 'getChatMemberCount':
        return renderChatIdField();
      case 'getChatMember':
        return (
          <>
            {renderChatIdField()}
            {renderUserIdField()}
          </>
        );
      case 'getFile':
        return (
          <div className={styles.fieldFull}>
            <label className={styles.label}>file_id</label>
            <input
              type="text"
              value={form.fileId}
              placeholder="BQACAgIAAxk..."
              onChange={e => updateField('fileId', e.target.value)}
            />
            <div className={styles.fieldHint}>file_id из объекта Document, Photo, Video и т.д.</div>
          </div>
        );
      case 'getUserProfilePhotos':
        return (
          <>
            {renderUserIdField()}
            <div className={styles.field}>
              <label className={styles.label}>offset</label>
              <input
                type="number"
                value={form.userPhotosOffset}
                placeholder="0"
                onChange={e => updateField('userPhotosOffset', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>limit</label>
              <input
                type="number"
                value={form.userPhotosLimit}
                placeholder="100"
                onChange={e => updateField('userPhotosLimit', e.target.value)}
              />
              <div className={styles.fieldHint}>От 1 до 100. По умолчанию 100.</div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderAdminFields = () => {
    const chatIdField = renderChatIdField();
    const userIdField = renderUserIdField('Числовой Telegram ID пользователя.');
    const untilDateField = (
      <div className={styles.field}>
        <label className={styles.label}>until_date</label>
        <input
          type="number"
          value={form.untilDate}
          placeholder="Unix timestamp"
          onChange={e => updateField('untilDate', e.target.value)}
        />
        <div className={styles.fieldHint}>0 или пусто = навсегда.</div>
      </div>
    );

    switch (methodConfig.id) {
      case 'banChatMember':
        return (
          <>
            {chatIdField}
            {userIdField}
            {untilDateField}
            <div className={styles.fieldFull}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.revokeMessages}
                  onChange={e => updateField('revokeMessages', e.target.checked)}
                />
                <span>revoke_messages</span>
              </label>
              <div className={styles.fieldHint}>Удалить все сообщения пользователя в чате.</div>
            </div>
          </>
        );
      case 'unbanChatMember':
        return (
          <>
            {chatIdField}
            {userIdField}
            <div className={styles.fieldFull}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.onlyIfBanned}
                  onChange={e => updateField('onlyIfBanned', e.target.checked)}
                />
                <span>only_if_banned</span>
              </label>
              <div className={styles.fieldHint}>Не кикать, если пользователь ещё в чате.</div>
            </div>
          </>
        );
      case 'restrictChatMember':
        return (
          <>
            {chatIdField}
            {userIdField}
            <div className={styles.fieldFull}>
              <label className={styles.label}>permissions</label>
              <div className={styles.optionGrid}>
                {PERMISSION_KEYS.map(key => (
                  <label key={key} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.chatPermissions[key]}
                      onChange={e => updatePermission(key, e.target.checked)}
                    />
                    <span>{key}</span>
                  </label>
                ))}
              </div>
            </div>
            {untilDateField}
          </>
        );
      case 'pinChatMessage':
        return (
          <>
            {chatIdField}
            <div className={styles.field}>
              <label className={styles.label}>message_id</label>
              <input
                type="number"
                value={form.targetMessageId}
                placeholder="ID сообщения"
                onChange={e => updateField('targetMessageId', e.target.value)}
              />
            </div>
          </>
        );
      case 'unpinChatMessage':
        return (
          <>
            {chatIdField}
            <div className={styles.field}>
              <label className={styles.label}>message_id</label>
              <input
                type="number"
                value={form.targetMessageId}
                placeholder="Опционально"
                onChange={e => updateField('targetMessageId', e.target.value)}
              />
              <div className={styles.fieldHint}>Пусто = открепить последнее закреплённое.</div>
            </div>
          </>
        );
      case 'unpinAllChatMessages':
        return chatIdField;
      case 'setMyCommands':
        return (
          <>
            <div className={styles.fieldFull}>
              <div className={styles.inlineHeader}>
                <div>
                  <label className={styles.label}>commands</label>
                  <div className={styles.fieldHint}>Каждая команда — имя и описание (до 3–32 символов и до 256 символов).</div>
                </div>
                <button className={styles.secondaryBtn} onClick={addBotCommand}>
                  + Команда
                </button>
              </div>
              {form.botCommands.length === 0 && (
                <div className={styles.fieldHint} style={{ marginTop: 10 }}>Нажмите «+ Команда» для добавления.</div>
              )}
              <div className={styles.albumList}>
                {form.botCommands.map((cmd, index) => (
                  <div key={cmd.id} className={styles.albumCard}>
                    <div className={styles.albumHeader}>
                      <span className={styles.albumTitle}>Команда {index + 1}</span>
                      <button className={styles.linkBtn} onClick={() => removeBotCommand(cmd.id)}>
                        Удалить
                      </button>
                    </div>
                    <div className={styles.grid}>
                      <div className={styles.field}>
                        <label className={styles.label}>command</label>
                        <input
                          type="text"
                          value={cmd.command}
                          placeholder="start"
                          onChange={e => updateBotCommand(cmd.id, c => ({ ...c, command: e.target.value }))}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>description</label>
                        <input
                          type="text"
                          value={cmd.description}
                          placeholder="Запустить бота"
                          onChange={e => updateBotCommand(cmd.id, c => ({ ...c, description: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>language_code</label>
              <input
                type="text"
                value={form.languageCode}
                placeholder="ru, en ..."
                onChange={e => updateField('languageCode', e.target.value)}
              />
              <div className={styles.fieldHint}>Пусто = команды по умолчанию для всех языков.</div>
            </div>
          </>
        );
      case 'deleteMyCommands':
        return (
          <div className={styles.field}>
            <label className={styles.label}>language_code</label>
            <input
              type="text"
              value={form.languageCode}
              placeholder="ru, en ..."
              onChange={e => updateField('languageCode', e.target.value)}
            />
            <div className={styles.fieldHint}>Пусто = удалить команды для всех языков.</div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderWebhookFields = () => {
    switch (methodConfig.id) {
      case 'setWebhook':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>url</label>
              <input
                type="text"
                value={form.webhookUrl}
                placeholder="https://example.com/webhook"
                onChange={e => updateField('webhookUrl', e.target.value)}
              />
              <div className={styles.fieldHint}>HTTPS URL для получения обновлений. Порты: 443, 80, 88, 8443.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>max_connections</label>
              <input
                type="number"
                value={form.webhookMaxConnections}
                placeholder="40"
                onChange={e => updateField('webhookMaxConnections', e.target.value)}
              />
              <div className={styles.fieldHint}>От 1 до 100. По умолчанию 40.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>allowed_updates</label>
              <input
                type="text"
                value={form.webhookAllowedUpdates}
                placeholder='["message","callback_query"]'
                onChange={e => updateField('webhookAllowedUpdates', e.target.value)}
              />
              <div className={styles.fieldHint}>JSON-массив типов обновлений. Пусто = все типы.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>secret_token</label>
              <input
                type="text"
                value={form.webhookSecretToken}
                placeholder="Опционально"
                onChange={e => updateField('webhookSecretToken', e.target.value)}
              />
              <div className={styles.fieldHint}>Заголовок X-Telegram-Bot-Api-Secret-Token для верификации запросов.</div>
            </div>
          </>
        );
      case 'deleteWebhook':
        return (
          <div className={styles.fieldFull}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.dropPendingUpdates}
                onChange={e => updateField('dropPendingUpdates', e.target.checked)}
              />
              <span>drop_pending_updates</span>
            </label>
            <div className={styles.fieldHint}>Удалить все обновления, накопленные во время работы webhook.</div>
          </div>
        );
      case 'getWebhookInfo':
        return <div className={styles.fieldHint}>Метод не требует параметров.</div>;
      case 'getUpdates':
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label}>offset</label>
              <input
                type="number"
                value={form.updatesOffset}
                placeholder="Опционально"
                onChange={e => updateField('updatesOffset', e.target.value)}
              />
              <div className={styles.fieldHint}>ID первого обновления. Предыдущие считаются подтверждёнными.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>limit</label>
              <input
                type="number"
                value={form.updatesLimit}
                placeholder="100"
                onChange={e => updateField('updatesLimit', e.target.value)}
              />
              <div className={styles.fieldHint}>От 1 до 100.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>timeout</label>
              <input
                type="number"
                value={form.updatesTimeout}
                placeholder="0"
                onChange={e => updateField('updatesTimeout', e.target.value)}
              />
              <div className={styles.fieldHint}>Секунды long-polling. 0 = short polling.</div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderInlineFields = () => {
    switch (methodConfig.id) {
      case 'answerInlineQuery':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>inline_query_id</label>
              <input
                type="text"
                value={form.inlineQueryId}
                placeholder="Из объекта InlineQuery"
                onChange={e => updateField('inlineQueryId', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <div className={styles.sectionTitle}>results[0] — Article</div>
              <div className={styles.sectionText}>В конструкторе реализован один результат типа article.</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>id</label>
              <input
                type="text"
                value={form.inlineResultId}
                placeholder="1"
                onChange={e => updateField('inlineResultId', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>title</label>
              <input
                type="text"
                value={form.inlineResultTitle}
                placeholder="Заголовок результата"
                onChange={e => updateField('inlineResultTitle', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>message_text</label>
              <textarea
                className={styles.textarea}
                value={form.inlineResultText}
                rows={3}
                placeholder="Текст, который будет отправлен при выборе"
                onChange={e => updateField('inlineResultText', e.target.value)}
              />
            </div>
          </>
        );
      case 'answerWebAppQuery':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>web_app_query_id</label>
              <input
                type="text"
                value={form.webAppQueryId}
                placeholder="Из объекта WebAppQuery"
                onChange={e => updateField('webAppQueryId', e.target.value)}
              />
            </div>
            <div className={styles.fieldFull}>
              <div className={styles.sectionTitle}>result — Article</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>title</label>
              <input
                type="text"
                value={form.webAppResultTitle}
                placeholder="Заголовок"
                onChange={e => updateField('webAppResultTitle', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>message_text</label>
              <input
                type="text"
                value={form.webAppResultUrl}
                placeholder="Текст сообщения"
                onChange={e => updateField('webAppResultUrl', e.target.value)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderMethodFields = () => {
    switch (methodConfig.category) {
      case 'text':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>text</label>
              <FormattedTextField
                value={form.text}
                parseMode={form.parseMode}
                rows={6}
                placeholder="Текст сообщения"
                onChange={value => updateField('text', value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>parse_mode</label>
              <select
                value={form.parseMode}
                onChange={e => updateField('parseMode', e.target.value as RequestFormState['parseMode'])}
              >
                {PARSE_MODE_OPTIONS.map(option => (
                  <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                ))}
              </select>
              <div className={styles.fieldHint}>HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;code&gt;код&lt;/code&gt;</div>
            </div>
          </>
        );
      case 'media':
        return renderMediaSourceInput();
      case 'album':
        return renderAlbumFields();
      case 'location':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Быстрый выбор города</label>
              <div className={styles.chipRow}>
                {LOCATION_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    className={styles.chip}
                    onClick={() => {
                      updateField('locationLatitude', preset.lat);
                      updateField('locationLongitude', preset.lon);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>latitude</label>
              <input
                type="text"
                value={form.locationLatitude}
                placeholder="55.7558"
                onChange={e => updateField('locationLatitude', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>longitude</label>
              <input
                type="text"
                value={form.locationLongitude}
                placeholder="37.6176"
                onChange={e => updateField('locationLongitude', e.target.value)}
              />
            </div>
          </>
        );
      case 'venue':
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label}>latitude</label>
              <input
                type="text"
                value={form.locationLatitude}
                placeholder="56.8389"
                onChange={e => updateField('locationLatitude', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>longitude</label>
              <input
                type="text"
                value={form.locationLongitude}
                placeholder="60.6057"
                onChange={e => updateField('locationLongitude', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>title</label>
              <input
                type="text"
                value={form.venueTitle}
                placeholder="Название места"
                onChange={e => updateField('venueTitle', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>address</label>
              <input
                type="text"
                value={form.venueAddress}
                placeholder="Адрес"
                onChange={e => updateField('venueAddress', e.target.value)}
              />
            </div>
          </>
        );
      case 'contact':
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label}>phone_number</label>
              <input
                type="text"
                value={form.contactPhoneNumber}
                placeholder="+79990000000"
                onChange={e => updateField('contactPhoneNumber', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>first_name</label>
              <input
                type="text"
                value={form.contactFirstName}
                placeholder="Имя"
                onChange={e => updateField('contactFirstName', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>last_name</label>
              <input
                type="text"
                value={form.contactLastName}
                placeholder="Фамилия"
                onChange={e => updateField('contactLastName', e.target.value)}
              />
            </div>
          </>
        );
      case 'poll':
        return (
          <>
            <div className={styles.fieldFull}>
              <label className={styles.label}>question</label>
              <textarea
                className={styles.textarea}
                value={form.pollQuestion}
                rows={3}
                placeholder="Вопрос опроса"
                onChange={e => updateField('pollQuestion', e.target.value)}
              />
              <div className={styles.fieldHint}>Один вопрос на один poll, до 300 символов.</div>
            </div>

            <div className={styles.fieldFull}>
              <div className={styles.inlineHeader}>
                <div>
                  <label className={styles.label}>options</label>
                  <div className={styles.fieldHint}>От 2 до 12 вариантов ответа. У каждого ответа лимит 100 символов.</div>
                </div>
                <button
                  className={styles.secondaryBtn}
                  onClick={addPollOption}
                  disabled={form.pollOptions.length >= 12}
                >
                  + Ответ
                </button>
              </div>

              <div className={styles.albumList}>
                {form.pollOptions.map((option, index) => (
                  <div key={option.id} className={styles.albumCard}>
                    <div className={styles.albumHeader}>
                      <span className={styles.albumTitle}>Вариант {index + 1}</span>
                      <button
                        className={styles.linkBtn}
                        onClick={() => removePollOption(option.id)}
                        disabled={form.pollOptions.length <= 2}
                      >
                        Удалить
                      </button>
                    </div>

                    <div className={styles.grid}>
                      <div className={styles.fieldFull}>
                        <label className={styles.label}>text</label>
                        <input
                          type="text"
                          value={option.text}
                          placeholder={`Ответ ${index + 1}`}
                          onChange={e => updatePollOption(option.id, current => ({ ...current, text: e.target.value }))}
                        />
                      </div>

                      {form.pollType === 'quiz' && (
                        <div className={styles.fieldFull}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="radio"
                              name="poll-correct-option"
                              checked={form.pollCorrectOptionId === option.id}
                              onChange={() => updateField('pollCorrectOptionId', option.id)}
                            />
                            <span>Правильный ответ</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>type</label>
              <select
                value={form.pollType}
                onChange={e => handlePollTypeChange(e.target.value as RequestFormState['pollType'])}
              >
                {POLL_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>open_period</label>
              <input
                type="number"
                value={form.pollOpenPeriod}
                placeholder="Например: 60"
                onChange={e => updateField('pollOpenPeriod', e.target.value)}
              />
              <div className={styles.fieldHint}>От 5 до 600 секунд. Нельзя вместе с close_date.</div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>close_date</label>
              <input
                type="number"
                value={form.pollCloseDate}
                placeholder="Unix timestamp"
                onChange={e => updateField('pollCloseDate', e.target.value)}
              />
              <div className={styles.fieldHint}>Unix timestamp на ближайшие 5–600 секунд.</div>
            </div>

            <div className={styles.fieldFull}>
              <div className={styles.checkboxRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.pollIsAnonymous}
                    onChange={e => updateField('pollIsAnonymous', e.target.checked)}
                  />
                  <span>is_anonymous</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.pollAllowsMultipleAnswers}
                    disabled={form.pollType === 'quiz'}
                    onChange={e => updateField('pollAllowsMultipleAnswers', e.target.checked)}
                  />
                  <span>allows_multiple_answers</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.pollIsClosed}
                    onChange={e => updateField('pollIsClosed', e.target.checked)}
                  />
                  <span>is_closed</span>
                </label>
              </div>
            </div>

            {form.pollType === 'quiz' && (
              <>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>explanation</label>
                  <FormattedTextField
                    value={form.pollExplanation}
                    parseMode={form.pollExplanationParseMode}
                    rows={4}
                    placeholder="Пояснение при неправильном ответе"
                    onChange={value => updateField('pollExplanation', value)}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>explanation_parse_mode</label>
                  <select
                    value={form.pollExplanationParseMode}
                    onChange={e => updateField(
                      'pollExplanationParseMode',
                      e.target.value as RequestFormState['pollExplanationParseMode']
                    )}
                  >
                    {PARSE_MODE_OPTIONS.map(option => (
                      <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        );
      case 'dice':
        return (
          <div className={styles.fieldFull}>
            <label className={styles.label}>emoji</label>
            <div className={styles.chipRow}>
              {DICE_EMOJI_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.chip} ${form.diceEmoji === option.value ? styles.chipActive : ''}`}
                  style={{ fontSize: 20, padding: '4px 12px' }}
                  onClick={() => updateField('diceEmoji', option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 'get':
        return renderGetFields();
      case 'admin':
        return renderAdminFields();
      case 'webhook':
        return renderWebhookFields();
      case 'inline':
        return renderInlineFields();
      default:
        return null;
    }
  };

  return (
    <>
      <div className={styles.notice}>
        <div className={styles.noticeTitle}>Конструктор запросов Telegram Bot API</div>
        <div className={styles.noticeText}>
          Сверен с документацией Bot API 9.5. Доступны 36 методов: отправка медиа, работа с чатами,
          администрирование, webhook, inline-режим.
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Метод</div>
            <div className={styles.sectionText}>{methodConfig.description}</div>
          </div>
          <button className={styles.secondaryBtn} onClick={handleReset}>
            Сбросить
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.fieldFull}>
            <label className={styles.label}>method</label>
            <select
              value={form.method}
              onChange={e => handleMethodChange(e.target.value as RequestMethodId)}
            >
              {Array.from(groupedMethods.entries()).map(([category, methods]) => (
                <optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
                  {methods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.title} · {method.description}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {methodConfig.hint && (
              <div className={styles.fieldHint}>{methodConfig.hint}</div>
            )}
          </div>

          {isSend && (
            <>
              <div className={styles.fieldFull}>
                <label className={styles.label}>chat_id</label>
                <ChatIdSelector
                  value={form.chatId}
                  onChange={value => updateField('chatId', value)}
                />
                <div className={styles.fieldHint}>ID чата, группы, супергруппы или @username канала.</div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>business_connection_id</label>
                <input
                  type="text"
                  value={form.businessConnectionId}
                  placeholder="Опционально"
                  onChange={e => updateField('businessConnectionId', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>message_thread_id</label>
                <input
                  type="text"
                  value={form.messageThreadId}
                  placeholder="Топик / thread id"
                  onChange={e => updateField('messageThreadId', e.target.value)}
                />
                <div className={styles.fieldHint}>ID топика в форуме или супергруппе.</div>
              </div>

              {methodConfig.supportsDirectMessagesTopic && (
                <div className={styles.field}>
                  <label className={styles.label}>direct_messages_topic_id</label>
                  <input
                    type="text"
                    value={form.directMessagesTopicId}
                    placeholder="Для direct messages chats"
                    onChange={e => updateField('directMessagesTopicId', e.target.value)}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Эффект сообщения</label>
                <select
                  value={selectedMessageEffectPreset}
                  onChange={e => handleMessageEffectPresetChange(e.target.value)}
                >
                  <option value="">Без эффекта</option>
                  {MESSAGE_EFFECT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  <option value="custom">Свой ID</option>
                </select>
                <div className={styles.fieldHint}>
                  Выберите эффект по эмодзи, и его ID подставится в поле ниже.
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>message_effect_id</label>
                <input
                  type="text"
                  value={form.messageEffectId}
                  placeholder="Выберите эффект выше или вставьте свой ID"
                  onChange={e => updateField('messageEffectId', e.target.value)}
                />
                <div className={styles.fieldHint}>
                  Подходит для private chats. Если нужного эффекта нет в списке, вставьте ID вручную.
                </div>
              </div>

              <div className={styles.fieldFull}>
                <div className={styles.optionGrid}>
                  {SEND_OPTION_DESCRIPTIONS.map(option => (
                    <label key={option.apiName} className={styles.optionCard}>
                      <span className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={form[option.key]}
                          onChange={e => updateField(option.key, e.target.checked)}
                        />
                        <span>{option.apiName}</span>
                      </span>
                      <span className={styles.optionHint}>{option.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Параметры метода</div>
        {methodConfig.note && <div className={styles.sectionText}>{methodConfig.note}</div>}
        <div className={styles.grid}>{renderMethodFields()}</div>
      </div>

      {methodConfig.supportsInlineKeyboard && (
        <InlineKeyboardSection
          buttons={form.inlineButtons}
          onToggleCell={toggleInlineCell}
          onUpdateButton={updateInlineButton}
          onClearAll={() => setForm(prev => ({ ...prev, inlineButtons: [] }))}
        />
      )}

      {validationErrors.length > 0 && (
        <div className={styles.errorBox}>
          <div className={styles.boxTitle}>Нужно исправить перед копированием</div>
          <ul className={styles.list}>
            {validationErrors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.warnings.length > 0 && (
        <div className={styles.warningBox}>
          <div className={styles.boxTitle}>Подсказки по Bot API</div>
          <ul className={styles.list}>
            {preview.warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Результат</div>
            <div className={styles.sectionText}>Endpoint и тело запроса.</div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>{preview.transportLabel}</span>
          </div>
        </div>

        <div className={styles.endpoint}>{preview.endpoint}</div>

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>Тело запроса</div>
            <button
              className={`${styles.primaryBtn} ${copiedBody ? styles.copiedBtn : ''}`}
              onClick={() => handleCopy(preview.bodyPreview)}
              disabled={validationErrors.length > 0}
            >
              {copiedBody ? 'Скопировано' : 'Скопировать body'}
            </button>
          </div>
          <pre className={styles.pre}>{preview.bodyPreview}</pre>
        </div>
      </div>

      <div className={styles.card}>
        <div
          className={styles.collapsibleHeader}
          onClick={() => setShowResponseExamples(prev => !prev)}
        >
          <div className={styles.sectionTitle}>Примеры ответов API</div>
          <span className={styles.collapseArrow}>{showResponseExamples ? '▲' : '▼'}</span>
        </div>

        {showResponseExamples && (
          <>
            <div className={styles.outputBlock}>
              <div className={styles.outputTitle}>Успешный ответ</div>
              <pre className={styles.pre}>{getSuccessResponseExample(form.method)}</pre>
            </div>
            <div className={styles.outputBlock}>
              <div className={styles.outputTitle}>Ошибка 400 Bad Request</div>
              <pre className={styles.pre}>{ERROR_400_EXAMPLE}</pre>
            </div>
            <div className={styles.outputBlock}>
              <div className={styles.outputTitle}>Ошибка 403 Forbidden</div>
              <pre className={styles.pre}>{ERROR_403_EXAMPLE}</pre>
            </div>
          </>
        )}
      </div>
    </>
  );
}
