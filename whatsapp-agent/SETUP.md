# WhatsApp Agentic Charles — SETUP

Motor que conecta o WhatsApp do Charles com:
- Cérebro conversacional (Groq Llama 3.3 70B)
- Catálogo Supabase (consulta automática)
- Histórico persistente (`whatsapp_messages`)
- Disparo em lote (broadcast)
- Sync com planilha Google Sheets

## Arquitetura

```
   WhatsApp (chip do Charles)
            │
            ▼
   Evolution API (Coolify)
            │ webhook
            ▼
   whatsapp-agent (este modulo)
            │
            ├─→ Supabase (leads, whatsapp_messages, properties)
            ├─→ Groq (cerebro conversacional)
            └─→ Google Sheets (lista de leads)
```

## Ordem do setup

### 1. Migration do Supabase (1 minuto)

Abrir o **SQL Editor** do Supabase do Charles e rodar `db/migration.sql`. Cria a tabela `whatsapp_messages`, adiciona campos em `leads` e a view `leads_with_last_message`.

### 2. Evolution API no Coolify (5 minutos)

No painel Coolify, criar um novo serviço **Evolution API**:

- **Template:** Docker Image `atendai/evolution-api:latest` (ou usar `+ Add Resource → Public Repository` apontando pra `https://github.com/EvolutionAPI/evolution-api` se preferir build)
- **Porta interna:** `8080`
- **Volume persistente:** `evolution-data` montado em `/evolution/instances` (pra session do baileys sobreviver redeploy)
- **Env vars principais:**
  ```
  AUTHENTICATION_API_KEY=<gerar 32 bytes hex>
  DEL_INSTANCE=false
  PROVIDER_ENABLED=false
  DATABASE_ENABLED=true
  DATABASE_CONNECTION_URI=postgresql://...  (do proprio Postgres do Coolify ou Supabase)
  DATABASE_CONNECTION_CLIENT_NAME=evolution
  CACHE_REDIS_ENABLED=false                    (ok comecar sem)
  WEBHOOK_GLOBAL_URL=                          (deixa vazio, vamos setar via API depois)
  WEBHOOK_GLOBAL_ENABLED=false
  ```
- **Domínio:** `evolution.levimp.com.br` (ou similar — Coolify gera SSL automatico)
- Depois do deploy, anotar a URL pública e a `AUTHENTICATION_API_KEY`.

### 3. Groq API key (1 minuto)

Criar conta gratuita em https://console.groq.com → API Keys → Create. Plano free tem rate limit generoso (30 req/min, 14400 req/dia).

### 4. Service Account do Google Sheets (5 minutos)

1. Google Cloud Console → criar projeto (ou usar existente)
2. **APIs & Services → Library → Google Sheets API → Enable**
3. **IAM & Admin → Service Accounts → Create Service Account**
   - Nome: `charles-sheets-reader`
   - Sem permissões IAM (não precisa)
4. Na conta criada → **Keys → Add Key → JSON** → baixa o JSON
5. **Compartilhar a planilha** com o e-mail do Service Account (algo tipo `charles-sheets-reader@projeto-x.iam.gserviceaccount.com`) com permissão **Leitor**
6. Pegar o ID da planilha (no URL: `docs.google.com/spreadsheets/d/<ID>/edit`)

### 5. Deploy do `whatsapp-agent` no Coolify (3 minutos)

No mesmo projeto Charles Nobre no Coolify, **+ Add Resource → Private Repository (GitHub App)**:

- Repo: `levimpantarotto-commits/charles-nobre-corretor`
- Branch: `main`
- Build Pack: **Dockerfile**
- Base Directory: `/whatsapp-agent`
- Porta interna: `3030`
- Persistent storage: não precisa (estado vive no Supabase)
- Env vars (todas as do `.env.example`):
  ```
  EVOLUTION_API_URL=https://evolution.levimp.com.br
  EVOLUTION_API_KEY=<key do passo 2>
  EVOLUTION_INSTANCE_NAME=charles-nobre
  WEBHOOK_TOKEN=<gerar 32 bytes hex>

  SUPABASE_URL=<mesmo do Charles>
  SUPABASE_SERVICE_ROLE_KEY=<mesmo do Charles>

  GROQ_API_KEY=<do passo 3>
  GROQ_MODEL=llama-3.3-70b-versatile

  GOOGLE_SERVICE_ACCOUNT_JSON=<conteudo do JSON do passo 4, base64 ou inline>
  GOOGLE_SHEETS_LEADS_ID=<ID do passo 4>
  GOOGLE_SHEETS_LEADS_RANGE=Leads!A:F

  CHARLES_NOME=Charles R. Nobre
  CHARLES_CRECI=37177
  CHARLES_WHATSAPP=+5548999459527
  CHARLES_REGIAO=Imbituba, Garopaba e Imaruí (SC)
  ```

- Habilitar **Auto Deploy** no webhook do GitHub (igual fizemos no LMP).

### 6. Pareamento do WhatsApp (2 minutos)

Depois que o serviço estiver up, abrir terminal e:

```bash
# 6.1 - Criar a instancia + setar webhook
curl -X POST https://wa-agent.levimp.com.br/setup/create-instance \
  -H "x-webhook-token: <WEBHOOK_TOKEN>"

# 6.2 - Pegar o QR code
curl https://wa-agent.levimp.com.br/setup/qr?token=<WEBHOOK_TOKEN>
```

A resposta vem com `qrcode.base64` — colar num decodificador online (ou abrir em browser como `data:image/png;base64,...`) e **escanear com o WhatsApp do Charles** (chip dele no celular):

`WhatsApp → Configurações → Dispositivos conectados → Conectar um dispositivo`

Validar pareamento:

```bash
curl https://wa-agent.levimp.com.br/status -H "x-webhook-token: <WEBHOOK_TOKEN>"
# esperado: { instance: { state: "open" } }
```

### 7. Teste rápido

```bash
# manda mensagem teste pro Levi (numero como E.164 SEM o +)
curl -X POST https://wa-agent.levimp.com.br/send/test \
  -H "x-webhook-token: <WEBHOOK_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"5548999999999"}'
```

Deve chegar no WhatsApp do Levi: `[teste] WhatsApp Agentic Charles online.`

### 8. Importar leads da planilha

No Coolify, no painel do serviço → **Terminal**:

```bash
npm run sync-sheets
```

Espera ver `inseridos: N | atualizados: N | pulados: N`.

### 9. Broadcast inicial

**Sempre** rodar primeiro em DRY_RUN pra ver quantos vai disparar:

```bash
DRY_RUN=1 npm run broadcast
```

Se OK, dispara de verdade:

```bash
BROADCAST_LIMIT=10 npm run broadcast    # comeca com 10 pra testar
```

Pausa entre envios padrão: 3.5s (anti-ban WhatsApp). Pra ajustar: `BROADCAST_DELAY_MS=5000`.

### 10. Conversa automática

A partir desse ponto, qualquer **resposta** que chegar ao WhatsApp do Charles vai automaticamente:
1. Cair no webhook → handler
2. Buscar/criar lead no DB
3. Salvar mensagem
4. Consultar histórico + catálogo
5. Chamar Groq → gerar resposta
6. Enviar de volta via Evolution

## Endpoints do agent

| Endpoint | Auth | Função |
|---|---|---|
| `GET /health` | público | Healthcheck |
| `GET /status` | token | Estado da instância Evolution (open/connecting/close) |
| `POST /setup/create-instance` | token | Cria instância no Evolution e seta webhook |
| `GET /setup/qr` | token | Retorna QR code pra parear |
| `POST /webhook/evolution` | token (query) | Recebe eventos da Evolution (msg recebida etc.) |
| `POST /send` | token | Envio manual `{ phone, text, leadId }` |
| `POST /send/test` | token | Manda mensagem teste de validação |

## Scripts

| Script | O que faz |
|---|---|
| `npm run sync-sheets` | Importa Google Sheets → tabela `leads` |
| `npm run broadcast` | Dispara msg inicial pra leads pendentes (template em `BROADCAST_TEMPLATE`) |
| `npm run test-groq` | Smoke test do cérebro (com catálogo real) |
| `npm start` | Sobe o servidor |
| `npm run dev` | Sobe com `--watch` (auto-reload) |

## Tópicos avançados (futuro)

- **Áudios:** Evolution baixa áudio via `/chat/getBase64FromMediaMessage`. Transcrever com Whisper (Groq tem) e mandar pro Groq como texto.
- **Imagens enviadas pelo lead:** mesmo padrão, descrição via vision model.
- **Painel no /admin do site:** lista de conversas em tempo real, intervenção humana, kanban WhatsApp.
- **Multi-tenant:** mesmo motor pode atender Igor, Laudo Prev etc. via `INSTANCE_NAME` diferente.
- **Opt-out:** quando o lead responder "PARAR" / "SAIR", setar `whatsapp_status='opt_out'` e nunca mais mandar.

## Segurança

- `WEBHOOK_TOKEN` é o que separa requests legítimas das maliciosas. Trocar 1x/mês.
- `EVOLUTION_API_KEY` dá acesso total ao WhatsApp pareado. Trocar se vazar.
- O JSON do Service Account tem acesso de leitura à planilha. Trocar a chave (não o JSON) se vazar.
- Rate-limit anti-ban: nunca mandar > 100 mensagens/hora em conta nova. Aquecer a conta enviando antes pra contatos conhecidos.
