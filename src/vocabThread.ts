import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EmbedBuilder, ChannelType } from 'discord.js';
import type { TextChannel, ThreadChannel, User } from 'discord.js';
import { romanize } from './romanize/index.js';
import { t } from './i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', 'data');
const THREADS_PATH = path.join(DATA_DIR, 'vocabThreads.json');

interface ThreadsData {
  [key: string]: string;
}

export interface VocabEntryOptions {
  word: string;
  lemma?: string;
  pos?: string;
  langCode: string;
  translation: string;
  targetLang: string;
  messageUrl?: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadThreads(): ThreadsData {
  ensureDataDir();
  if (!fs.existsSync(THREADS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(THREADS_PATH, 'utf8')) as ThreadsData;
  } catch (err) {
    console.warn('[vocabThread] vocabThreads.json 損毀，重新建立：', (err as Error).message);
    return {};
  }
}

function saveThreads(data: ThreadsData): void {
  ensureDataDir();
  fs.writeFileSync(THREADS_PATH, JSON.stringify(data, null, 2));
}

function threadKey(channelId: string, userId: string): string {
  return `${channelId}:${userId}`;
}

// 防止同一 key 同時建立多個 Thread 的 race condition
const pendingCreations = new Map<string, Promise<ThreadChannel>>();

export async function findOrCreateVocabThread(channel: TextChannel | ThreadChannel, user: User, locale: string): Promise<ThreadChannel> {
  // Thread 頻道不支援 threads.create()，需退回到父頻道
  const parentChannel = (channel.isThread?.() ? channel.parent : channel) as TextChannel | null;
  if (!parentChannel) {
    throw new Error('無法取得可建立 Thread 的頻道');
  }

  const key = threadKey(parentChannel.id, user.id);

  // 若已有進行中的建立請求，直接等待結果（避免建立重複 Thread）
  if (pendingCreations.has(key)) {
    return pendingCreations.get(key)!;
  }

  const promise = _findOrCreate(parentChannel, user, key, locale).finally(() => {
    pendingCreations.delete(key);
  });
  pendingCreations.set(key, promise);
  return promise;
}

async function _findOrCreate(channel: TextChannel, user: User, key: string, locale: string): Promise<ThreadChannel> {
  const data = loadThreads();
  const existingId = data[key];

  if (existingId) {
    try {
      const thread = await channel.threads.fetch(existingId) as ThreadChannel | null;
      if (thread && !thread.archived) return thread;
      // 如果 thread 已封存，嘗試解封
      if (thread && thread.archived) {
        await thread.setArchived(false);
        return thread;
      }
    } catch {
      // thread 不存在或無法存取，重建
    }
  }

  const threadName = t('vocab.thread_name', locale, { name: user.displayName || user.username });
  let thread: ThreadChannel;
  try {
    thread = await channel.threads.create({
      name: threadName,
      type: ChannelType.PrivateThread,
      reason: 'Vocab Thread',
    }) as ThreadChannel;
  } catch {
    thread = await channel.threads.create({
      name: threadName,
      type: ChannelType.PublicThread,
      reason: 'Vocab Thread',
    }) as ThreadChannel;
  }

  data[key] = thread.id;
  saveThreads(data);
  return thread;
}

// 外部辭典連結
function getDictionaryLinks(word: string, langCode: string): string {
  const base = langCode.split('-')[0];
  const encoded = encodeURIComponent(word);

  switch (base) {
    case 'ja':
      return `[Jisho](https://jisho.org/search/${encoded}) | [Wiktionary](https://en.wiktionary.org/wiki/${encoded})`;
    case 'zh':
      return `[MDBG](https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encoded}) | [Wiktionary](https://en.wiktionary.org/wiki/${encoded})`;
    case 'ko':
      return `[Naver](https://ko.dict.naver.com/#/search?query=${encoded}) | [Wiktionary](https://en.wiktionary.org/wiki/${encoded})`;
    case 'en':
      return `[Merriam-Webster](https://www.merriam-webster.com/dictionary/${encoded}) | [Wiktionary](https://en.wiktionary.org/wiki/${encoded})`;
    default:
      return `[Wiktionary](https://en.wiktionary.org/wiki/${encoded})`;
  }
}

export async function postVocabEntry(thread: ThreadChannel, options: VocabEntryOptions, locale: string): Promise<void> {
  const { word, lemma, pos, langCode, translation, targetLang, messageUrl } = options;
  const romanized = await romanize(word, langCode);

  const lines = [`📖 **${word}**`];
  if (romanized) lines.push(`> *${romanized}*`);
  lines.push('────────');
  if (pos) lines.push(`**${t('vocab.pos_label', locale)}**${t(`pos.${pos}`, locale)}`);
  lines.push(`**${t('vocab.translation_label', locale, { lang: targetLang })}**${translation}`);
  if (messageUrl) lines.push(`**${t('vocab.source_link', locale)}**[↗](${messageUrl})`);
  lines.push(`🔗 ${getDictionaryLinks(lemma || word, langCode)}`);

  const embed = new EmbedBuilder()
    .setDescription(lines.join('\n'))
    .setColor(0x2ecc71)
    .setTimestamp();

  await thread.send({ embeds: [embed] });
}
