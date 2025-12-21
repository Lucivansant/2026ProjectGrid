import { createClient } from "@supabase/supabase-js";

// Detalhes de conexão do Supabase a partir de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Instância do Cliente Supabase
 * Cliente centralizado para interação com os serviços de Autenticação e Banco de Dados do Supabase.
 * Utiliza variáveis de ambiente para configuração.
 */
// Evita crash se as variáveis de ambiente não estiverem definidas (comum em deploy inicial na Vercel/Netlify)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          signInWithPassword: async () => ({
            error: {
              message:
                "Supabase não configurado (Faltam variáveis de ambiente)",
            },
          }),
          signUp: async () => ({
            error: { message: "Supabase não configurado" },
          }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
              data: [],
              error: null,
            }),
            order: () => ({ data: [], error: null }),
            insert: async () => ({ data: null, error: null }),
            update: async () => ({ data: null, error: null }),
            delete: async () => ({ data: null, error: null }),
          }),
        }),
      };
