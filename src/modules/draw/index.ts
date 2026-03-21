import { Collection } from 'discord.js';
import type { BotModule, Command, ModuleContext } from '../../shared/types.js';
import { runDrawMigration } from './data/migration.js';
import { setDb } from './context.js';
import * as drawCommand from './commands/draw.js';

const commands = new Collection<string, Command>();
commands.set(drawCommand.data.name, drawCommand);

const drawModule: BotModule = {
  name: 'draw',

  commands,

  events: [],

  interactions: {},

  setup(context: ModuleContext) {
    setDb(context.db);
    runDrawMigration(context.db);
  },
};

export default drawModule;
