const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.warn('[serverConfig] config.json 損毀，重新建立：', err.message);
    return {};
  }
}

function saveConfig(config) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const DEFAULT_GUILD_CONFIG = { enabledChannels: [], targetLanguages: [] };

function getGuildConfig(guildId) {
  const config = loadConfig();
  return config[guildId] || DEFAULT_GUILD_CONFIG;
}

function addLanguage(guildId, lang) {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].targetLanguages.includes(lang)) {
    config[guildId].targetLanguages.push(lang);
    saveConfig(config);
    return true;
  }
  return false;
}

function removeLanguage(guildId, lang) {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].targetLanguages.indexOf(lang);
  if (idx === -1) return false;
  config[guildId].targetLanguages.splice(idx, 1);
  saveConfig(config);
  return true;
}

function enableChannel(guildId, channelId) {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].enabledChannels.includes(channelId)) {
    config[guildId].enabledChannels.push(channelId);
    saveConfig(config);
    return true;
  }
  return false;
}

function disableChannel(guildId, channelId) {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].enabledChannels.indexOf(channelId);
  if (idx === -1) return false;
  config[guildId].enabledChannels.splice(idx, 1);
  saveConfig(config);
  return true;
}

function isChannelEnabled(guildId, channelId) {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.enabledChannels.includes(channelId);
}

module.exports = {
  getGuildConfig,
  addLanguage,
  removeLanguage,
  enableChannel,
  disableChannel,
  isChannelEnabled,
};
