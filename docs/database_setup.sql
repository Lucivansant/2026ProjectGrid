-- CRIAÇÃO DA TABELA DE PLANTAS BAIXAS (FLOOR PLANS)
-- Rode este script no Editor SQL do seu Painel Supabase

create table if not exists floor_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text default 'Meu Projeto',
  data jsonb not null default '{}'::jsonb,
  thumbnail_url text, -- Opcional: para futura imagem de capa
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- HABILITAR RLS (Row Level Security) - Segurança
alter table floor_plans enable row level security;

-- POLÍTICAS DE SEGURANÇA (Quem pode ver o quê)

-- 1. Usuários podem ver apenas seus próprios planos
create policy "Usuários podem ver seus próprios planos"
  on floor_plans for select
  using ( auth.uid() = user_id );

-- 2. Usuários podem inserir seus próprios planos
create policy "Usuários podem criar planos"
  on floor_plans for insert
  with check ( auth.uid() = user_id );

-- 3. Usuários podem atualizar seus próprios planos
create policy "Usuários podem atualizar seus próprios planos"
  on floor_plans for update
  using ( auth.uid() = user_id );

-- 4. Usuários podem deletar seus próprios planos
create policy "Usuários podem deletar seus próprios planos"
  on floor_plans for delete
  using ( auth.uid() = user_id );
