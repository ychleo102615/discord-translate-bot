const { Collection } = require('discord.js');
const translateCommand = require('./translate');
const setupCommand = require('./setup');
const usageCommand = require('./usage');
const lookupCommand = require('./lookup');
const myLanguageCommand = require('./myLanguage');

const commands = new Collection();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);
commands.set(lookupCommand.data.name, lookupCommand);
commands.set(myLanguageCommand.data.name, myLanguageCommand);

module.exports = commands;
