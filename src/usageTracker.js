const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createDefaultUsage() {
  return { totalChars: 0, resetAt: getNextResetDate(), limitReached: false };
}

function getNextResetDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function loadUsage() {
  ensureDataDir();
  if (!fs.existsSync(USAGE_PATH)) {
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8'));
  } catch (err) {
    console.warn('[usageTracker] usage.json 損毀，重新建立：', err.message);
    const initial = createDefaultUsage();
    fs.writeFileSync(USAGE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function saveUsage(usage) {
  ensureDataDir();
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
}

function checkAndAutoReset() {
  const usage = loadUsage();
  const now = new Date();
  if (now >= new Date(usage.resetAt)) {
    const reset = createDefaultUsage();
    saveUsage(reset);
    return reset;
  }
  return usage;
}

function getLimit() {
  return parseInt(process.env.TRANSLATE_CHAR_LIMIT || '500000', 10);
}

// 合併 check + add 為一個操作，減少 TOCTOU 問題
function tryAddChars(count) {
  const usage = checkAndAutoReset();
  if (usage.limitReached) return { usage, allowed: false };

  usage.totalChars += count;
  if (usage.totalChars >= getLimit()) {
    usage.limitReached = true;
  }
  saveUsage(usage);
  return { usage, allowed: true };
}

function resetUsage() {
  const reset = createDefaultUsage();
  saveUsage(reset);
  return reset;
}

function getUsage() {
  return checkAndAutoReset();
}

// 每月自動重置排程（每小時檢查一次）
function startResetSchedule() {
  setInterval(() => {
    checkAndAutoReset();
  }, 60 * 60 * 1000);
}

module.exports = { tryAddChars, resetUsage, getUsage, getLimit, startResetSchedule };
