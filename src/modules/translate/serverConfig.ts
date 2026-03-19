import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

export interface GuildConfig {
  enabledChannels: string[];
  targetLanguages: string[];
  showRomanization?: boolean;
}

interface ConfigData {
  [guildId: string]: GuildConfig;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig(): ConfigData {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as ConfigData;
  } catch (err) {
    console.warn('[serverConfig] config.json 損毀，重新建立：', (err as Error).message);
    return {};
  }
}

function saveConfig(config: ConfigData): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const DEFAULT_GUILD_CONFIG: GuildConfig = { enabledChannels: [], targetLanguages: [], showRomanization: false };

export function getGuildConfig(guildId: string): GuildConfig {
  const config = loadConfig();
  return config[guildId] || DEFAULT_GUILD_CONFIG;
}

export function addLanguage(guildId: string, lang: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].targetLanguages.includes(lang)) {
    config[guildId].targetLanguages.push(lang);
    saveConfig(config);
    return true;
  }
  return false;
}

export function removeLanguage(guildId: string, lang: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].targetLanguages.indexOf(lang);
  if (idx === -1) return false;
  config[guildId].targetLanguages.splice(idx, 1);
  saveConfig(config);
  return true;
}

export function enableChannel(guildId: string, channelId: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [] };
  if (!config[guildId].enabledChannels.includes(channelId)) {
    config[guildId].enabledChannels.push(channelId);
    saveConfig(config);
    return true;
  }
  return false;
}

export function disableChannel(guildId: string, channelId: string): boolean {
  const config = loadConfig();
  if (!config[guildId]) return false;
  const idx = config[guildId].enabledChannels.indexOf(channelId);
  if (idx === -1) return false;
  config[guildId].enabledChannels.splice(idx, 1);
  saveConfig(config);
  return true;
}

export function isChannelEnabled(guildId: string, channelId: string): boolean {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.enabledChannels.includes(channelId);
}

export function setRomanization(guildId: string, enabled: boolean): void {
  const config = loadConfig();
  if (!config[guildId]) config[guildId] = { enabledChannels: [], targetLanguages: [], showRomanization: false };
  config[guildId].showRomanization = enabled;
  saveConfig(config);
}

export function isRomanizationEnabled(guildId: string): boolean {
  const guildConfig = getGuildConfig(guildId);
  return guildConfig.showRomanization === true;
}
