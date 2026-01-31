
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Charge les variables d'environnement du fichier .env en fonction du mode (dev/prod)
  // Fix: Property 'cwd' does not exist on type 'Process'. Casting process to any to access the Node.js cwd method.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // On s'assure que les variables sont injectées même si elles ne commencent pas par VITE_
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || ''),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || '')
    },
    server: {
      port: 3000
    }
  };
});
