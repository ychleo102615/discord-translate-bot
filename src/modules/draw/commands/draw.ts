import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type Database from 'better-sqlite3';
import type { StrategyRow, SessionItemRow, HistoryRow } from '../types.js';
import { createSession, getSession, closeSession, getSessionItems, consumeItem, addHistory, getHistory } from '../data/sessions.js';
import { getDistributionStrategy } from '../distribution/index.js';
import { getDb } from '../context.js';

// --- Slash command definition ---

export const data = new SlashCommandBuilder()
  .setName('draw')
  .setDescription('抽選系統')
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('開始新的抽選 session')
      .addStringOption((opt) => opt.setName('strategy').setDescription('策略名稱').setRequired(true))
      .addUserOption((opt) => opt.setName('user1').setDescription('參與者 1').setRequired(true))
      .addUserOption((opt) => opt.setName('user2').setDescription('參與者 2'))
      .addUserOption((opt) => opt.setName('user3').setDescription('參與者 3'))
      .addUserOption((opt) => opt.setName('user4').setDescription('參與者 4'))
      .addUserOption((opt) => opt.setName('user5').setDescription('參與者 5')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('next')
      .setDescription('對現有 session 進行下一輪抽選')
      .addStringOption((opt) => opt.setName('session').setDescription('Session ID').setRequired(true))
      .addUserOption((opt) => opt.setName('user1').setDescription('參與者 1').setRequired(true))
      .addUserOption((opt) => opt.setName('user2').setDescription('參與者 2'))
      .addUserOption((opt) => opt.setName('user3').setDescription('參與者 3'))
      .addUserOption((opt) => opt.setName('user4').setDescription('參與者 4'))
      .addUserOption((opt) => opt.setName('user5').setDescription('參與者 5')),
  )
  .addSubcommand((sub) =>
    sub
      .setName('close')
      .setDescription('關閉一個抽選 session')
      .addStringOption((opt) => opt.setName('session').setDescription('Session ID').setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub
      .setName('history')
      .setDescription('查看抽選歷史')
      .addStringOption((opt) => opt.setName('session').setDescription('Session ID').setRequired(true)),
  );

// --- Execute ---

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  switch (sub) {
    case 'start':
      return handleStart(interaction);
    case 'next':
      return handleNext(interaction);
    case 'close':
      return handleClose(interaction);
    case 'history':
      return handleHistory(interaction);
  }
}

// --- Subcommand handlers ---

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  const db = getDb();
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: '此指令只能在伺服器中使用。', ephemeral: true });
    return;
  }

  const strategyName = interaction.options.getString('strategy', true);
  const userIds = collectUserIds(interaction);

  // Find strategy by name + guildId
  const strategyRow = db
    .prepare('SELECT * FROM draw_strategies WHERE guild_id = ? AND name = ?')
    .get(guildId, strategyName) as StrategyRow | undefined;

  if (!strategyRow) {
    await interaction.reply({ content: `找不到策略「${strategyName}」。`, ephemeral: true });
    return;
  }

  const session = createSession(db, guildId, strategyRow.id);
  const results = executeDraw(db, session.id, strategyRow, userIds);

  const embed = buildDrawEmbed(strategyRow.name, session.id, 1, results);
  await interaction.reply({ embeds: [embed] });
}

async function handleNext(interaction: ChatInputCommandInteraction): Promise<void> {
  const db = getDb();
  const sessionId = interaction.options.getString('session', true);
  const userIds = collectUserIds(interaction);

  const session = getSession(db, sessionId);
  if (!session) {
    await interaction.reply({ content: `找不到 Session「${sessionId}」。`, ephemeral: true });
    return;
  }
  if (session.status !== 'active') {
    await interaction.reply({ content: `Session「${sessionId}」已關閉。`, ephemeral: true });
    return;
  }

  const strategyRow = db
    .prepare('SELECT * FROM draw_strategies WHERE id = ?')
    .get(session.strategy_id) as StrategyRow | undefined;

  if (!strategyRow) {
    await interaction.reply({ content: '此 session 的策略已被刪除。', ephemeral: true });
    return;
  }

  // Determine round number from existing history
  const existingHistory = getHistory(db, sessionId);
  const maxRound = existingHistory.reduce((max, h) => Math.max(max, h.round), 0);
  const round = maxRound + 1;

  const results = executeDraw(db, sessionId, strategyRow, userIds, round);

  const embed = buildDrawEmbed(strategyRow.name, sessionId, round, results);
  await interaction.reply({ embeds: [embed] });
}

async function handleClose(interaction: ChatInputCommandInteraction): Promise<void> {
  const db = getDb();
  const sessionId = interaction.options.getString('session', true);

  const success = closeSession(db, sessionId);
  if (!success) {
    await interaction.reply({ content: `找不到 Session「${sessionId}」或已關閉。`, ephemeral: true });
    return;
  }

  await interaction.reply({ content: `Session \`${sessionId}\` 已關閉。` });
}

async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  const db = getDb();
  const sessionId = interaction.options.getString('session', true);

  const session = getSession(db, sessionId);
  if (!session) {
    await interaction.reply({ content: `找不到 Session「${sessionId}」。`, ephemeral: true });
    return;
  }

  const history = getHistory(db, sessionId);
  if (history.length === 0) {
    await interaction.reply({ content: `Session \`${sessionId}\` 尚無抽選紀錄。`, ephemeral: true });
    return;
  }

  const embed = buildHistoryEmbed(sessionId, history, db);
  await interaction.reply({ embeds: [embed] });
}

// --- Draw logic ---

interface DrawResult {
  userId: string;
  item: SessionItemRow;
}

function executeDraw(
  db: Database.Database,
  sessionId: string,
  strategyRow: StrategyRow,
  userIds: string[],
  round?: number,
): DrawResult[] {
  // Calculate round if not provided
  if (round === undefined) {
    const existingHistory = getHistory(db, sessionId);
    const maxRound = existingHistory.reduce((max, h) => Math.max(max, h.round), 0);
    round = maxRound + 1;
  }

  // Get unconsumed session items
  const availableItems = getSessionItems(db, sessionId);
  if (availableItems.length === 0) return [];

  // Use distribution strategy to pick items
  const distribution = getDistributionStrategy(strategyRow.distribution);
  const pickedItems = distribution.distribute(availableItems, userIds.length);

  const isConsumable = strategyRow.consumable === 1;
  const results: DrawResult[] = [];

  for (let i = 0; i < pickedItems.length && i < userIds.length; i++) {
    const item = pickedItems[i];
    const userId = userIds[i];

    if (isConsumable) {
      consumeItem(db, item.id);
    }

    addHistory(db, sessionId, userId, item.id, round);
    results.push({ userId, item });
  }

  return results;
}

// --- Helpers ---

function collectUserIds(interaction: ChatInputCommandInteraction): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const user = interaction.options.getUser(`user${i}`);
    if (user) ids.push(user.id);
  }
  return ids;
}

function buildDrawEmbed(
  strategyName: string,
  sessionId: string,
  round: number,
  results: DrawResult[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`抽選結果 — ${strategyName}`)
    .setDescription(`Session: \`${sessionId}\`\nRound: **${round}**`)
    .setTimestamp();

  if (results.length === 0) {
    embed.addFields({ name: '結果', value: '沒有可用的項目可供抽選。' });
  } else {
    for (const result of results) {
      const itemData = JSON.parse(result.item.data) as Record<string, unknown>;
      const display = Object.entries(itemData)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      embed.addFields({ name: `<@${result.userId}>`, value: display || '(空)' });
    }
  }

  return embed;
}

function buildHistoryEmbed(
  sessionId: string,
  history: HistoryRow[],
  db: Database.Database,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('抽選歷史')
    .setDescription(`Session: \`${sessionId}\``)
    .setTimestamp();

  // Group by round
  const rounds = new Map<number, HistoryRow[]>();
  for (const entry of history) {
    const list = rounds.get(entry.round) ?? [];
    list.push(entry);
    rounds.set(entry.round, list);
  }

  for (const [round, entries] of rounds) {
    const lines = entries.map((entry) => {
      const sessionItem = db
        .prepare('SELECT data FROM draw_session_items WHERE id = ?')
        .get(entry.session_item_id) as { data: string } | undefined;
      const itemData = sessionItem ? JSON.parse(sessionItem.data) as Record<string, unknown> : {};
      const display = Object.entries(itemData)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `<@${entry.user_id}> → ${display || '(未知)'}`;
    });
    embed.addFields({ name: `Round ${round}`, value: lines.join('\n') });
  }

  return embed;
}
