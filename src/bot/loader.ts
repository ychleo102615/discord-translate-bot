import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Collection } from 'discord.js';
import type { BotModule, Command, ModuleContext } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = path.join(__dirname, '..', 'modules');

export interface LoadedModules {
  commands: Collection<string, Command>;
  buttonHandlers: Map<string, (interaction: any) => Promise<void>>;
  menuHandlers: Map<string, (interaction: any) => Promise<void>>;
}

export async function loadModules(context: ModuleContext): Promise<LoadedModules> {
  const commands = new Collection<string, Command>();
  const buttonHandlers = new Map<string, (interaction: any) => Promise<void>>();
  const menuHandlers = new Map<string, (interaction: any) => Promise<void>>();

  const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Support both dev (tsx → .ts) and prod (node → .js)
    const tsPath = path.join(MODULES_DIR, entry.name, 'index.ts');
    const jsPath = path.join(MODULES_DIR, entry.name, 'index.js');
    const indexPath = fs.existsSync(tsPath) ? tsPath : jsPath;
    if (!fs.existsSync(indexPath)) continue;

    const mod: BotModule = (await import(indexPath)).default;

    // Setup
    await mod.setup(context);

    // Commands
    for (const [name, cmd] of mod.commands) {
      commands.set(name, cmd);
    }

    // Events
    for (const { event, handler } of mod.events) {
      context.client.on(event, handler);
    }

    // Interactions
    if (mod.interactions.buttons) {
      for (const { prefix, handler } of mod.interactions.buttons) {
        buttonHandlers.set(prefix, handler);
      }
    }
    if (mod.interactions.selectMenus) {
      for (const { prefix, handler } of mod.interactions.selectMenus) {
        menuHandlers.set(prefix, handler);
      }
    }

    console.log(`[Loader] 載入模組: ${mod.name}`);
  }

  return { commands, buttonHandlers, menuHandlers };
}
