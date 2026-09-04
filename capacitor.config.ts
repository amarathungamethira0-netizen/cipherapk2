import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cipherlab.app",
  appName: "CipherLab",
  webDir: "dist",
  backgroundColor: "#05060c",
  loggingBehavior: "debug",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#05060c",
  },
};

export default config;