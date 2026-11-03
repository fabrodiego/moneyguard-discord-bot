import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type APIEmbedField,
} from 'discord.js';
import type { Category, Recurrence, RecurrenceList, Summary, Transaction } from './api.js';
import { config } from './config.js';
import { BRAND_COLOR, EXPENSE_COLOR, INCOME_COLOR, dateBr, money, percentText, progressBar, scheduleText } from './format.js';
import type { Pending } from './pending.js';

const footer = { text: 'MoneyGuard' };

/** Nome usado para a assinatura: descricao, empresa ou categoria. */
export function recurrenceName(p: Pending): string {
  return (p.description ?? p.merchant?.name ?? p.category?.name ?? 'Assinatura').slice(0, 80);
}

export function previewEmbed(p: Pending): EmbedBuilder {
  if (p.recurrence) {
    const fields: APIEmbedField[] = [
      { name: 'Nome', value: recurrenceName(p), inline: true },
      { name: 'Valor', value: money(p.amount), inline: true },
      { name: 'Cobrança', value: scheduleText(p.recurrence), inline: true },
      { name: 'Tipo', value: p.type === 'EXPENSE' ? 'Gasto fixo' : 'Renda fixa', inline: true },
      { name: 'Categoria', value: p.category?.name ?? '⚠️ escolha abaixo', inline: true },
    ];
    if (p.merchant) fields.push({ name: 'Empresa', value: p.merchant.name, inline: true });
    return new EmbedBuilder()
      .setColor(p.type === 'EXPENSE' ? EXPENSE_COLOR : INCOME_COLOR)
      .setTitle('🔁 Criar assinatura?')
      .setDescription('Vou lançar automaticamente em toda cobrança.')
      .addFields(fields)
      .setFooter(footer);
  }
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
    new ButtonBuilder()
      .setCustomId(`mg:ok:${id}`)
      .setLabel(p.recurrence ? 'Criar assinatura' : 'Confirmar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!p.category),
    new ButtonBuilder().setCustomId(`mg:cat:${id}`).setLabel('Trocar categoria').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`mg:rec:${id}`)
      .setLabel(p.recurrence ? 'É só uma vez' : 'É assinatura')
      .setStyle(ButtonStyle.Secondary),
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

export function recurrenceSavedEmbed(r: Recurrence, launchedToday: boolean): EmbedBuilder {
  const lines = [
    `**${r.name}** · ${money(r.amount)} · ${scheduleText(r)}`,
    `${r.category.name}${r.nextDueOn ? ` · próxima cobrança ${dateBr(r.nextDueOn)}` : ''}`,
  ];
  if (launchedToday) lines.push('A cobrança de hoje já entrou nos lançamentos.');
  lines.push(`Para editar ou pausar: ${config.siteUrl}/assinaturas`);
  return new EmbedBuilder()
    .setColor(r.type === 'EXPENSE' ? EXPENSE_COLOR : INCOME_COLOR)
    .setTitle('✅ Assinatura criada')
    .setDescription(lines.join('\n'))
    .setFooter(footer);
}

export function recurrencesEmbed(list: RecurrenceList): EmbedBuilder {
  const s = list.summary;
  const items = list.active.length
    ? list.active
        .slice(0, 15)
        .map((r) => `${r.type === 'EXPENSE' ? '🔻' : '🔺'} **${r.name}** · ${money(r.amount)} · ${scheduleText(r).toLowerCase()}`)
        .join('\n')
    : 'Nenhuma assinatura ativa. Mande, por exemplo: `assinei streaming 55,90 todo dia 2`';
  const next = s.next30Days.length
    ? s.next30Days.slice(0, 8).map((u) => `${dateBr(u.dueOn)} · ${u.name} · ${money(u.amount)}`).join('\n')
    : 'Nada nos próximos 30 dias.';
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle('🔁 Assinaturas')
    .addFields(
      { name: 'Gastos fixos/mês', value: money(s.monthlyExpenses), inline: true },
      { name: 'Rendas fixas/mês', value: money(s.monthlyIncomes), inline: true },
      { name: 'Sobra fixa/mês', value: money(s.monthlyBalance), inline: true },
      { name: `Ativas (${s.activeCount})`, value: items },
      { name: 'Próximos 30 dias', value: next },
    )
    .setURL(`${config.siteUrl}/assinaturas`)
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
      '> `acabei de gastar 8 reais na cantina central`',
      '> `paguei R$ 120,50 de luz ontem`',
      '> `recebi 6.500 de salário`',
      '',
      '**Assinaturas** (lançadas sozinhas todo mês ou ano):',
      '> `assinei streaming 55,90 todo dia 2`',
      '> `academia 99,90 por mês`',
      '> `domínio 120 reais todo ano em 15/03`',
      '',
      'Eu entendo `R$`, `reais`, `mil`, `ontem`, `anteontem`, `dia 15` e `15/10`.',
      'Antes de gravar, sempre mostro o que entendi.',
      '',
      '**Comandos**',
      '`/vincular` · ligar sua conta do MoneyGuard',
      '`/resumo` · rendas, gastos e metas do mês',
      '`/assinaturas` · suas assinaturas e próximas cobranças',
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
