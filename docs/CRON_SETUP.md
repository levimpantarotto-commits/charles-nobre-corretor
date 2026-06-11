# Cron Setup — Sistema Charles Nobre

Três endpoints de automação para o orquestrador. Todos são `POST` e exigem
o header `x-cron-token: ${CRON_SECRET}`. Sem token válido respondem `401`.

## Endpoints

### `POST /api/cron/cadencia`
Avança a cadência de follow-up dos leads ativos.

- Busca leads cujo `status NOT IN ('convertido','perdido')` e cujo
  `meta_cadencia.proximo_em` já venceu (ou `meta_cadencia` vazio).
- Avança o `passo` da cadência (0..6) e agenda o próximo envio:
  - passo 0 → +24h
  - passo 1 → +48h
  - passo 2 → +5 dias
  - passo 3 → +15 dias
  - passo 4 → +30 dias
  - passo 5 → +30 dias
  - passo 6 → arquiva como `frio`
- Enfileira tarefa `follow_up` em `fila_tarefas` para o agente `sdr`.

Resposta: `{ ok: true, processados: N, novas_tarefas: N }`.

### `POST /api/cron/maestro`
Ciclo de pensamento do orquestrador.

- Coleta estado: leads por status, imóveis ativos, aprovações pendentes, fila.
- Se `GEMINI_API_KEY` presente, chama Gemini (`GEMINI_MODEL` ou
  `gemini-2.0-flash-exp`) com `responseMimeType: application/json` para decidir
  até 3 ações `[{agente, tipo, payload, motivo}]`.
- Sem Gemini ou em falha, aplica heurística: leads sem score → SDR qualifica;
  aprovações > 48h → expirar; fila vazia → designer pré-produz.
- Insere cada decisão em `fila_tarefas`, registra ciclo em `maestro_ciclos`
  e atualiza `ultimo_heartbeat` do agente `maestro`.

Resposta: `{ ok: true, decisoes: N, fonte: 'gemini' | 'heuristico' }`.

### `POST /api/cron/aprovacoes-ttl`
Expira aprovações pendentes vencidas.

- `UPDATE approvals SET status='expirada', expirada_em=now()` onde
  `status='pendente' AND expira_em < now()`.

Resposta: `{ ok: true, expiradas: N }`.

## Scheduled Tasks no Coolify

Configurar três tarefas agendadas no painel do Coolify, cada uma chamando
a URL do endpoint com o header `x-cron-token: ${CRON_SECRET}`.

| Endpoint                    | Cron expression  | Frequência     |
|-----------------------------|------------------|----------------|
| `/api/cron/cadencia`        | `*/30 * * * *`   | a cada 30 min  |
| `/api/cron/maestro`         | `*/5 * * * *`    | a cada 5 min   |
| `/api/cron/aprovacoes-ttl`  | `0 * * * *`      | a cada 1 hora  |

Exemplo de comando (cada scheduled task no Coolify):

```
curl -s -X POST https://<dominio>/api/cron/cadencia \
  -H "x-cron-token: $CRON_SECRET"
```

## Pré-requisitos

- Rodar `migrations/005_automacao.sql` no Supabase Studio antes do primeiro
  cron de cadência ou maestro.
- Env vars no Coolify: `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. Opcionais: `GEMINI_API_KEY`, `GEMINI_MODEL`.
