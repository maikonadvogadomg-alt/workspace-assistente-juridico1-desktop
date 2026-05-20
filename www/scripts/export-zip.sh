#!/usr/bin/env bash
# SK Jurídico — Gera arquivo comprimido do projeto para exportação
# Uso: bash scripts/export-zip.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_NAME="sk-juridico-$(date +%Y%m%d-%H%M%S).tar.gz"
OUT_PATH="$ROOT/$OUT_NAME"

echo "==> Gerando arquivo: $OUT_NAME"

cd "$ROOT"

tar \
  --exclude='.git' \
  --exclude='*/node_modules' \
  --exclude='*/.pnpm-store' \
  --exclude='*/dist' \
  --exclude='*/.cache' \
  --exclude='*/coverage' \
  --exclude='*/__pycache__' \
  --exclude='*.tar.gz' \
  --exclude='.local/skills' \
  --exclude='attached_assets' \
  -czf "$OUT_PATH" .

SIZE=$(du -sh "$OUT_PATH" | cut -f1)
echo ""
echo "==> Arquivo gerado com sucesso!"
echo "    Arquivo : $OUT_PATH"
echo "    Tamanho : $SIZE"
echo ""
echo "    Para baixar no Replit: abra o painel de arquivos (Files),"
echo "    clique com botão direito em '$OUT_NAME' → Download"
