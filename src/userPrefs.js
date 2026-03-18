const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PREFS_PATH = path.join(DATA_DIR, 'userPrefs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadPrefs() {
  ensureDataDir();
  if (!fs.existsSync(PREFS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'));
  } catch (err) {
    console.warn('[userPrefs] userPrefs.json 損毀，重新建立：', err.message);
    return {};
  }
}

function savePrefs(prefs) {
  ensureDataDir();
  fs.writeFileSync(PREFS_PATH, JSON.stringify(prefs, null, 2));
}

function getUserLanguage(userId) {
  const prefs = loadPrefs();
  return prefs[userId]?.language || null;
}

function setUserLanguage(userId, language) {
  const prefs = loadPrefs();
  if (!prefs[userId]) prefs[userId] = {};
  prefs[userId].language = language;
  savePrefs(prefs);
}

module.exports = { getUserLanguage, setUserLanguage };
