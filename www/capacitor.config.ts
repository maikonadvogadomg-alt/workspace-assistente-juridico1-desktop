/**
 * Capacitor Configuration — SK Jurídico APK
 *
 * Para gerar o APK:
 *   1. cd artifacts/assistente-juridico && pnpm build
 *   2. cp -r dist ../../cap-dist
 *   3. npx cap init "SK Jurídico" "br.adv.skjuridico" --web-dir=../../cap-dist
 *   4. npx cap add android
 *   5. npx cap sync android
 *   6. npx cap open android (abre no Android Studio)
 *   7. Build > Generate Signed Bundle / APK
 *
 * Configure CAPACITOR_SERVER_URL no ambiente para apontar seu backend:
 *   export CAPACITOR_SERVER_URL=https://seu-backend.com
 *
 * Para funcionamento LOCAL SEM REPLIT, o backend pode ser rodado em:
 *   - Ngrok: ngrok http 8080 (gratuito)
 *   - Sua VPS/servidor próprio
 *   - Localhost (apenas testes no emulador: http://10.0.2.2:8080)
 */
import type { CapacitorConfig } from "@capacitor/cli";

// URL do backend — configure conforme seu ambiente
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "br.adv.skjuridico",
  appName: "SK Jurídico",
  webDir: "artifacts/assistente-juridico/dist/public",

  // Servidor externo — use quando o backend estiver na nuvem
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          androidScheme: "https",
        },
      }
    : {
        // Sem servidor externo → usa assets locais (PWA modo offline)
        server: {
          androidScheme: "https",
          hostname: "skjuridico.app",
        },
      }),

  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#1a2b1a",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark" as any,
      backgroundColor: "#1a2b1a",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body" as any,
      resizeOnFullScreen: true,
      style: "dark" as any,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#4a7c4a",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Network: {},
    Storage: {},
    Filesystem: {
      directory: "Documents" as any,
    },
    Share: {},
    Browser: {},
  },

  android: {
    minSdkVersion: 26,
    targetSdkVersion: 34,
    compileSdkVersion: 34,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: "APK" as any,
    },
    flavor: undefined,
    useLegacyBridge: false,
  },

  ios: {
    minVersion: "14.0",
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: "mobile" as any,
    backgroundColor: "#1a2b1a",
    scrollEnabled: true,
    allowsLinkPreview: true,
    handleApplicationNotifications: true,
  },
};

export default config;
