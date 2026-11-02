function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

export const config = {
  discordToken: required('DISCORD_TOKEN'),
  discordClientId: required('DISCORD_CLIENT_ID'),
  botApiKey: required('BOT_API_KEY'),
  /** No cluster, a API e acessada pela rede interna (sem sair para a Cloudflare). */
  apiUrl: (process.env.API_URL ?? 'http://moneyguard-api.moneyguard-api.svc.cluster.local').replace(/\/$/, ''),
  siteUrl: (process.env.SITE_URL ?? 'https://moneyguard.fabrodiego.com').replace(/\/$/, ''),
  healthPort: Number(process.env.HEALTH_PORT ?? 8080),
};
