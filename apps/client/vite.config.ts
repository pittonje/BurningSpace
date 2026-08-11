import { defineConfig, loadEnv } from 'vite';
import { parseClientRuntimeConfig } from './src/config/runtimeConfig';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  parseClientRuntimeConfig({
    PROD: mode === 'production',
    VITE_BURNINGSPACE_SERVER_URL: environment.VITE_BURNINGSPACE_SERVER_URL
  });

  return {
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    preview: {
      host: '0.0.0.0',
      port: 4173
    }
  };
});
