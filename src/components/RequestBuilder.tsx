import { useCallback, useMemo, useState } from 'react';
import {
  ALBUM_ITEM_TYPE_OPTIONS,
  DICE_EMOJI_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
  PARSE_MODE_OPTIONS,
  POLL_TYPE_OPTIONS,
  REQUEST_METHODS,
} from '../constants/requestBuilder';
import type {
  AlbumItem,
  MediaGroupItemType,
  MediaSourceMode,
  RequestFormState,
  RequestMethodId,
} from '../types/requestBuilder';
import {
  buildRequestPreview,
  createDefaultAlbumItem,
  createDefaultRequestForm,
  getFileAcceptByAlbumType,
  getFileAcceptByMethod,
  validateRequestForm,
} from '../utils/requestBuilder';
import styles from '../styles/RequestBuilder.module.css';

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getSourcePlaceholder(mode: MediaSourceMode, fieldName: string): string {
  if (mode === 'file_id') {
    return `Введите ${fieldName} как file_id`;
  }
  if (mode === 'url') {
    return `Введите ${fieldName} как https://...`;
  }
  return '';
}

function getAlbumSourcePlaceholder(mode: MediaSourceMode, type: MediaGroupItemType): string {
  if (mode === 'file_id') {
    return `Введите ${type} как file_id`;
  }
  if (mode === 'url') {
    return `Введите ${type} как https://...`;
  }
  return '';
}

export function RequestBuilder() {
  const [form, setForm] = useState<RequestFormState>(() => createDefaultRequestForm());
  const [copiedTarget, setCopiedTarget] = useState<'body' | 'powershell' | null>(null);

  const methodConfig = useMemo(
    () => REQUEST_METHODS.find(item => item.id === form.method) ?? REQUEST_METHODS[0],
    [form.method]
  );
  const validationErrors = useMemo(() => validateRequestForm(form), [form]);
  const preview = useMemo(() => buildRequestPreview(form), [form]);

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
      mediaFile: null,
    }));
  }, []);

  const handleMediaFileChange = useCallback((file: File | null) => {
    setForm(prev => ({
      ...prev,
      mediaFile: file,
    }));
  }, []);

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

  const handleCopy = useCallback((target: 'body' | 'powershell', value: string) => {
    if (validationErrors.length > 0) return;

    try {
      navigator.clipboard.writeText(value).then(() => {
        setCopiedTarget(target);
        setTimeout(() => setCopiedTarget(null), 1800);
      });
    } catch {
      // clipboard not available
    }
  }, [validationErrors.length]);

  const handleReset = useCallback(() => {
    setForm(createDefaultRequestForm());
    setCopiedTarget(null);
  }, []);

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

        {form.mediaSource !== 'upload' ? (
          <div className={styles.fieldFull}>
            <label className={styles.label}>{fieldName}</label>
            <input
              type="text"
              value={form.mediaValue}
              placeholder={getSourcePlaceholder(form.mediaSource, fieldName)}
              onChange={e => updateField('mediaValue', e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.fieldFull}>
            <label className={styles.label}>Локальный файл</label>
            <input
              className={styles.fileInput}
              type="file"
              accept={getFileAcceptByMethod(methodConfig)}
              onChange={e => handleMediaFileChange(e.target.files?.[0] ?? null)}
            />
            {form.mediaFile && (
              <div className={styles.fileMeta}>
                {form.mediaFile.name} · {formatFileSize(form.mediaFile.size)}
              </div>
            )}
          </div>
        )}

        {methodConfig.supportsCaption && (
          <div className={styles.fieldFull}>
            <label className={styles.label}>caption</label>
            <textarea
              className={styles.textarea}
              value={form.caption}
              rows={4}
              placeholder="Подпись к медиа"
              onChange={e => updateField('caption', e.target.value)}
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
        <textarea
          className={styles.textarea}
          value={form.caption}
          rows={4}
          placeholder="caption для первого элемента media group"
          onChange={e => updateField('caption', e.target.value)}
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
                        file: null,
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
                        file: null,
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

                {item.sourceMode !== 'upload' ? (
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
                ) : (
                  <div className={styles.fieldFull}>
                    <label className={styles.label}>Локальный файл</label>
                    <input
                      className={styles.fileInput}
                      type="file"
                      accept={getFileAcceptByAlbumType(item.type)}
                      onChange={e =>
                        updateAlbumItem(item.id, current => ({
                          ...current,
                          file: e.target.files?.[0] ?? null,
                        }))
                      }
                    />
                    {item.file && (
                      <div className={styles.fileMeta}>
                        {item.file.name} · {formatFileSize(item.file.size)}
                      </div>
                    )}
                  </div>
                )}
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
              <textarea
                className={styles.textarea}
                value={form.text}
                rows={6}
                placeholder="Текст сообщения"
                onChange={e => updateField('text', e.target.value)}
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
            </div>
            <div className={styles.fieldFull}>
              <label className={styles.label}>options</label>
              <textarea
                className={styles.textarea}
                value={form.pollOptions}
                rows={5}
                placeholder={'Один вариант на строку\nДа\nНет'}
                onChange={e => updateField('pollOptions', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>type</label>
              <select
                value={form.pollType}
                onChange={e => updateField('pollType', e.target.value as RequestFormState['pollType'])}
              >
                {POLL_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {form.pollType === 'quiz' && (
              <div className={styles.field}>
                <label className={styles.label}>correct_option_id</label>
                <input
                  type="text"
                  value={form.pollCorrectOptionId}
                  placeholder="0"
                  onChange={e => updateField('pollCorrectOptionId', e.target.value)}
                />
              </div>
            )}
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
                    onChange={e => updateField('pollAllowsMultipleAnswers', e.target.checked)}
                  />
                  <span>allows_multiple_answers</span>
                </label>
              </div>
            </div>
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
              placeholder="@channelusername или 123456789"
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
            <label className={styles.label}>message_effect_id</label>
            <input
              type="text"
              value={form.messageEffectId}
              placeholder="Опционально, для private chats"
              onChange={e => updateField('messageEffectId', e.target.value)}
            />
          </div>

          <div className={styles.fieldFull}>
            <div className={styles.checkboxRow}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.disableNotification}
                  onChange={e => updateField('disableNotification', e.target.checked)}
                />
                <span>disable_notification</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.protectContent}
                  onChange={e => updateField('protectContent', e.target.checked)}
                />
                <span>protect_content</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.allowPaidBroadcast}
                  onChange={e => updateField('allowPaidBroadcast', e.target.checked)}
                />
                <span>allow_paid_broadcast</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Параметры метода</div>
        {methodConfig.note && <div className={styles.sectionText}>{methodConfig.note}</div>}
        <div className={styles.grid}>{renderMethodFields()}</div>
      </div>

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
            <div className={styles.sectionText}>Endpoint, тело запроса и готовый PowerShell.</div>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>{preview.transportLabel}</span>
            {preview.usesMultipart && <span className={styles.badge}>attach://</span>}
          </div>
        </div>

        <div className={styles.endpoint}>{preview.endpoint}</div>

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>Тело запроса</div>
            <button
              className={`${styles.primaryBtn} ${copiedTarget === 'body' ? styles.copiedBtn : ''}`}
              onClick={() => handleCopy('body', preview.bodyPreview)}
              disabled={validationErrors.length > 0}
            >
              {copiedTarget === 'body' ? 'Скопировано' : 'Скопировать body'}
            </button>
          </div>
          <pre className={styles.pre}>{preview.bodyPreview}</pre>
        </div>

        <div className={styles.outputBlock}>
          <div className={styles.outputHeader}>
            <div className={styles.outputTitle}>PowerShell</div>
            <button
              className={`${styles.primaryBtn} ${copiedTarget === 'powershell' ? styles.copiedBtn : ''}`}
              onClick={() => handleCopy('powershell', preview.powershellPreview)}
              disabled={validationErrors.length > 0}
            >
              {copiedTarget === 'powershell' ? 'Скопировано' : 'Скопировать PowerShell'}
            </button>
          </div>
          <pre className={styles.pre}>{preview.powershellPreview}</pre>
        </div>
      </div>
    </div>
  );
}
