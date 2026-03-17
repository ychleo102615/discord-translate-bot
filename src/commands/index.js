const { Collection } = require('discord.js');
const translateCommand = require('./translate');
const setupCommand = require('./setup');
const usageCommand = require('./usage');

const commands = new Collection();
commands.set(translateCommand.data.name, translateCommand);
commands.set(setupCommand.data.name, setupCommand);
commands.set(usageCommand.data.name, usageCommand);

module.exports = commands;
