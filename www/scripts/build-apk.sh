#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# SK Jurídico — Script de build para APK Android via Capacitor
# ──────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

cd "$ROOT"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          SK Jurídico — Build APK Android                 ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Verificar dependências ──────────────────────────────────────────────────
echo "▶ Verificando dependências..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js não encontrado"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm não encontrado. Instale: npm install -g pnpm"; exit 1; }
echo "  Node: $(node --version)"
echo "  pnpm: $(pnpm --version)"

# ── 2. Instalar Capacitor (se necessário) ─────────────────────────────────────
echo ""
echo "▶ Instalando Capacitor CLI..."
cd "$ROOT/artifacts/assistente-juridico"
pnpm add -D @capacitor/cli @capacitor/core @capacitor/android 2>/dev/null || true
cd "$ROOT"

# ── 3. Configurar URL do servidor (opcional) ──────────────────────────────────
if [ -n "$CAPACITOR_SERVER_URL" ]; then
  echo ""
  echo "▶ Configurando servidor: $CAPACITOR_SERVER_URL"
  # Atualiza capacitor.config.ts com a URL real
  cat > "$ROOT/capacitor.config.ts" << EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skjuridico.app',
  appName: 'SK Jurídico IA',
  webDir: 'artifacts/assistente-juridico/dist',
  server: {
    url: '$CAPACITOR_SERVER_URL',
    cleartext: true,
  },
};

export default config;
EOF
fi

# ── 4. Build do frontend ──────────────────────────────────────────────────────
echo ""
echo "▶ Compilando frontend React..."
pnpm --filter @workspace/assistente-juridico run build

# ── 5. Inicializar Capacitor Android ─────────────────────────────────────────
echo ""
echo "▶ Sincronizando com Capacitor Android..."
cd "$ROOT"

# Init se necessário
if [ ! -d "android" ]; then
  echo "  Inicializando projeto Android..."
  npx cap init "SK Jurídico IA" "com.skjuridico.app" --web-dir="artifacts/assistente-juridico/dist" 2>/dev/null || true
  npx cap add android 2>/dev/null || true
fi

# Sync
npx cap sync android 2>/dev/null || true

# ── 6. Build do APK ───────────────────────────────────────────────────────────
echo ""
echo "▶ Compilando APK..."
if [ -d "android" ]; then
  cd android
  if command -v ./gradlew >/dev/null 2>&1; then
    chmod +x gradlew
    ./gradlew assembleDebug --no-daemon 2>&1 | tail -20
    APK_PATH="$(find . -name "*.apk" | head -1)"
    if [ -n "$APK_PATH" ]; then
      cp "$APK_PATH" "$ROOT/sk-juridico-debug.apk"
      echo ""
      echo "✅ APK gerado: $ROOT/sk-juridico-debug.apk"
    fi
  else
    echo ""
    echo "ℹ️  Android SDK não encontrado localmente."
    echo "   Abra a pasta 'android/' no Android Studio e clique em:"
    echo "   Build → Generate Signed Bundle/APK → APK"
    echo ""
    echo "   Ou instale o Android SDK e execute:"
    echo "   cd android && ./gradlew assembleDebug"
  fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                    Build concluído!                      ║"
echo "╚══════════════════════════════════════════════════════════╝"
