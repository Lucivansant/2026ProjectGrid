import { createClient } from '@supabase/supabase-js'

// Detalhes de conexão do Supabase a partir de variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Instância do Cliente Supabase
 * Cliente centralizado para interação com os serviços de Autenticação e Banco de Dados do Supabase.
 * Utiliza variáveis de ambiente para configuração.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)


