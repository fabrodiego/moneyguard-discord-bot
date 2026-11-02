import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type APIEmbedField,
} from 'discord.js';
import type { Category, Summary, Transaction } from './api.js';
import { config } from './config.js';
import { BRAND_COLOR, EXPENSE_COLOR, INCOME_COLOR, dateBr, money, percentText, progressBar } from './format.js';
import type { Pending } from './pending.js';

const footer = { text: 'MoneyGuard' };

export function previewEmbed(p: Pending): EmbedBuilder {
  const fields: APIEmbedField[] = [
    { name: 'Valor', value: money(p.amount), inline: true },
    { name: 'Tipo', value: p.type === 'EXPENSE' ? 'Gasto' : 'Renda', inline: true },
    { name: 'Data', value: dateBr(p.occurredOn), inline: true },
    { name: 'Categoria', value: p.category?.name ?? '⚠️ escolha abaixo', inline: true },
  ];
  if (p.merchant) fields.push({ name: 'Empresa', value: p.merchant.name, inline: true });
  if (p.description) fields.push({ name: 'Descrição', value: p.description, inline: true });
  return new EmbedBuilder()
    .setColor(p.type === 'EXPENSE' ? EXPENSE_COLOR : INCOME_COLOR)
    .setTitle('Confere o lançamento?')
    .addFields(fields)
    .setFooter(footer);
}

export function previewButtons(id: string, p: Pending): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mg:ok:${id}`).setLabel('Confirmar').setStyle(ButtonStyle.Success).setDisabled(!p.category),
    new ButtonBuilder().setCustomId(`mg:cat:${id}`).setLabel('Trocar categoria').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`mg:type:${id}`)
      .setLabel(p.type === 'EXPENSE' ? 'É renda' : 'É gasto')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`mg:no:${id}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger),
  );
}

export function categorySelect(id: string, categories: Category[], selected: number | null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`mg:sel:${id}`)
    .setPlaceholder('Escolha a categoria')
    .addOptions(
      categories.slice(0, 25).map((c) => ({
        label: c.name.slice(0, 100),
        value: String(c.id),
        default: c.id === selected,
      })),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function savedEmbed(t: Transaction): EmbedBuilder {
  const what = t.description ?? t.merchant?.name ?? t.category.name;
  return new EmbedBuilder()
    .setColor(t.type === 'EXPENSE' ? EXPENSE_COLOR : INCOME_COLOR)
    .setTitle(`✅ ${t.type === 'EXPENSE' ? 'Gasto' : 'Renda'} lançado`)
    .setDescription(`**${money(t.amount)}** · ${what}\n${t.category.name} · ${dateBr(t.occurredOn)}`)
    .setFooter(footer);
}

export function undoButton(transactionId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`mg:undo:${transactionId}`).setLabel('Desfazer').setStyle(ButtonStyle.Secondary),
  );
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(BRAND_COLOR).setTitle(title).setDescription(description).setFooter(footer);
}

export function notLinkedEmbed(): EmbedBuilder {
  return infoEmbed(
    'Conta não vinculada',
    `Para lançar pelo Discord, ligue sua conta:\n` +
      `1. Entre em ${config.siteUrl}/discord e gere um código\n` +
      `2. Mande aqui: \`/vincular CÓDIGO\``,
  );
}

export function helpEmbed(): EmbedBuilder {
  return infoEmbed(
    'D7 · MoneyGuard',
    [
      'Me mande uma mensagem privada contando o gasto ou a renda:',
      '> `acabei de gastar 8 reais na sodexo`',
      '> `paguei R$ 120,50 de luz ontem`',
      '> `recebi 6.500 de salário`',
      '',
      'Eu entendo `R$`, `reais`, `mil`, `ontem`, `anteontem`, `dia 15` e `15/10`.',
      'Antes de gravar, sempre mostro o que entendi.',
      '',
      '**Comandos**',
      '`/vincular` · ligar sua conta do MoneyGuard',
      '`/resumo` · rendas, gastos e metas do mês',
      '`/desvincular` · desligar sua conta',
      '',
      `Cadastre suas empresas em ${config.siteUrl}/empresas para eu acertar a categoria sozinho.`,
    ].join('\n'),
  );
}

export function summaryEmbed(s: Summary): EmbedBuilder {
  const top = s.topExpenses.length
    ? s.topExpenses.map((c) => `• ${c.name}: **${money(c.total)}** (${percentText(c.percent)})`).join('\n')
    : 'Nenhum gasto ainda.';
  const goals = s.goals.goals.length
    ? s.goals.goals
        .slice(0, 3)
        .map((g) => `**${g.name}**\n${progressBar(g.percent)} ${percentText(g.percent)} · ${money(g.saved)} de ${money(g.target)}`)
        .join('\n')
    : 'Nenhuma meta.';
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Resumo · ${s.monthLabel}`)
    .addFields(
      { name: 'Rendas', value: money(s.month.income), inline: true },
      { name: 'Gastos', value: money(s.month.expense), inline: true },
      { name: 'Saldo', value: money(s.month.balance), inline: true },
      { name: 'Onde mais gastou', value: top },
      { name: `Metas · disponível para aportar ${money(s.goals.available)}`, value: goals },
    )
    .setURL(config.siteUrl)
    .setFooter(footer);
}
