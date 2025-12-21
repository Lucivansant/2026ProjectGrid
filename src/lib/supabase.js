import { createClient } from "@supabase/supabase-js";

// Detalhes de conexão do Supabase (Hardcoded para facilitar deploy)
const supabaseUrl = "https://mnehllsfvhmdqxdxyqle.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZWhsbHNmdmhtZHF4ZHh5cWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzM3NTksImV4cCI6MjA3MjQwOTc1OX0.DVxpiIVVHqiSKZfZYJ8mXsoy3gMaOxI3O4N4fa5G-Xc";

/**
 * Instância do Cliente Supabase
 * Cliente centralizado para interação com os serviços de Autenticação e Banco de Dados do Supabase.
 * Utiliza variáveis de ambiente para configuração.
 */
// Inicialização direta (Chaves garantidas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

