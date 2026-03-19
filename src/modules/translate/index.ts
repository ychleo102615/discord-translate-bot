import { Collection } from 'discord.js';
import type { BotModule, Command, ModuleContext } from '../../shared/types.js';
import * as translateCommand from './commands/translate.js';
import * as setupCommand from './commands/setup.js';
import * as usageCommand from './commands/usage.js';
import * as lookupCommand from './commands/lookup.js';
import * as myLanguageCommand from './commands/myLanguage.js';
import messageCreateHandler from './events/messageCreate.js';
import { handleWordSelect, handleWordMenuSelect, handlePageNav } from './interactions/lookupButtons.js';
import { handleLangSelect } from './interactions/lookupSelectMenu.js';
import { handleInlineLookup } from './interactions/lookupInline.js';
import { startResetSchedule } from './usageTracker.js';

const commands = new Collection<string, Command>();
commands.set(translateCommand.data.name, translateCommand as unknown as Command);
commands.set(setupCommand.data.name, setupCommand as unknown as Command);
commands.set(usageCommand.data.name, usageCommand as unknown as Command);
commands.set(lookupCommand.data.name, lookupCommand as unknown as Command);
commands.set(myLanguageCommand.data.name, myLanguageCommand as unknown as Command);

const translateModule: BotModule = {
  name: 'translate',

  commands,

  events: [
    { event: 'messageCreate', handler: messageCreateHandler },
  ],

  interactions: {
    buttons: [
      { prefix: 'wlt', handler: handleInlineLookup },
      { prefix: 'wlw', handler: handleWordSelect },
      { prefix: 'wlp', handler: handlePageNav },
    ],
    selectMenus: [
      { prefix: 'wls', handler: handleLangSelect },
      { prefix: 'wlm', handler: handleWordMenuSelect },
    ],
  },

  setup(_context: ModuleContext) {
    startResetSchedule();
  },
};

export default translateModule;
