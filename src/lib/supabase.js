import { createClient } from "@supabase/supabase-js";

// Detalhes de conexão do Supabase a partir de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Instância do Cliente Supabase
 * Cliente centralizado para interação com os serviços de Autenticação e Banco de Dados do Supabase.
 * Utiliza variáveis de ambiente para configuração.
 */
// Função segura para inicializar o Supabase
const initSupabase = () => {
  try {
    const url = supabaseUrl ? String(supabaseUrl).trim() : null;
    const key = supabaseAnonKey ? String(supabaseAnonKey).trim() : null;

    if (url && key && url.startsWith('http') && key.length > 20) {
      return createClient(url, key);
    } else {
        console.warn('Supabase: Credenciais inválidas ou ausentes.');
    }
  } catch (error) {
    console.warn("Falha ao inicializar Supabase (verifique as credenciais):", error);
  }

  // Fallback (Mock) caso falhe ou não tenha chaves
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        error: {
          message:
            "Supabase não configurado (Faltam variáveis de ambiente ou chaves inválidas)",
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
        order: () => ({
          data: [],
          error: null,
        }),
      }),
      insert: () => ({ select: () => ({ data: null, error: null }) }),
      update: () => ({ eq: () => ({ select: () => ({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  };
};

export const supabase = initSupabase();

