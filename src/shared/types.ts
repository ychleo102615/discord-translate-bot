import type { Client, Collection, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import type Database from 'better-sqlite3';

export interface CommandData {
  name: string;
  toJSON(): unknown;
}

export interface Command {
  data: CommandData;
  execute(interaction: any): Promise<void>;
}

export interface AppConfig {
  port: number;
  jwtSecret: string;
  frontendUrl: string;
  discord: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export interface BotModule {
  name: string;
  commands: Collection<string, Command>;
  events: Array<{
    event: string;
    handler: (...args: any[]) => void;
  }>;
  interactions: {
    buttons?: Array<{ prefix: string; handler: (interaction: ButtonInteraction) => Promise<void> }>;
    selectMenus?: Array<{ prefix: string; handler: (interaction: StringSelectMenuInteraction) => Promise<void> }>;
  };
  setup(context: ModuleContext): void | Promise<void>;
}

export interface ModuleContext {
  client: Client;
  db: Database.Database;
  config: AppConfig;
}
