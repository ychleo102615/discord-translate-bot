import type { Client, Collection, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';

export interface Command {
  data: { name: string; toJSON(): unknown };
  execute(interaction: any): Promise<void>;
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
}
