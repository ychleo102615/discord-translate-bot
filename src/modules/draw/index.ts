import { Collection } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotModule, Command, ModuleContext } from '../../shared/types.js';
import { runDrawMigration } from './data/migration.js';
import * as drawCommand from './commands/draw.js';

let db: Database.Database;

export function getDb(): Database.Database {
  return db;
}

const commands = new Collection<string, Command>();
commands.set(drawCommand.data.name, drawCommand);

const drawModule: BotModule = {
  name: 'draw',

  commands,

  events: [],

  interactions: {},

  setup(context: ModuleContext) {
    db = context.db;
    runDrawMigration(db);
  },
};

export default drawModule;
