# Deploy no EasyPanel (Docker)

Este guia sobe o app **em paralelo** ao deploy atual (Lovable/Cloudflare).
Nada do projeto existente foi alterado — apenas foram **adicionados**:
`Dockerfile`, `.dockerignore` e `server.mjs`.

## Como funciona

É um app **TanStack Start (SSR)** que originalmente mira **Cloudflare Workers**.
Na Cloudflare, a *plataforma* serve os arquivos estáticos (`dist/client`) e o
worker só faz SSR. Ao auto-hospedar isso não existe, então o `server.mjs`:

1. Tenta servir o arquivo estático de `dist/client` (com proteção contra path traversal);
2. Se não existir, encaminha a requisição para o handler SSR (`dist/server/index.js`, default export `{ fetch }`).

Roda sob **Bun** (`Bun.serve`) na porta `process.env.PORT` (padrão **3000**), host `0.0.0.0`.

## Passos no EasyPanel

1. **Criar serviço** → tipo **App**.
2. **Source**: aponte para este repositório (branch de produção).
3. **Build**: método **Dockerfile** (o `Dockerfile` na raiz é detectado automaticamente).
   - Build multi-stage com `oven/bun:1`: instala deps com `bun install --frozen-lockfile`, roda `bun run build`, e a imagem final roda `bun server.mjs`.
4. **Porta**: exponha a **3000** (a app escuta em `0.0.0.0:3000`). Se você setar `PORT` como env, o servidor respeita.
5. **Domínio**: associe o domínio/subdomínio desejado e habilite HTTPS (proxy do EasyPanel).
6. **Deploy**.

## Variáveis de ambiente

### Públicas (`VITE_*`) — NÃO precisa setar no EasyPanel
São embutidas no bundle do cliente **em build time** a partir do `.env`
versionado. Funcionam automaticamente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### De servidor — **setar no EasyPanel** (lidas via `process.env` em runtime)

| Variável | Obrigatória | Observação |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ | Chave anon (usada pelo auth middleware) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **SECRETA** — bypassa RLS. Use o campo de *secret* do EasyPanel. **Nunca** commitar. |
| `PORT` | ❌ | Padrão `3000` |
| `HOST` | ❌ | Padrão `0.0.0.0` |

> Os valores de `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` são os mesmos que
> estão no `.env`. A `SUPABASE_SERVICE_ROLE_KEY` você obtém no painel do Supabase
> (Project Settings → API → `service_role`) e cola **apenas** no EasyPanel.

## Testar localmente (opcional)

```bash
docker build -t bip-solucao .
docker run --rm -p 3000:3000 \
  -e SUPABASE_URL="https://SEU_PROJ.supabase.co" \
  -e SUPABASE_PUBLISHABLE_KEY="<anon key>" \
  -e SUPABASE_SERVICE_ROLE_KEY="<service role key>" \
  bip-solucao
# GET http://localhost:3000/         -> 200 (HTML SSR)
# GET http://localhost:3000/assets/* -> 200 (estático)
# rota inexistente                   -> 404
```

## Notas

- O `node_modules` é copiado para a imagem final por segurança, embora o bundle SSR seja autocontido (sem imports "bare", só `node:*`).
- Este deploy é independente do Cloudflare/Lovable — pode rodar lado a lado sem conflito.
