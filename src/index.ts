import { createServer } from 'node:http';
import { Client, Events, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import { config } from './config.js';
import { onButton, onCommand, onDirectMessage, onSelect } from './handlers.js';

const client = new Client({
  // DMs nao precisam do intent privilegiado de conteudo de mensagem.
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`D7 conectado como ${c.user.tag}`);

  const rest = new REST().setToken(config.discordToken);
  await rest.put(Routes.applicationCommands(config.discordClientId), { body: commands });
  // Limpa comandos antigos registrados por servidor (versao anterior do D7).
  for (const guild of c.guilds.cache.values()) {
    await rest.put(Routes.applicationGuildCommands(config.discordClientId, guild.id), { body: [] }).catch(() => undefined);
  }
  console.log(`${commands.length} comandos registrados`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.guildId) return;
  await onDirectMessage(message).catch((err) => console.error('DM', err));
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await onCommand(interaction);
    else if (interaction.isButton() && interaction.customId.startsWith('mg:')) await onButton(interaction);
    else if (interaction.isStringSelectMenu() && interaction.customId.startsWith('mg:')) await onSelect(interaction);
  } catch (err) {
    console.error('interaction', err);
  }
});

// Health check para o k3s: 200 so com o bot conectado ao Discord.
createServer((req, res) => {
  const ok = req.url === '/healthz' && client.isReady();
  res.writeHead(ok ? 200 : 503, { 'Content-Type': 'text/plain' }).end(ok ? 'ok' : 'not ready');
}).listen(config.healthPort);

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    client.destroy().finally(() => process.exit(0));
  });
}

await client.login(config.discordToken);
