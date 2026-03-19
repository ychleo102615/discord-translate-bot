import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');

export interface UsageData {
  totalChars: number;
  resetAt: string;
  limitReached: boolean;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createDefaultUsage(): UsageData {
  return { totalChars: 0, resetAt: getNextResetDate(), limitReached: false };
}

function getNextResetDate(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function loadUsage(): UsageData {
  ensureDataDir();
  if (!fs.existsSync(USAGE_PATH)) {
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8')) as UsageData;
  } catch (err) {
    console.warn('[usageTracker] usage.json 損毀，重新建立：', (err as Error).message);
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveUsage(usage: UsageData): void {
  ensureDataDir();
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

function checkAndAutoReset(): UsageData {
  const usage = loadUsage();
  const now = new Date();
  if (now >= new Date(usage.resetAt)) {
    const reset = createDefaultUsage();
    saveUsage(reset);
    return reset;
  }
  return usage;
}

export function getLimit(): number {
  return parseInt(process.env.TRANSLATE_CHAR_LIMIT || '500000', 10);
}

// 合併 check + add 為一個操作，減少 TOCTOU 問題
export function tryAddChars(count: number): { usage: UsageData; allowed: boolean } {
  const usage = checkAndAutoReset();
  if (usage.limitReached) return { usage, allowed: false };

  usage.totalChars += count;
  if (usage.totalChars >= getLimit()) {
    usage.limitReached = true;
  }
  saveUsage(usage);
  return { usage, allowed: true };
}

export function resetUsage(): UsageData {
  const reset = createDefaultUsage();
  saveUsage(reset);
  return reset;
}

export function getUsage(): UsageData {
  return checkAndAutoReset();
}

// 每月自動重置排程（每小時檢查一次）
export function startResetSchedule(): void {
  setInterval(() => {
    checkAndAutoReset();
  }, 60 * 60 * 1000);
}
