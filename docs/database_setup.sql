-- Criação da tabela de logs de vendas para auditoria
create table if not exists sales_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  customer_email text,
  customer_name text,
  cpf text,
  status text, -- ex: 'success', 'blocked', 'error', 'subscription_canceled'
  message text, -- Detalhes ou razão do bloqueio
  payload jsonb -- O JSON completo recebido da Kiwify
);

-- Ativar segurança (RLS)
alter table sales_logs enable row level security;

-- Política de Segurança:
-- Permitir que o "Service Role" (Edge Function) tenha acesso total (já é padrão no Supabase).
-- Permitir que usuários autenticados (Ex: Admin logado no painel) possam ler os logs.
create policy "Admins can view sales logs" 
  on sales_logs 
  for select 
  using (auth.role() = 'authenticated');

-- (Opcional) Se quiser que ninguém além do service_role possa inserir:
create policy "Service role insert only" 
  on sales_logs 
  for insert 
  with check (true);
