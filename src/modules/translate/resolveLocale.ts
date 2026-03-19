import { getUserLanguage } from './userPrefs.js';
import { getGuildConfig } from './serverConfig.js';
import { getSupportedLanguages } from '../../shared/i18n.js';

const DEFAULT_LOCALE = 'zh-TW';

const supportedLocales = new Set(getSupportedLanguages());

interface InteractionLike {
  user: { id: string };
  guildId: string | null;
}

/** user my-language > guild targetLang[0] > 'zh-TW' */
export function resolveLocale(interaction: InteractionLike): string {
  const userLang = getUserLanguage(interaction.user.id);
  if (userLang && supportedLocales.has(userLang)) return userLang;

  if (interaction.guildId) {
    const config = getGuildConfig(interaction.guildId);
    if (config.targetLanguages?.[0] && supportedLocales.has(config.targetLanguages[0])) {
      return config.targetLanguages[0];
    }
  }

  return DEFAULT_LOCALE;
}

/** guild targetLang[0] > 'zh-TW' */
export function resolveLocaleForGuild(guildId: string): string {
  const config = getGuildConfig(guildId);
  if (config.targetLanguages?.[0] && supportedLocales.has(config.targetLanguages[0])) {
    return config.targetLanguages[0];
  }
  return DEFAULT_LOCALE;
}
