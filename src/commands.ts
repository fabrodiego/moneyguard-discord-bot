import { InteractionContextType, SlashCommandBuilder } from 'discord.js';

const contexts = [InteractionContextType.BotDM, InteractionContextType.Guild];

export const commands = [
  new SlashCommandBuilder()
    .setName('vincular')
    .setDescription('Liga sua conta do Discord ao MoneyGuard')
    .addStringOption((o) =>
      o.setName('codigo').setDescription('Código gerado no site (6 caracteres)').setRequired(true).setMaxLength(12),
    )
    .setContexts(contexts),
  new SlashCommandBuilder().setName('resumo').setDescription('Rendas, gastos e metas do mês').setContexts(contexts),
  new SlashCommandBuilder().setName('assinaturas').setDescription('Suas assinaturas e próximas cobranças').setContexts(contexts),
  new SlashCommandBuilder().setName('desvincular').setDescription('Desliga sua conta do MoneyGuard').setContexts(contexts),
  new SlashCommandBuilder().setName('ajuda').setDescription('Como lançar gastos pelo D7').setContexts(contexts),
].map((c) => c.toJSON());
