import { Collection } from 'discord.js';
import * as translateCommand from './translate.js';
import * as setupCommand from './setup.js';
import * as usageCommand from './usage.js';
import * as lookupCommand from './lookup.js';
import * as myLanguageCommand from './myLanguage.js';

const commands = new Collection<string, any>();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);
commands.set(lookupCommand.data.name, lookupCommand);
commands.set(myLanguageCommand.data.name, myLanguageCommand);

export default commands;
