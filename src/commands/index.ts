import { Collection } from 'discord.js';
import * as translateCommand from '../modules/translate/commands/translate.js';
import * as setupCommand from '../modules/translate/commands/setup.js';
import * as usageCommand from '../modules/translate/commands/usage.js';
import * as lookupCommand from '../modules/translate/commands/lookup.js';
import * as myLanguageCommand from '../modules/translate/commands/myLanguage.js';

const commands = new Collection<string, any>();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);
commands.set(lookupCommand.data.name, lookupCommand);
commands.set(myLanguageCommand.data.name, myLanguageCommand);

export default commands;
