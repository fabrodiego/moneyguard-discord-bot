# D7 · MoneyGuard Discord Bot

Bot do Discord do **MoneyGuard**. Você conta o gasto em mensagem privada e ele lança na sua conta.

```
você: acabei de gastar 8 reais na sodexo
D7:   Confere o lançamento?  R$ 8,00 · Gasto · hoje · Alimentação · Sodexo
      [Confirmar] [Trocar categoria] [É renda] [Cancelar]
```

## Como funciona
- A frase é interpretada pela API do MoneyGuard, por regras (sem IA externa). Valor, data (`ontem`, `dia 15`, `15/10`) e empresa → categoria.
- Antes de gravar, o bot sempre mostra o que entendeu. Depois de gravar, dá para **Desfazer** por 10 minutos.
- Só funciona por **DM**: seus valores não aparecem em canal nenhum.

## Comandos
| Comando | O que faz |
|---|---|
| `/vincular codigo` | Liga sua conta (o código é gerado em moneyguard.fabrodiego.com/discord) |
| `/resumo` | Rendas, gastos, categorias e metas do mês |
| `/desvincular` | Desliga sua conta |
| `/ajuda` | Exemplos |

## Variáveis de ambiente
| Variável | Descrição |
|---|---|
| `DISCORD_TOKEN` | Token do bot (Developer Portal) |
| `DISCORD_CLIENT_ID` | Application ID |
| `BOT_API_KEY` | Mesmo valor do `BOT_API_KEY` da API (header `X-Bot-Key`) |
| `API_URL` | URL da API (padrão: serviço interno do cluster) |
| `SITE_URL` | Link mostrado nas mensagens |

## Desenvolvimento
```bash
npm ci
cp .env.example .env   # preencha
npm run dev
npm test
```

Health check em `:8080/healthz` (200 quando conectado ao Discord).
