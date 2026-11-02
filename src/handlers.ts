import {
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Message,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { ApiError, api } from './api.js';
import { createPending, deletePending, getPending, allowUndo, takeUndo } from './pending.js';
import {
  categorySelect,
  helpEmbed,
  infoEmbed,
  notLinkedEmbed,
  previewButtons,
  previewEmbed,
  savedEmbed,
  summaryEmbed,
  undoButton,
} from './views.js';

function errorEmbed(err: unknown) {
  if (err instanceof ApiError) {
    if (err.notLinked) return notLinkedEmbed();
    if (err.status < 500) return infoEmbed('Não deu certo', err.message);
  }
  console.error(err);
  return infoEmbed('Ops', 'Não consegui falar com o MoneyGuard agora. Tente de novo em instantes.');
}

/** Mensagem livre na DM: interpreta e mostra a previa com botoes. */
/** "/vincular ABC123" digitado como texto (sem escolher o comando na lista do Discord). */
const TEXT_COMMAND = /^\/?\s*(vincular|resumo|ajuda|desvincular)\b\s*([a-z0-9]{0,12})\s*$/i;

export async function onDirectMessage(message: Message): Promise<void> {
  const text = message.content.trim();
  if (!text) return;
  try {
    const command = TEXT_COMMAND.exec(text);
    if (command) {
      await onTextCommand(message, command[1].toLowerCase(), command[2]);
      return;
    }
    const parsed = await api.parse(message.author.id, text);
    if (parsed.amount === null) {
      await message.reply({
        embeds: [infoEmbed('Não achei o valor', 'Tente algo como `gastei 8 reais na sodexo`. Use `/ajuda` para ver exemplos.')],
      });
      return;
    }
    const id = createPending(message.author.id, { ...parsed, amount: parsed.amount });
    const pending = getPending(id)!;
    const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [previewButtons(id, pending)];
    if (!pending.category) {
      const categories = await api.categories(message.author.id, pending.type);
      if (categories.length === 0) {
        deletePending(id);
        await message.reply({
          embeds: [infoEmbed('Sem categorias', `Crie categorias de ${pending.type === 'EXPENSE' ? 'gasto' : 'renda'} no site primeiro.`)],
        });
        return;
      }
      components.unshift(categorySelect(id, categories, null));
    }
    await message.reply({ embeds: [previewEmbed(pending)], components });
  } catch (err) {
    await message.reply({ embeds: [errorEmbed(err)] });
  }
}

async function onTextCommand(message: Message, name: string, arg: string): Promise<void> {
  const userId = message.author.id;
  switch (name) {
    case 'vincular': {
      if (!arg) {
        await message.reply({ embeds: [notLinkedEmbed()] });
        return;
      }
      const { userName } = await api.link(userId, arg);
      await message.reply({
        embeds: [infoEmbed('Conta vinculada ✅', `Prontinho, ${userName.split(' ')[0]}! Agora é só me contar seus gastos aqui na DM.`)],
      });
      return;
    }
    case 'desvincular':
      await api.unlink(userId);
      await message.reply({ embeds: [infoEmbed('Conta desvinculada', 'Não vou mais lançar na sua conta.')] });
      return;
    case 'resumo':
      await message.reply({ embeds: [summaryEmbed(await api.summary(userId))] });
      return;
    default:
      await message.reply({ embeds: [helpEmbed()] });
  }
}

export async function onCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Em servidor, a resposta so aparece para quem chamou.
  const flags = interaction.inGuild() ? MessageFlags.Ephemeral : undefined;
  const userId = interaction.user.id;
  try {
    switch (interaction.commandName) {
      case 'vincular': {
        await interaction.deferReply({ flags });
        const { userName } = await api.link(userId, interaction.options.getString('codigo', true));
        await interaction.editReply({
          embeds: [infoEmbed('Conta vinculada ✅', `Prontinho, ${userName.split(' ')[0]}! Agora é só me contar seus gastos aqui na DM.`)],
        });
        return;
      }
      case 'desvincular': {
        await interaction.deferReply({ flags });
        await api.unlink(userId);
        await interaction.editReply({ embeds: [infoEmbed('Conta desvinculada', 'Não vou mais lançar na sua conta.')] });
        return;
      }
      case 'resumo': {
        await interaction.deferReply({ flags });
        await interaction.editReply({ embeds: [summaryEmbed(await api.summary(userId))] });
        return;
      }
      case 'ajuda':
        await interaction.reply({ embeds: [helpEmbed()], flags });
        return;
    }
  } catch (err) {
    const payload = { embeds: [errorEmbed(err)] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
    else await interaction.reply({ ...payload, flags });
  }
}

export async function onButton(interaction: ButtonInteraction): Promise<void> {
  const [, action, id] = interaction.customId.split(':');
  const userId = interaction.user.id;

  if (action === 'undo') {
    const transactionId = Number(id);
    if (!takeUndo(transactionId, userId)) {
      await interaction.reply({ content: 'Não dá mais para desfazer por aqui. Use o site.', flags: MessageFlags.Ephemeral });
      return;
    }
    try {
      await api.deleteTransaction(userId, transactionId);
      await interaction.update({ embeds: [infoEmbed('Lançamento desfeito', 'Removi da sua conta.')], components: [] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(err)], flags: MessageFlags.Ephemeral });
    }
    return;
  }

  const pending = getPending(id);
  if (!pending || pending.discordUserId !== userId) {
    await interaction.update({ embeds: [infoEmbed('Expirou', 'Mande a mensagem de novo.')], components: [] });
    return;
  }

  try {
    switch (action) {
      case 'no':
        deletePending(id);
        await interaction.update({ embeds: [infoEmbed('Cancelado', 'Nada foi lançado.')], components: [] });
        return;
      case 'type':
        pending.type = pending.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE';
        pending.category = null;
        pending.merchant = null;
      // fallthrough: escolher categoria do novo tipo
      case 'cat': {
        const categories = await api.categories(userId, pending.type);
        if (categories.length === 0) {
          await interaction.update({
            embeds: [previewEmbed(pending), infoEmbed('Sem categorias', 'Crie categorias desse tipo no site.')],
            components: [previewButtons(id, pending)],
          });
          return;
        }
        await interaction.update({
          embeds: [previewEmbed(pending)],
          components: [categorySelect(id, categories, pending.category?.id ?? null), previewButtons(id, pending)],
        });
        return;
      }
      case 'ok': {
        if (!pending.category) return;
        await interaction.deferUpdate();
        const saved = await api.createTransaction({
          discordUserId: userId,
          categoryId: pending.category.id,
          merchantId: pending.merchant?.id ?? null,
          amount: pending.amount,
          description: pending.description,
          occurredOn: pending.occurredOn,
        });
        deletePending(id);
        allowUndo(saved.id, userId);
        await interaction.editReply({ embeds: [savedEmbed(saved)], components: [undoButton(saved.id)] });
        return;
      }
    }
  } catch (err) {
    const payload = { embeds: [errorEmbed(err)], components: [] };
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
    else await interaction.update(payload);
  }
}

export async function onSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const [, , id] = interaction.customId.split(':');
  const pending = getPending(id);
  if (!pending || pending.discordUserId !== interaction.user.id) {
    await interaction.update({ embeds: [infoEmbed('Expirou', 'Mande a mensagem de novo.')], components: [] });
    return;
  }
  const categoryId = Number(interaction.values[0]);
  const option = interaction.component.options.find((o) => o.value === interaction.values[0]);
  pending.category = { id: categoryId, name: option?.label ?? 'Categoria' };
  // A empresa so vale se continuar na categoria dela; trocar a categoria tira o vinculo.
  pending.merchant = null;
  await interaction.update({ embeds: [previewEmbed(pending)], components: [previewButtons(id, pending)] });
}
