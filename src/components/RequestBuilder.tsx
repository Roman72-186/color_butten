import { useCallback, useMemo, useState } from 'react';
import {
  ALBUM_ITEM_TYPE_OPTIONS,
  DEFAULT_CHAT_ID,
  DICE_EMOJI_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
  MESSAGE_EFFECT_OPTIONS,
  PARSE_MODE_OPTIONS,
  POLL_TYPE_OPTIONS,
  REQUEST_METHODS,
} from '../constants/requestBuilder';
import type { ButtonConfig, ActionType, ButtonStyle } from '../types';
import { STYLES, ACTION_TYPES, MAX_GRID_ROWS, MAX_GRID_COLS } from '../constants';
import { createDefaultButton, groupButtonsByRow } from '../utils/helpers';
import type {
  AlbumItem,
  MediaGroupItemType,
  MediaSourceMode,
  PollOptionItem,
  RequestFormState,
  RequestMethodId,
} from '../types/requestBuilder';
import {
  buildRequestPreview,
  createDefaultAlbumItem,
  createDefaultPollOption,
  createDefaultRequestForm,
  validateRequestForm,
} from '../utils/requestBuilder';
import { FormattedTextField } from './FormattedTextField';
import { MaxRequestBuilder } from './MaxRequestBuilder';
import { ActionValueInput } from './ActionValueInput';
import { Preview } from './Preview';
import styles from '../styles/RequestBuilder.module.css';
import gridStyles from '../styles/GridConstructor.module.css';

function getSourcePlaceholder(mode: MediaSourceMode, fieldName: string): string {
  if (mode === 'file_id') {
    return `Введите ${fieldName} как file_id`;
  }
  return `Введите ${fieldName} как https://...`;
}

function getAlbumSourcePlaceholder(mode: MediaSourceMode, type: MediaGroupItemType): string {
  if (mode === 'file_id') {
    return `Введите ${type} как file_id`;
  }
  return `Введите ${type} как https://...`;
}

const SEND_OPTION_DESCRIPTIONS = [
  {
    key: 'disableNotification',
    apiName: 'disable_notification',
    description: 'Отправить без звука. У пользователя появится уведомление, но без звукового сигнала.',
  },
  {
    key: 'protectContent',
    apiName: 'protect_content',
    description: 'Защитить контент от пересылки и сохранения внутри Telegram.',
  },
  {
    key: 'allowPaidBroadcast',
    apiName: 'allow_paid_broadcast',
    description: 'Разрешить массовую отправку до 1000 сообщений в секунду за Stars.',
  },
] as const;

export function RequestBuilder() {
  const [platform, setPlatform] = useState<'telegram' | 'max'>('telegram');
  const [form, setForm] = useState<RequestFormState>(() => createDefaultRequestForm());
  const [copiedBody, setCopiedBody] = useState(false);

  const methodConfig = useMemo(
    () => REQUEST_METHODS.find(item => item.id === form.method) ?? REQUEST_METHODS[0],
    [form.method]
  );
  const validationErrors = useMemo(() => validateRequestForm(form), [form]);
  const preview = useMemo(() => buildRequestPreview(form), [form]);
  const selectedMessageEffectPreset = useMemo(() => {
    const trimmed = form.messageEffectId.trim();

    if (!trimmed) {
      return '';
    }

    return MESSAGE_EFFECT_OPTIONS.some(option => option.value === trimmed) ? trimmed : 'custom';
  }, [form.messageEffectId]);

  const updateField = useCallback(<K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMethodChange = useCallback((method: RequestMethodId) => {
    setForm(prev => ({ ...prev, method }));
  }, []);

  const handleMediaSourceChange = useCallback((sourceMode: MediaSourceMode) => {
    setForm(prev => ({
      ...prev,
      mediaSource: sourceMode,
      mediaValue: '',
    }));
  }, []);

  const handleMessageEffectPresetChange = useCallback((value: string) => {
    if (!value) {
      updateField('messageEffectId', '');
      return;
    }

    if (value === 'custom') {
      const isPresetSelected = MESSAGE_EFFECT_OPTIONS.some(
        option => option.value === form.messageEffectId.trim()
      );

      if (isPresetSelected) {
        updateField('messageEffectId', '');
      }
      return;
    }

    updateField('messageEffectId', value);
  }, [form.messageEffectId, updateField]);

  const updateAlbumItem = useCallback(
    (id: string, updater: (item: AlbumItem) => AlbumItem) => {
      setForm(prev => ({
        ...prev,
        albumItems: prev.albumItems.map(item => (item.id === id ? updater(item) : item)),
      }));
    },
    []
  );

  const addAlbumItem = useCallback(() => {
    setForm(prev => {
      if (prev.albumItems.length >= 10) {
        return prev;
      }
      return {
        ...prev,
        albumItems: [...prev.albumItems, createDefaultAlbumItem()],
      };
    });
  }, []);

  const removeAlbumItem = useCallback((id: string) => {
    setForm(prev => {
      if (prev.albumItems.length <= 2) {
        return prev;
      }
      return {
        ...prev,
        albumItems: prev.albumItems.filter(item => item.id !== id),
      };
    });
  }, []);

  const updatePollOption = useCallback((id: string, updater: (item: PollOptionItem) => PollOptionItem) => {
    setForm(prev => ({
      ...prev,
      pollOptions: prev.pollOptions.map(item => (item.id === id ? updater(item) : item)),
    }));
  }, []);

  const addPollOption = useCallback(() => {
    setForm(prev => {
      if (prev.pollOptions.length >= 12) {
        return prev;
      }

      return {
        ...prev,
        pollOptions: [...prev.pollOptions, createDefaultPollOption()],
      };
    });
  }, []);

  const removePollOption = useCallback((id: string) => {
    setForm(prev => {
      if (prev.pollOptions.length <= 2) {
        return prev;
      }

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

  const inlinePreviewRows = useMemo(() => groupButtonsByRow(form.inlineButtons), [form.inlineButtons]);

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
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
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
                <option key={option.value || 'none'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            <option key={option.value || 'none'} value={option.value}>
              {option.label}
            </option>
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
                    onChange={e =>
                      updateAlbumItem(item.id, current => ({
                        ...current,
                        type: e.target.value as MediaGroupItemType,
                        value: '',
                      }))
                    }
                  >
                    {ALBUM_ITEM_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Источник</label>
                  <select
                    value={item.sourceMode}
                    onChange={e =>
                      updateAlbumItem(item.id, current => ({
                        ...current,
                        sourceMode: e.target.value as MediaSourceMode,
                        value: '',
                      }))
                    }
                  >
                    {MEDIA_SOURCE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.fieldFull}>
                  <label className={styles.label}>media</label>
                  <input
                    type="text"
                    value={item.value}
                    placeholder={getAlbumSourcePlaceholder(item.sourceMode, item.type)}
                    onChange={e =>
                      updateAlbumItem(item.id, current => ({
                        ...current,
                        value: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

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
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                          onChange={e =>
                            updatePollOption(option.id, current => ({
                              ...current,
                              text: e.target.value,
                            }))
                          }
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
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
              <div className={styles.fieldHint}>Unix timestamp на ближайшие 5-600 секунд.</div>
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
                    onChange={e =>
                      updateField(
                        'pollExplanationParseMode',
                        e.target.value as RequestFormState['pollExplanationParseMode']
                      )
                    }
                  >
                    {PARSE_MODE_OPTIONS.map(option => (
                      <option key={option.value || 'none'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </>
        );
      case 'dice':
        return (
          <div className={styles.field}>
            <label className={styles.label}>emoji</label>
            <select
              value={form.diceEmoji}
              onChange={e => updateField('diceEmoji', e.target.value)}
            >
              {DICE_EMOJI_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

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

      {platform === 'telegram' && <>
      <div className={styles.notice}>
        <div className={styles.noticeTitle}>Конструктор запросов Telegram Bot API</div>
        <div className={styles.noticeText}>
          Сверен с актуальной документацией Bot API 9.5. В интерфейсе учтены свежие параметры
          <code className={styles.inlineCode}>message_thread_id</code> для топиков и
          <code className={styles.inlineCode}>direct_messages_topic_id</code> для direct messages topics.
          Новый <code className={styles.inlineCode}>sendMessageDraft</code> появился в Bot API 9.5,
          но этот экран сейчас фокусируется на основных send-методах для сообщений и медиа.
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.inlineHeader}>
          <div>
            <div className={styles.sectionTitle}>Метод отправки</div>
            <div className={styles.sectionText}>{methodConfig.description}</div>
          </div>
          <button className={styles.secondaryBtn} onClick={handleReset}>
            Сбросить
          </button>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label}>method</label>
            <select
              value={form.method}
              onChange={e => handleMethodChange(e.target.value as RequestMethodId)}
            >
              {REQUEST_METHODS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.title} · {option.description}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>chat_id</label>
            <input
              type="text"
              value={form.chatId}
              placeholder={DEFAULT_CHAT_ID}
              onChange={e => updateField('chatId', e.target.value)}
            />
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
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
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
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Параметры метода</div>
        {methodConfig.note && <div className={styles.sectionText}>{methodConfig.note}</div>}
        <div className={styles.grid}>{renderMethodFields()}</div>
      </div>

      {form.method !== 'sendMediaGroup' && (
        <div className={styles.card}>
          <div className={styles.inlineHeader}>
            <div>
              <div className={styles.sectionTitle}>Inline-клавиатура (reply_markup)</div>
              <div className={styles.sectionText}>Нажмите на ячейку чтобы добавить кнопку</div>
            </div>
            {form.inlineButtons.length > 0 && (
              <button
                className={styles.secondaryBtn}
                onClick={() => setForm(prev => ({ ...prev, inlineButtons: [] }))}
              >
                Очистить
              </button>
            )}
          </div>

          {/* 7×7 grid */}
          <div
            className={gridStyles.grid}
            style={{ gridTemplateColumns: `repeat(${MAX_GRID_COLS}, 1fr)` }}
          >
            {Array.from({ length: MAX_GRID_ROWS }, (_, r) =>
              Array.from({ length: MAX_GRID_COLS }, (_, c) => {
                const row = r + 1, col = c + 1;
                const btn = form.inlineButtons.find(b => b.row === row && b.col === col);
                return (
                  <button
                    key={`${row}:${col}`}
                    type="button"
                    className={`${gridStyles.cell} ${btn ? gridStyles.cellActive : gridStyles.cellInactive}`}
                    onClick={() => toggleInlineCell(row, col)}
                    title={btn
                      ? `Р${row}К${col}${btn.text ? ': ' + btn.text : ''} — нажмите для деактивации`
                      : `Р${row}К${col} — нажмите для активации`}
                  >
                    {btn ? (btn.text || '...') : ''}
                  </button>
                );
              })
            )}
          </div>

          {/* Config cards */}
          {[...form.inlineButtons]
            .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
            .map(button => (
              <div key={button.id} className={styles.albumCard}>
                <div className={styles.albumHeader}>
                  <span className={styles.albumTitle}>Р{button.row}К{button.col}</span>
                  <button className={styles.linkBtn} onClick={() => toggleInlineCell(button.row, button.col)}>
                    Удалить
                  </button>
                </div>

                <div className={styles.grid}>
                  <div className={styles.fieldFull}>
                    <label className={styles.label}>text</label>
                    <input
                      type="text"
                      value={button.text}
                      placeholder="Текст кнопки"
                      onChange={e => updateInlineButton(button.id, { text: e.target.value })}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>style</label>
                    <select
                      value={button.style}
                      onChange={e => updateInlineButton(button.id, { style: e.target.value as ButtonStyle })}
                    >
                      {STYLES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Тип действия</label>
                    <select
                      value={button.actionType}
                      onChange={e => updateInlineButton(button.id, {
                        actionType: e.target.value as ActionType,
                        actionValue: '',
                      })}
                    >
                      {ACTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.fieldFull}>
                    <ActionValueInput
                      actionType={button.actionType}
                      value={button.actionValue}
                      onChange={value => updateInlineButton(button.id, { actionValue: value })}
                    />
                  </div>
                </div>
              </div>
            ))}

          {form.inlineButtons.length > 0 && (
            <Preview rows={inlinePreviewRows} />
          )}
        </div>
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
      </>}
    </div>
  );
}
