# @workspace/assistente-juridico1 — App Desktop

Aplicativo gerado pelo APK Builder para Windows, Mac e Linux.

## Como compilar

### Usando GitHub Actions (automático)
1. Suba este repositório no GitHub
2. O workflow `.github/workflows/build-desktop.yml` compila automaticamente
3. Baixe os executáveis na aba **Actions → Artifacts**

### Manualmente
```bash
npm install
npm run build
```

Os arquivos estarão em `dist/`:
- **Windows**: `-workspace-assistente-juridico1-Setup-4.exe`
- **Mac**: `-workspace-assistente-juridico1-4.dmg`
- **Linux**: `-workspace-assistente-juridico1-4.AppImage`

## Requisitos
- Node.js 18+
- npm

## Gerado por
[APK Builder](https://replit.com) — Maikon Caldeira
