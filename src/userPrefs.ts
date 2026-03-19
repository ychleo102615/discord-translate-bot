import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', 'data');
const PREFS_PATH = path.join(DATA_DIR, 'userPrefs.json');

interface UserPref {
  language: string;
}

interface UserPrefsData {
  [userId: string]: UserPref;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPrefs(): UserPrefsData {
  ensureDataDir();
  if (!fs.existsSync(PREFS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8')) as UserPrefsData;
  } catch (err) {
    console.warn('[userPrefs] userPrefs.json 損毀，重新建立：', (err as Error).message);
    return {};
  }
}

function savePrefs(prefs: UserPrefsData): void {
  ensureDataDir();
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

export function getUserLanguage(userId: string): string | null {
  const prefs = loadPrefs();
  return prefs[userId]?.language || null;
}

export function setUserLanguage(userId: string, language: string): void {
  const prefs = loadPrefs();
  if (!prefs[userId]) prefs[userId] = { language: '' };
  prefs[userId].language = language;
  savePrefs(prefs);
}
