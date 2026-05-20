#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# SK Jurídico — Iniciar servidor standalone (sem Docker)
# ──────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       SK Jurídico — Iniciar Servidor Local               ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Carrega .env se existir
if [ -f ".env" ]; then
  echo "▶ Carregando variáveis de .env..."
  export $(grep -v '^#' .env | xargs)
fi

# Verifica DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL não definida."
  echo "   Defina no arquivo .env ou exporte antes de executar:"
  echo "   export DATABASE_URL=postgresql://sk_user:sk_pass@localhost:5432/sk_juridico"
  echo ""
  echo "   Iniciando sem banco (modo memória)..."
fi

PORT="${PORT:-8080}"
echo "▶ Iniciando API na porta $PORT..."
echo ""

# Build se necessário
if [ ! -f "artifacts/api-server/dist/index.cjs" ]; then
  echo "▶ Compilando API..."
  pnpm --filter @workspace/api-server run build
fi

# Inicia o servidor
node artifacts/api-server/dist/index.cjs
