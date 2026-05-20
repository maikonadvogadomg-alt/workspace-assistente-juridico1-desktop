# SK Jurídico IA — Manual Completo v1.3.0

**Versão:** 1.3.0 · **Data:** Maio 2026 · **Público:** Advogados e operadores do sistema

> Assistente jurídico com inteligência artificial para advogados brasileiros.
> Gera petições, minutas e documentos jurídicos com formatação ABNT automática.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Instalação Local (sem Replit)](#3-instalação-local-sem-replit)
4. [Variáveis de Ambiente](#4-variáveis-de-ambiente)
5. [Como Usar o Assistente Principal](#5-como-usar-o-assistente-principal)
6. [Uso de Ementas como Referência para IA](#6-uso-de-ementas-como-referência-para-ia)
7. [Importação de Arquivos (PDF, DOCX, TXT)](#7-importação-de-arquivos-pdf-docx-txt)
8. [Editor TipTap — Preservação de Formatação](#8-editor-tiptap--preservação-de-formatação)
9. [Formatação ABNT Automática](#9-formatação-abnt-automática)
10. [Exportação para Word (DOCX)](#10-exportação-para-word-docx)
11. [Busca de Jurisprudência — DataJud CNJ](#11-busca-de-jurisprudência--datajud-cnj)
12. [Biblioteca de Ementas](#12-biblioteca-de-ementas)
13. [Histórico de Gerações de IA](#13-histórico-de-gerações-de-ia)
14. [Assistente de Código Web](#14-assistente-de-código-web)
15. [Painel Administrativo](#15-painel-administrativo)
16. [Configurações — Chaves de API](#16-configurações--chaves-de-api)
17. [Google Drive — Envio de Documentos](#17-google-drive--envio-de-documentos)
18. [PWA — Instalação no Celular/Desktop](#18-pwa--instalação-no-celulardesktop)
19. [Proteção por Senha](#19-proteção-por-senha)
20. [Capacitor — Build Android/iOS](#20-capacitor--build-androidios)
21. [Referência Completa da API](#21-referência-completa-da-api)
22. [Novidades v1.1.0 e v1.2.0](#22-novidades-v110-e-v120)
23. [Roadmap Futuro](#23-roadmap-futuro)

---

## 1. Visão Geral

O **SK Jurídico** é um assistente jurídico com IA voltado para advogados brasileiros. Ele gera petições, minutas, pareceres e outros documentos jurídicos com formatação ABNT automática, usando modelos de linguagem como Gemini, OpenAI, Groq, Perplexity e qualquer provedor compatível com OpenAI.

**Funcionalidades principais:**
- Geração de documentos jurídicos com IA (streaming em tempo real)
- Editor TipTap v3 com formatação ABNT — preserva estilos ao editar
- Importação de PDF, DOCX, HTML, XML, TXT (até 150 MB)
- Exportação para DOCX
- Busca de jurisprudência no DataJud CNJ
- Biblioteca de ementas salvas (usadas como referência direta pela IA)
- Histórico de gerações
- Assistente de código web (HTML/CSS/JS com preview)
- Envio de documento para Google Drive com um clique
- Painel administrativo com variáveis de ambiente, SQL console e rotas da API
- Rate limiting (300 req/min geral, 30 req/min IA)
- Compressão gzip automática
- PWA instalável no celular e desktop

---

## 2. Estrutura de Pastas

```
sk-juridico/
├── artifacts/
│   ├── api-server/                # Backend Express 5 (porta 8080)
│   │   ├── src/
│   │   │   ├── app.ts             # Entry point, middlewares, sessão, rate limit, gzip
│   │   │   ├── storage.ts         # Camada de dados (PostgreSQL + fallback memória)
│   │   │   ├── local-config.ts    # Config local em arquivo JSON (chaves de API)
│   │   │   └── routes/
│   │   │       ├── ai.ts          # Streaming SSE de IA (/api/ai/*)
│   │   │       ├── upload.ts      # Upload PDF/DOCX/HTML/TXT 150MB (/api/upload/*)
│   │   │       ├── crud.ts        # CRUD genérico (/api/ementas, /api/snippets, etc.)
│   │   │       ├── settings.ts    # Configurações, auth, DB, Drive, env (/api/settings/*)
│   │   │       ├── jurisprudencia.ts  # DataJud CNJ (/api/jurisprudencia/*)
│   │   │       └── extra.ts       # JWT, exportação, pesquisa web (/api/export/*, etc.)
│   │   ├── build.mjs              # Build esbuild (bundle CJS)
│   │   └── package.json
│   │
│   └── assistente-juridico/       # Frontend React + Vite (porta dinâmica)
│       ├── public/
│       │   ├── manifest.json      # PWA manifest
│       │   ├── sw.js              # Service Worker v2 (cache offline)
│       │   ├── icon-192.png       # Ícone PWA 192×192
│       │   ├── icon-512.png       # Ícone PWA 512×512
│       │   └── favicon.svg
│       ├── src/
│       │   ├── pages/
│       │   │   ├── legal-assistant.tsx  # Página principal (editor + IA)
│       │   │   ├── configuracoes.tsx    # Configurações de chaves e banco
│       │   │   ├── jurisprudencia.tsx   # Busca DataJud
│       │   │   ├── ementas.tsx          # Biblioteca de ementas
│       │   │   ├── historico.tsx        # Histórico de IA
│       │   │   ├── codigo.tsx           # Assistente de código web
│       │   │   └── admin.tsx            # Painel administrativo
│       │   ├── components/
│       │   │   ├── tiptap-editor.tsx    # Editor TipTap v3 (único editor)
│       │   │   └── theme-toggle.tsx     # Alternador claro/escuro
│       │   └── lib/
│       │       └── legal-formatter.ts   # Conversor ABNT: texto → HTML
│       └── index.html
│
├── lib/
│   └── db/src/schema/index.ts     # Schema do banco (source of truth)
│
├── MANUAL.md                      # Este manual
└── .env.example                   # Variáveis de ambiente exemplo
```

---

## 3. Instalação Local (sem Replit)

### Pré-requisitos
- Node.js 20+ (recomendado 24)
- pnpm 9+
- PostgreSQL 14+ (ou Neon/Supabase gratuitos)

### Passo a passo

```bash
# 1. Clonar / extrair o ZIP
unzip assistente-juridico-v1.2.0.tar.gz
cd sk-juridico

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais (veja seção 4)

# 4. Inicializar o banco de dados
pnpm --filter @workspace/db run push

# 5. Build do backend
pnpm --filter @workspace/api-server run build

# 6. Iniciar backend (terminal 1)
PORT=8080 BASE_PATH=/api node artifacts/api-server/dist/index.js

# 7. Iniciar frontend (terminal 2)
pnpm --filter @workspace/assistente-juridico run dev

# 8. Abrir no navegador
# http://localhost:5173
```

### Produção (com PM2)

```bash
# Build frontend
pnpm --filter @workspace/assistente-juridico run build
# O build fica em artifacts/assistente-juridico/dist/

# Servir com qualquer servidor estático (nginx, serve, etc.)
npx serve artifacts/assistente-juridico/dist -p 3000

# Backend com PM2
pm2 start "PORT=8080 node artifacts/api-server/dist/index.js" --name sk-juridico-api
```

### Proxy (nginx) — Exemplo

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # Para streaming SSE (IA)
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    location / {
        root /caminho/para/artifacts/assistente-juridico/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 4. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```env
# ─── Banco de Dados ────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require

# Neon (gratuito): https://neon.tech → criar projeto → copiar connection string
# Supabase (gratuito): https://supabase.com → Settings → Database → URI

# ─── Sessão ────────────────────────────────────────────────────────────────────
SESSION_SECRET=mude-para-um-valor-secreto-aleatorio-longo

# ─── Portas (opcional, padrão abaixo) ──────────────────────────────────────────
PORT=8080
NODE_ENV=production
```

**Chaves de API** são configuradas pela interface (Configurações → Chaves de API) e ficam salvas no banco de dados. Nunca precisam ir para o `.env`.

---

## 5. Como Usar o Assistente Principal

1. **Cole o texto** do processo, contrato ou qualquer documento jurídico no campo de entrada à esquerda.
2. **Escolha uma ação**:
   - **Corrigir Texto** — corrige gramática e estilo
   - **Redação Jurídica** — eleva para padrão de tribunal superior
   - **Verificar Lacunas** — aponta omissões e pontos a complementar
   - **Resumir** — gera resumo estruturado
   - **Revisar** — análise crítica com sugestões
   - **Refinar** — reescreve com linguagem mais técnica
   - **Gerar Minuta** — gera petição completa (mínimo 15 páginas)
   - **Analisar** — análise de riscos, teses e jurisprudência aplicável
   - **Linguagem Simples** — traduz para cliente leigo
3. **Clique em "Gerar com IA"** — o documento aparece no editor à direita com formatação ABNT.
4. **Refine via chat** — use o painel de chat abaixo do resultado para dar instruções de ajuste.
5. **Exporte para Word** — clique no ícone de download para baixar o DOCX.

### Modos de IA disponíveis
| Modo | Modelo | Uso |
|------|--------|-----|
| Econômico | Gemini 2.5 Flash | Rápido, gratuito, bom para textos simples |
| Premium | Gemini 2.5 Pro | Melhor qualidade, gratuito com limites |
| Pesquisa Web | Perplexity Sonar | Busca informações atuais na internet |
| Custom/Demo | Qualquer OpenAI-compatible | Groq, Together, OpenRouter, xAI, etc. |

---

## 6. Uso de Ementas como Referência para IA

Esta é uma das funcionalidades mais poderosas do sistema. Ementas salvas na biblioteca podem ser enviadas diretamente para a IA como jurisprudência de referência.

### Como funciona (v1.2.0 — CORRIGIDO)

1. **Vá para a aba "Ementas"** no painel da direita
2. **Selecione as ementas** clicando nos cartões — uma marca azul aparece
3. As ementas selecionadas aparecem em um banner abaixo do cabeçalho
4. Ao clicar em "Gerar com IA", as ementas são **injetadas diretamente no prompt** do usuário com a instrução: *"CITE-AS LITERALMENTE NA SEÇÃO DA JURISPRUDÊNCIA"*
5. O documento gerado incluirá as ementas na seção "DA JURISPRUDÊNCIA"

### Correção aplicada v1.2.0

O sistema anterior adicionava as ementas apenas ao *system prompt*, onde podiam ser ignoradas pelo modelo. Agora são injetadas também no *user prompt* com marcação explícita, garantindo que o modelo as utilize e as cite literalmente.

### Dicas

- Salve ementas com categoria clara ("STJ", "STF", "TRT-SP") para filtrar rapidamente
- Use o botão "Importar da Área de Transferência" para colar ementas copiadas de sites jurídicos
- A busca no DataJud CNJ tem botão "Salvar Ementa" direto no resultado

---

## 7. Importação de Arquivos (PDF, DOCX, TXT)

### Painel de entrada (área de texto)

Clique em **"Arquivo"** no painel esquerdo para importar:
- **PDF**: extração de texto via pdfjs-dist (funciona em PWA e desktop)
- **DOCX**: extração via mammoth
- **TXT, HTML, XML**: leitura direta

Limite: **50 MB por arquivo** no upload principal; até **150 MB** via endpoint direto.

### Resultado do editor

Clique no ícone de **upload** na barra do resultado para importar um arquivo formatado diretamente para o editor TipTap. O HTML/DOCX será inserido com formatação preservada.

### Comportamento no PWA (v1.2.0 — CORRIGIDO)

- Flash azul/branco ao abrir o seletor de arquivos: **corrigido** com `background-color` explícito no HTML e CSS
- Service Worker atualizado (v2) com melhor tratamento de foco/retomada do app
- Ícone apple-touch-icon agora usa o PNG real (192×192) em vez do SVG

---

## 8. Editor TipTap — Preservação de Formatação

### v1.2.0 — Melhorias

O editor TipTap v3 foi aprimorado para:

1. **Não destruir a formatação original** ao editar
   - Atributo `style` armazena propriedades ABNT separadas do `text-align`
   - `TextAlign` cuida do alinhamento; `StyledParagraph` cuida do recuo, espaçamento, negrito, etc.

2. **Herdar formatação ao pressionar Enter** (`keepOnSplit: true`)
   - Ao pressionar Enter em um parágrafo com `text-indent: 4cm`, o novo parágrafo herda o mesmo estilo
   - Ao pressionar Enter em um título em caixa alta, o próximo título mantém a formatação

3. **Sem conflito com TextAlign**
   - A extensão `TextAlign` usa `defaultAlignment: "justify"` como padrão
   - `StyledParagraph` filtra `text-align` do atributo `style` para evitar duplicatas

### Barra de ferramentas

| Botão | Função |
|-------|--------|
| **N** | Negrito |
| *I* | Itálico |
| U | Sublinhado |
| Realce | Marca-texto |
| Tamanho | Fonte de 10px a 48px |
| ←/↔/→/≡ | Alinhamento esquerda/centro/direita/justificado |
| H1/H2/H3 | Títulos |
| Tabela | Inserir/gerenciar tabelas |
| Link | Inserir links |

---

## 9. Formatação ABNT Automática

Quando a IA gera um documento, o texto passa automaticamente por `plainTextToLegalHtml()` que converte cada parágrafo para HTML com estilos ABNT:

### Regras de formatação (v1.2.0 — CORRIGIDAS)

| Tipo de parágrafo | Estilo aplicado |
|-------------------|-----------------|
| Títulos de seção (DOS FATOS, DO DIREITO, etc.) | `text-align: justify; font-weight: bold; text-transform: uppercase; text-indent: 0` |
| EXMO./EXCELENTÍSSIMO (endereçamento) | `text-align: justify; font-weight: bold; text-transform: uppercase; text-indent: 0` |
| Parágrafos normais | `text-align: justify; text-indent: 4cm; line-height: 1.5` |
| Citações (EMENTA:, entre aspas) | `margin-left: 4cm; margin-right: 4cm; font-size: 10pt; line-height: 1.2; font-style: italic` |
| Data e local | `text-align: right; text-indent: 0` |
| Nestes termos / Pede deferimento | `text-align: justify; text-indent: 0` |

### Bug corrigido v1.2.0

O `legal-formatter.ts` tinha bug onde **ambas as ramas** do ternário de alinhamento retornavam `text-align: center`. Corrigido: títulos de seção agora usam `text-align: justify` conforme ABNT.

---

## 10. Exportação para Word (DOCX)

Clique no ícone **"Word"** (W) na barra do resultado. O arquivo DOCX é gerado no servidor com:
- Formatação ABNT (margens 3cm/2cm/3cm/2cm)
- Fonte Times New Roman 12pt
- Espaçamento 1.5
- Cabeçalho com dados do escritório (configurável em Configurações → Template Word)

---

## 11. Busca de Jurisprudência — DataJud CNJ

Acesse pela aba **"Jurisprudência"** na barra de navegação.

1. Digite termo de busca (ex: "responsabilidade civil dano moral")
2. Filtre por tribunal (STJ, STF, TRT, TJ-SP, etc.)
3. Clique no resultado para expandir a ementa completa
4. **Salvar Ementa**: salva na biblioteca para uso como referência na IA
5. **Usar no Texto**: insere no campo de entrada
6. **Resumir com IA**: gera resumo em 3-5 linhas

Requer chave de API do DataJud CNJ (gratuita em https://datajud-wiki.cnj.jus.br/api-publica/acesso).

---

## 12. Biblioteca de Ementas

Acesse pela aba **"Ementas"** no painel direito da página principal.

### Adicionar ementa manualmente
1. Clique em **"+ Nova Ementa"**
2. Preencha: Título, Categoria, Texto da ementa
3. Clique em **Salvar**

### Importar da área de transferência
Copie o texto da ementa e clique em **"Colar da Área de Transferência"**.

### Importar arquivo
Abra uma ementa salva (.txt, .pdf) pelo botão de arquivo.

### Selecionar para uso na IA
Clique no cartão da ementa para selecioná-la (borda azul). Selecione quantas quiser. Ao gerar com IA, as ementas selecionadas serão citadas no documento.

---

## 13. Histórico de Gerações de IA

Acesse em **Histórico** no menu. Guarda as últimas gerações com:
- Texto de entrada (primeiros 300 caracteres)
- Ação utilizada
- Resultado completo
- Data e hora

Clique em um item para carregar o resultado no editor.

---

## 14. Assistente de Código Web

Acesse em **Códigos** no menu. Permite gerar HTML/CSS/JavaScript com IA e pré-visualizar em tempo real.

Útil para:
- Criar calculadoras jurídicas
- Gerar formulários para clientes
- Criar landing pages para escritório

---

## 15. Painel Administrativo

Acesse em **/admin** ou pelo link "Painel Admin" em Configurações.

### Funcionalidades

| Seção | Descrição |
|-------|-----------|
| Dashboard | Banco (conectado/offline), Node.js versão, Uptime, RAM usada |
| Variáveis de Ambiente | Lista todas as variáveis (valores sensíveis mascarados) |
| Definir Variável | Salva no arquivo de config local sem reiniciar o servidor |
| Console SQL | Execute queries SELECT no banco (somente leitura) |
| Rotas da API | Lista todas as rotas documentadas com método e descrição |

### Segurança
- O painel não requer autenticação separada mas é acessível apenas localmente
- Em produção, proteja `/admin` com autenticação no nginx ou coloque atrás de VPN

---

## 16. Configurações — Chaves de API

Acesse em **Configurações** no menu.

| Campo | Descrição | Onde obter |
|-------|-----------|------------|
| Google Gemini API Key | Chave para modelos Gemini | aistudio.google.com (gratuito) |
| OpenAI API Key | Chave para GPT-4, etc. | platform.openai.com |
| Groq API Key | Chave Groq (LLaMA ultra-rápido) | console.groq.com (gratuito) |
| Perplexity API Key | Pesquisa em tempo real | perplexity.ai/settings/api |
| Custom/Demo Key | Qualquer provedor OpenAI-compatible | Varia |
| DataJud CNJ Key | Busca de jurisprudência | datajud-wiki.cnj.jus.br |
| Google Drive Token | Token OAuth2 para envio ao Drive | console.cloud.google.com |
| Google Drive Folder ID | ID da pasta de destino no Drive | URL da pasta no Drive |

As chaves ficam salvas no banco de dados, nunca em variáveis de ambiente ou código.

---

## 17. Google Drive — Envio de Documentos

1. Configure **Google Drive Access Token** e **Google Drive Folder ID** em Configurações
2. No editor de resultado, clique no botão **"Drive"** (ícone verde) no cabeçalho
3. O documento HTML é convertido e enviado para a pasta configurada
4. Um link do arquivo no Drive é retornado

### Como obter o Token OAuth2
```
1. Acesse console.cloud.google.com
2. Crie um projeto → APIs e Serviços → Credenciais
3. Crie uma credencial OAuth 2.0 (tipo: Web App)
4. Use o OAuth Playground (oauth.client.google) para obter o token
5. Escopo necessário: https://www.googleapis.com/auth/drive.file
```

---

## 18. PWA — Instalação no Celular/Desktop

### Android (Chrome)
1. Acesse o app no Chrome
2. Toque no menu (3 pontos) → "Adicionar à tela inicial"
3. Ou aguarde o banner automático de instalação

### iOS (Safari)
1. Acesse o app no Safari
2. Toque em Compartilhar (quadrado com seta) → "Adicionar à tela inicial"

### Desktop (Chrome/Edge)
1. Clique no ícone de instalação na barra de endereços
2. Ou menu → "Instalar SK Jurídico"

### Comportamento offline
O Service Worker (v2) armazena os assets estáticos em cache. Sem internet:
- A interface carrega normalmente
- As chamadas de IA falham (precisam de internet)
- Documentos já gerados ficam disponíveis via localStorage

---

## 19. Proteção por Senha

O app suporta proteção por senha configurada em Configurações → Segurança.

A sessão é mantida por 7 dias. Chave armazenada via `SESSION_SECRET`.

---

## 20. Capacitor — Build Android/iOS

```bash
# 1. Build do frontend
pnpm --filter @workspace/assistente-juridico run build

# 2. Inicializar Capacitor (apenas na primeira vez)
npx cap init "SK Juridico" "br.adv.skjuridico"

# 3. Adicionar plataforma
npx cap add android
# ou: npx cap add ios

# 4. Copiar build para Capacitor
npx cap copy

# 5. Sincronizar plugins
npx cap sync

# 6. Abrir no Android Studio / Xcode
npx cap open android
# ou: npx cap open ios
```

**Importante**: Em `capacitor.config.ts`, configure:
```ts
{
  appId: "br.adv.skjuridico",
  appName: "SK Jurídico",
  webDir: "dist",
  server: { url: "https://seu-backend.com" }
}
```

---

## 21. Referência Completa da API

### Base URL
- Desenvolvimento: `http://localhost:8080`
- Produção (Replit): `https://[seu-repl].replit.app/api`

### Autenticação
Sessão via cookie (`express-session`). A maioria das rotas requer sessão autenticada (senha configurada em Configurações).

---

### 21.1 IA — `/api/ai`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/ai/process` | Gera documento jurídico (SSE streaming) |
| POST | `/api/ai/refine` | Refina documento existente via chat (SSE streaming) |
| POST | `/api/ai/voice-query` | Consulta jurídica por voz (resposta JSON) |
| POST | `/api/ai/code` | Gera código HTML/CSS/JS (SSE streaming) |
| POST | `/api/ai/code-refine` | Refina código existente (SSE streaming) |
| POST | `/api/ai/translate` | Tradução de texto jurídico |
| POST | `/api/ai/analyze-risk` | Análise de riscos contratuais |
| POST | `/api/ai/suggest-actions` | Sugere próximas ações processuais |

**POST `/api/ai/process`** — Corpo:
```json
{
  "text": "texto do documento",
  "action": "minuta|resumir|revisar|refinar|analisar|simplificar|modo-estrito|modo-redacao",
  "customActionId": "id-do-modelo-personalizado (opcional)",
  "ementaIds": ["uuid1", "uuid2"],
  "model": "economico|premium|perplexity|custom",
  "effortLevel": 3,
  "verbosity": "longa|curta",
  "perplexityKey": "pplx-...",
  "customKey": "...",
  "customUrl": "https://...",
  "customModel": "llama-3.3-70b-versatile"
}
```

**Resposta**: SSE (`text/event-stream`)
```
data: {"type":"chunk","content":"texto..."}
data: {"type":"done"}
data: {"type":"error","message":"..."}
```

---

### 21.2 Upload — `/api/upload`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/upload/extract-text` | Extrai texto de PDF/DOCX/HTML/TXT |
| POST | `/api/import/url` | Extrai texto de URL da web |

**POST `/api/upload/extract-text`** — `multipart/form-data`, campo `files[]`  
Limite: 150 MB por arquivo.  
Tipos suportados: `.pdf`, `.docx`, `.txt`, `.html`, `.xml`, `.odt`, `.rtf`

**Resposta**:
```json
{ "text": "conteúdo extraído...", "filename": "doc.pdf", "pages": 12 }
```

---

### 21.3 CRUD — Dados do usuário

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/ementas` | Lista todas as ementas |
| POST | `/api/ementas` | Cria nova ementa |
| PATCH | `/api/ementas/:id` | Atualiza ementa |
| DELETE | `/api/ementas/:id` | Remove ementa |
| GET | `/api/snippets` | Lista snippets de texto |
| POST | `/api/snippets` | Cria snippet |
| PATCH | `/api/snippets/:id` | Atualiza snippet |
| DELETE | `/api/snippets/:id` | Remove snippet |
| GET | `/api/custom-actions` | Lista modelos personalizados |
| POST | `/api/custom-actions` | Cria modelo personalizado |
| PATCH | `/api/custom-actions/:id` | Atualiza modelo |
| DELETE | `/api/custom-actions/:id` | Remove modelo |
| GET | `/api/ai-history` | Histórico de gerações (últimas 50) |
| POST | `/api/ai-history` | Salva item no histórico |
| DELETE | `/api/ai-history/:id` | Remove item |
| GET | `/api/prompt-templates` | Lista templates de prompt |
| POST | `/api/prompt-templates` | Cria template |
| PATCH | `/api/prompt-templates/:id` | Atualiza template |
| DELETE | `/api/prompt-templates/:id` | Remove template |
| GET | `/api/doc-templates` | Lista templates de Word |
| POST | `/api/doc-templates` | Cria template Word |
| PATCH | `/api/doc-templates/:id` | Atualiza template Word |
| DELETE | `/api/doc-templates/:id` | Remove template Word |

**Corpo para POST `/api/ementas`**:
```json
{
  "titulo": "Responsabilidade Civil — Dano Moral",
  "categoria": "STJ",
  "texto": "EMENTA: Texto completo da ementa..."
}
```

---

### 21.4 Configurações — `/api/settings`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/settings/app-info` | Versão, uptime, memória, Node.js |
| GET | `/api/settings/db-status` | Status da conexão com o banco |
| POST | `/api/settings/db-test` | Testa uma URL de banco personalizada |
| POST | `/api/settings/db-init` | Lista tabelas do banco atual |
| GET | `/api/settings/keys` | Lista chaves de API (mascaradas) |
| POST | `/api/settings/keys` | Salva chave de API |
| DELETE | `/api/settings/keys/:name` | Remove chave de API |
| GET | `/api/settings/tts` | Configurações de TTS |
| POST | `/api/settings/tts` | Atualiza configurações de TTS |
| POST | `/api/settings/tts/test` | Testa síntese de voz |
| GET | `/api/settings/doc-template` | Template Word atual |
| POST | `/api/settings/doc-template` | Salva template Word |
| GET | `/api/settings/password` | Verifica se senha está configurada |
| POST | `/api/settings/password` | Define/altera senha |
| POST | `/api/settings/login` | Login com senha |
| POST | `/api/settings/logout` | Logout |
| POST | `/api/settings/docx` | Gera arquivo DOCX do HTML fornecido |
| GET | `/api/settings/env-list` | Lista variáveis de ambiente (mascaradas) |
| POST | `/api/settings/env-set` | Define variável na config local |
| POST | `/api/settings/db-query` | Executa SELECT no banco |
| POST | `/api/settings/drive-upload` | Envia arquivo para Google Drive |

**GET `/api/settings/app-info`** — Resposta:
```json
{
  "version": "1.0.0",
  "nodeVersion": "v24.13.0",
  "platform": "linux",
  "uptime": 3600,
  "memoryMB": 148,
  "databaseUrl": true
}
```

**POST `/api/settings/drive-upload`** — Corpo `multipart/form-data`:
- `file`: arquivo a enviar
- `folderId` (opcional): ID da pasta
- `accessToken` (opcional): token OAuth2

---

### 21.5 Jurisprudência — `/api/jurisprudencia`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/jurisprudencia/buscar` | Busca no DataJud CNJ |

**POST `/api/jurisprudencia/buscar`** — Corpo:
```json
{
  "query": "dano moral responsabilidade civil",
  "tribunais": ["STJ", "STF"],
  "pagina": 1,
  "tamanho": 10
}
```

---

### 21.6 Exportação e Extras — `/api/export`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/export/docx` | Gera DOCX do HTML |
| POST | `/api/export/pdf` | Gera PDF (via html-pdf) |
| GET | `/api/export/health` | Health check |

---

## 22. Novidades por Versão

### v1.3.0 (Maio 2026) — Mega-melhoria

#### Novas funcionalidades

| # | Funcionalidade | Descrição |
|---|---------------|-----------|
| 1 | **Auto-Detect de chaves** | Cole qualquer chave → sistema detecta provedor pelo prefixo (AIza, sk-ant-, gsk_, pplx-, xai-, etc.) |
| 2 | **9 provedores de IA** | +Anthropic (Claude), Groq (grátis), OpenRouter, xAI (Grok), Together AI, Mistral |
| 3 | **OCR de imagens** | Google Vision API para JPG, PNG, TIFF, WebP — extração de texto de documentos digitalizados |
| 4 | **60+ tribunais** | DataJud em paralelo — STF, STJ, TST, TSE, STM, TRF1-6, TRT1-24, todos os 27 TJs |
| 5 | **Busca IA jurisprudência** | Análise e síntese de teses jurisprudenciais via IA com SSE streaming |
| 6 | **Template DOCX fixado** | Cabeçalho do template DB aplicado corretamente na exportação; HTML→DOCX preserva bold/italic |
| 7 | **SyncStorage (IndexedDB)** | Persistência local robusta com fallback automático localStorage |
| 8 | **Integrações judiciais** | e-SAJ, PROJUDI, SEEU, eProc, PJud — rotas e UI de configuração |
| 9 | **Capacitor APK** | `capacitor.config.ts` completo para build Android sem dependência Replit |
| 10 | **DB Panel completo** | Query SQL, listar tabelas, reconexão, teste URL, guia Neon |
| 11 | **RTF, ODT, EPUB** | Novos formatos na importação (adm-zip para ODT/EPUB, regex para RTF) |
| 12 | **Transcrição áudio/vídeo** | Whisper via OpenAI/Groq para MP3, MP4, WAV, OGG, WebM |
| 13 | **Endpoint `/upload/ocr`** | OCR dedicado — aceita base64 ou URL de imagem |
| 14 | **`trust proxy`** | Express configurado para confiar no proxy Replit (fix ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) |

#### Melhorias

| # | Item | Detalhes |
|---|------|---------|
| 1 | **Dark mode verde-oliva** | Tema profissional HSL(100,14%,9%) fundo; HSL(82,52%,44%) destaque; alto contraste |
| 2 | **TipTap preserva formatação** | `p[style]` respeita inline exatamente; `p:not([style])` recebe ABNT padrão; removido `text-indent-[inherit]` bug |
| 3 | **Mobile** | Botões `min-h-11`, CSS responsivo, barra lateral colapsável |
| 4 | **Upload encoding** | Detecção UTF-8/Latin-1 automática; multiplos arquivos simultâneos |
| 5 | **Configurações 7 abas** | Auto-Detect · Chaves IA · Custom/Groq · Banco DB · Tribunais · OCR/Drive · Segurança |
| 6 | **Detecção MIME robusta** | PDF, DOCX, imagem pela extensão + magic bytes quando Content-Type incorreto |

#### Correções

| # | Problema | Correção |
|---|----------|----------|
| 1 | CSS `text-indent-[inherit]` destruía recuo ABNT | Removido do TipTap className |
| 2 | Export DOCX sem formatação | `htmlToDocxParagraphs()` processa HTML completo com detecção de títulos, datas, fechos, citações |
| 3 | `integracoes.ts` não registrada | Adicionada ao `routes/index.ts` |
| 4 | Rate-limit warning no log | `app.set("trust proxy", 1)` adicionado antes do rateLimit |
| 5 | Detecção de tipos na importação | MIME + extensão + magic bytes para PDF, DOCX, imagens |

---

### v1.2.0 (Maio 2026)

| # | Problema | Correção |
|---|----------|----------|
| 1 | Tela azul/branca ao importar arquivo no PWA | `background-color` explícito; SW v2 |
| 2 | Ementas não reconhecidas pela IA | Injeção direta no user prompt |
| 3 | Cabeçalho centralizado em vez de justificado | Bug no `legal-formatter.ts` linha 70 corrigido |
| 4 | Recuo 4cm com conflito | `StyledParagraph` separa `text-indent` do `text-align` |
| 5 | Formatação perdida ao pressionar Enter | `keepOnSplit: true` no atributo `style` |
| 6 | Apple-touch-icon SVG | Corrigido para `icon-192.png` |

### v1.1.0 (Maio 2026)

- Botão Google Drive no cabeçalho
- Painel Administrativo (`/admin`)
- Ícones PWA reais 192×192 e 512×512
- Rate limiting (300/min geral, 30/min IA)
- Compressão gzip automática
- Novos endpoints: `env-list`, `env-set`, `db-query`, `drive-upload`

---

## 23. Roadmap Futuro

- Push notifications para prazos processuais (Firebase Cloud Messaging)
- Modo multi-usuário com autenticação JWT e perfis de escritório
- Monitoramento de saúde com health checks externos (Uptime Robot)
- Build Capacitor automatizado via CI/CD (GitHub Actions)
- Sincronização de documentos entre dispositivos (Drive API completa)
- Assinatura digital de documentos (ITI, BirdID)
- Integração PJe (TJ-PE, TJ-MA, TRFs via WebService)
- Templates DOCX com variáveis dinâmicas (campos de formulário)
- Modo offline completo com sincronização em background

---

## 24. Referência Rápida de Provedores de IA

| Provedor | Prefixo | Melhor para | Custo |
|---------|---------|------------|-------|
| Google Gemini | `AIza...` | Documentos longos, PT-BR | Grátis |
| Anthropic Claude | `sk-ant-...` | Redação jurídica refinada | Pago |
| Groq | `gsk_...` | Velocidade (Llama 3.3) | **Grátis** |
| OpenAI GPT-4o | `sk-proj-...` | Uso geral, confiável | Pago |
| Perplexity | `pplx-...` | Busca na internet | Pago |
| OpenRouter | `sk-or-...` | 100+ modelos | Variado |
| xAI Grok | `xai-...` | Análise e raciocínio | Pago |
| Together AI | `together-...` | Baixo custo | Pago |
| Mistral | (sem prefixo) | Documentos EU/PT | Pago |
| Ollama/LM Studio | (qualquer) | **100% local, grátis** | Grátis |

---

## 25. Novidades v1.4.0 — Mega-upgrade

### Autenticação JWT + Multi-usuário
- `POST /api/auth/register` — cria conta com nome, email, senha
- `POST /api/auth/login` — retorna JWT válido por 7 dias
- `GET /api/auth/me` — retorna usuário autenticado
- `GET /api/auth/verificar-oab` — verifica número OAB via CFOAB/TJ
- `POST /api/auth/refresh` — renova token expirado

### Prazos Processuais com Push Notifications
- `GET /api/prazos` — lista prazos do usuário (filtros por status, urgência)
- `POST /api/prazos` — cria novo prazo com metadados do processo
- `PUT /api/prazos/:id` — edita prazo existente
- `DELETE /api/prazos/:id` — remove prazo
- `POST /api/prazos/notificar` — dispara notificação manual
- `POST /api/fcm/subscribe` — registra token FCM do dispositivo
- Notificações automáticas 3 dias, 1 dia e no dia do prazo

### Assinatura Digital (BirdID / VIDaaS / ICP-Brasil)
- `POST /api/assinatura/birdid/token` — obtém token BirdID via OAuth2
- `POST /api/assinatura/birdid/assinar` — assina documento com certificado A3 na nuvem
- `POST /api/assinatura/vidaas/assinar` — assina via VIDaaS (Serpro)
- `POST /api/assinatura/verificar` — verifica assinaturas digitais existentes

### PJe — Integração com Tribunal
- `POST /api/pje/login` — autentica no PJe do tribunal
- `POST /api/pje/upload-peticao` — envia petição para processo no PJe
- `GET /api/pje/process/:numero` — consulta dados do processo

### Google Drive — Sincronização Completa
- `GET /api/drive/sync/listar` — lista documentos no Drive
- `POST /api/drive/sync/upload` — sobe documento com metadados jurídicos
- `GET /api/drive/sync/baixar/:fileId` — baixa documento do Drive
- `GET /api/drive/oauth/url` — inicia fluxo OAuth2 para autorização

### Escritório (Multi-usuário)
- Página `/escritorio` — gerencia equipe, plano e permissões
- Perfis: Sócio, Associado, Estagiário, Administrativo
- Cada membro tem suas próprias chaves de API e histórico

### Service Worker v3 + Offline
- Cache offline completo (documentos, prazos, jurisprudência)
- Background Sync para documentos criados offline
- Push notifications via FCM (Firebase Cloud Messaging)
- Instalação PWA melhorada com ícones e splash screen

### Outras Melhorias v1.4.0
- **TipTap v3**: `preserveWhitespace: 'full'` no setContent — formatação ABNT 100% preservada
- **OCR de imagens**: Vision API melhorada + fallback com metadados + guia de alternativas
- **Upload**: Aceita agora JPG, PNG, GIF, WebP, TIFF, BMP, HEIC, ODT, EPUB
- **Mobile**: Tabs horizontais roláveis, textarea sem zoom no iOS, botões maiores
- **SyncStorage**: IndexedDB + localStorage com API unificada para offline
- **Integrações**: e-SAJ, PROJUDI, SEEU, Eproc, PJud — config e status unificados
- **local-config.ts**: FCM, BirdID, VIDaaS, JWT, Drive OAuth2 como campos typed
- **Capacitor APK**: Config completa para Android (SDK 26+) e iOS (14+)

---

## 26. Guia de Integrações Judiciais

### e-SAJ (TJSP, TJBA, TJSC, TJCE)
1. Acesse Configurações → Integrações
2. Informe CPF/Login OAB e senha do e-SAJ
3. Informe o tribunal (ex: `tjsp`)
4. O sistema verificará a conexão automaticamente

### PROJUDI (TJGO, TJPR, TJAM e outros)
1. Acesse Configurações → Integrações
2. Informe CPF/Login OAB e senha PROJUDI
3. Informe o tribunal (ex: `tjgo`)

### SEEU (Execução Penal — DEPEN)
1. Acesse Configurações → Integrações
2. Informe CPF do advogado e senha SEEU
3. Acesse em seeu.mj.gov.br para obter credenciais

### Eproc (TRF1, TRF4 e outros)
1. Acesse Configurações → Integrações
2. Informe CPF e senha Eproc
3. Os tribunais TRF1, TRF4 e TJRS suportam este sistema

### PJud (TJMG, TJMT, TJTO)
1. Acesse Configurações → Integrações
2. Informe CPF e senha PJud

---

## 27. Standalone & APK Android — v1.5.0

### Novidades v1.5.0
- **Aba "Servidor"** em Configurações: configure a URL do backend, teste conexão, execute SQL livre e visualize variáveis de ambiente — tudo sem sair do app.
- **Fetch interceptor global**: qualquer chamada `/api/...` é redirecionada para a URL configurada. Zero mudança de código ao trocar de servidor.
- **Console SQL Admin completo**: INSERT, UPDATE, DELETE, ALTER TABLE, CREATE TABLE — sem restrição de SELECT. Use com responsabilidade.
- **Projeto Android pronto** (`android/`): abra no Android Studio e clique em Build → Generate APK.
- **Sem dependência alguma da Replit**: nenhuma variável de ambiente, SDK, login ou API da Replit é necessária.
- **`vite.config.ts` independente**: PORT e BASE_PATH são opcionais (padrão: 23893 e `/`). Build funciona offline.
- **`docker-compose.yml`**: suba PostgreSQL + backend + frontend nginx em um comando.
- **`.env.example`**: template completo com todas as variáveis documentadas.
- **`Dockerfile.api`** e **`nginx.conf`** incluídos para deploy em qualquer VPS.

---

### Configuração do Servidor no App (APK)

1. Abra o app → Configurações → aba **Servidor**
2. Informe a URL do seu backend, ex.: `http://192.168.1.10:8080` ou `https://meuservidor.com`
3. Clique em **Salvar** e depois em **Testar conexão**
4. Configure suas chaves de IA nas outras abas normalmente

A URL fica salva em `localStorage` e persiste entre sessões. Para voltar ao modo web relativo (sem URL externa), clique em **Limpar**.

---

### Opção A — Docker (mais fácil)

Pré-requisito: Docker e Docker Compose instalados.

```bash
# 1. Extraia o ZIP e entre na pasta
cd sk-juridico

# 2. Configure as variáveis (edite o .env)
cp .env.example .env
nano .env   # ou notepad .env no Windows

# 3. Suba tudo com Docker
docker compose up -d

# 4. Inicialize o banco (apenas primeira vez)
docker exec sk_juridico_api node -e "
  const { checkDbAndInitStorage } = require('./storage.js');
  checkDbAndInitStorage();
"

# 5. Acesse no navegador
# http://localhost
```

---

### Opção B — Manual (sem Docker)

**Pré-requisitos**: Node.js 20+, pnpm, PostgreSQL

```bash
# 1. Instale dependências
pnpm install

# 2. Configure o banco
psql -U postgres -c "CREATE DATABASE sk_juridico;"
psql -U postgres -c "CREATE USER sk_user WITH PASSWORD 'sk_pass';"
psql -U postgres -c "GRANT ALL ON DATABASE sk_juridico TO sk_user;"

# 3. Configure o .env
cp .env.example .env
# Edite DATABASE_URL, SESSION_SECRET, etc.

# 4. Inicialize o schema do banco
pnpm --filter @workspace/db run push

# 5. Inicie o servidor
./scripts/start-servidor.sh

# 6. Sirva o frontend (em outro terminal)
# Opção simples com npx serve:
npx serve artifacts/assistente-juridico/dist/public -p 3000
# Ou configure nginx com nginx.conf incluído
```

---

### Opção C — APK Android

**Pré-requisitos**: Node.js 20+, pnpm, Android Studio com SDK 33+

```bash
# 1. Instale dependências
pnpm install

# 2. Dê permissão de execução ao script
chmod +x scripts/build-apk.sh

# 3. (Opcional) Configure URL do backend
export CAPACITOR_SERVER_URL=http://192.168.1.10:8080

# 4. Execute o script de build
./scripts/build-apk.sh
```

O script irá:
1. Compilar o frontend React (Vite)
2. Sincronizar com o projeto Android (`android/`)
3. Compilar o APK via Gradle (se Android SDK disponível)

Se o Android SDK não estiver instalado:
1. Abra a pasta `android/` no Android Studio
2. Clique em **Build → Generate Signed Bundle/APK → APK**
3. Escolha debug (teste) ou release (produção)
4. Instale o `.apk` no celular

---

### Estrutura do ZIP `sk-juridico-v1.5.0.zip`

```
sk-juridico-v1.5.0.zip
├── android/                    # Projeto Android (Capacitor) — pronto para Android Studio
│   └── app/src/main/assets/public/  # Frontend compilado (já incluído)
├── artifacts/
│   ├── assistente-juridico/
│   │   ├── src/                # Código-fonte React/TypeScript
│   │   └── dist/public/        # Build de produção (pronto para deploy)
│   └── api-server/
│       ├── src/                # Código-fonte Express
│       └── dist/               # Build de produção (index.cjs)
├── lib/db/                     # Schema Drizzle ORM
├── scripts/
│   ├── build-apk.sh            # Script de build do APK
│   └── start-servidor.sh       # Script para iniciar o servidor
├── .env.example                # Template de variáveis de ambiente
├── docker-compose.yml          # PostgreSQL + backend + nginx
├── Dockerfile.api              # Imagem Docker do backend
├── nginx.conf                  # Config nginx com proxy para /api/
├── capacitor.config.ts         # Configuração Capacitor APK
├── package.json                # Dependências pnpm
├── pnpm-lock.yaml              # Lock de dependências
└── MANUAL.md                   # Este manual
```

---

### Admin SQL — Console Completo

Em Configurações → aba **Servidor** → seção "Admin SQL", você pode executar qualquer SQL:

```sql
-- Ver todas as tabelas
SELECT table_name FROM information_schema.tables WHERE table_schema='public';

-- Contar histórico de IA
SELECT COUNT(*) FROM ai_history;

-- Limpar histórico antigo
DELETE FROM ai_history WHERE created_at < NOW() - INTERVAL '30 days';

-- Ver configurações
SELECT * FROM app_settings;

-- Alterar uma configuração
UPDATE app_settings SET value = 'novo_valor' WHERE key = 'gemini_api_key';

-- Ver estrutura de uma tabela
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ai_history' ORDER BY ordinal_position;
```

> **Atenção**: O console admin permite qualquer operação, incluindo DROP TABLE e DELETE sem WHERE. Use com cuidado em produção.

---

### Variáveis de Ambiente — Referência Completa

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PORT` | Não (padrão: 8080) | Porta do servidor backend |
| `DATABASE_URL` | Recomendada | URL de conexão PostgreSQL |
| `SESSION_SECRET` | Sim (produção) | Chave secreta para sessões |
| `GEMINI_API_KEY` | Uma IA obrigatória | Google Gemini |
| `OPENAI_API_KEY` | Opcional | OpenAI GPT-4o |
| `GROQ_API_KEY` | Opcional | Groq (grátis) |
| `PERPLEXITY_API_KEY` | Opcional | Perplexity (busca web) |
| `ANTHROPIC_API_KEY` | Opcional | Claude |
| `OPENROUTER_API_KEY` | Opcional | OpenRouter (100+ modelos) |
| `APP_PASSWORD` | Opcional | Senha de acesso ao app |
| `DATAJUD_API_KEY` | Opcional | DataJud CNJ |
| `JWT_SECRET` | Opcional | Autenticação multi-usuário |
| `FCM_SERVER_KEY` | Opcional | Push notifications |
| `GOOGLE_VISION_API_KEY` | Opcional | OCR de imagens |

Todas as variáveis também podem ser configuradas via interface gráfica em:
- Configurações → **Chaves IA** (chaves de IA)
- Configurações → **Banco DB** (banco de dados)
- Configurações → **Servidor** → Variáveis de Ambiente (lista completa)

---

*SK Jurídico IA v1.5.0 · Maio 2026*
*Stack: React 18 · TipTap v3 · Express 5 · Drizzle ORM · PostgreSQL · Capacitor 8 · esbuild*
*Sem dependência da Replit — 100% standalone*
