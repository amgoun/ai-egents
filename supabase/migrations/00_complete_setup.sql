-- Complete database setup for Agent Chat App
-- Run this in Supabase SQL Editor if you haven't run migrations yet

-- Enable required extensions
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- Create enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'agent_visibility') then
    create type agent_visibility as enum ('public','private');
  end if;
  if not exists (select 1 from pg_type where typname = 'model_provider') then
    create type model_provider as enum ('OpenAI','Anthropic');
  end if;
  if not exists (select 1 from pg_type where typname = 'model_version') then
    create type model_version as enum ('gpt-4','gpt-4.1','claude-3.5-sonnet','claude-3.7-sonnet');
  end if;
  if not exists (select 1 from pg_type where typname = 'role') then
    create type role as enum ('user','admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active','canceled','past_due','trialing');
  end if;
end $$;

-- Users table
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  name text,
  avatar_url text,
  role role not null default 'user',
  stripe_customer_id text,
  is_active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Agent resources table
create table if not exists public.agent_resources (
  id serial primary key,
  agent_id integer,
  resource_type text not null,
  resource_url text not null,
  resource_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  metadata jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Agents table
create table if not exists public.agents (
  id serial primary key,
  name text not null,
  description text,
  avatar_url text,
  avatar_path text unique,
  avatar_resource_id integer references public.agent_resources(id),
  image_description text,
  visibility agent_visibility not null default 'public',
  universe text not null,
  topic_expertise text not null,
  model_provider model_provider not null default 'OpenAI',
  model_version model_version not null,
  temperature integer default 70,
  system_prompt text not null,
  creator_id text references public.users(id),
  is_verified boolean default false,
  metadata jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Add foreign key for agent_resources after agents table exists
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'agent_resources_agent_id_fkey'
  ) then
    alter table public.agent_resources 
    add constraint agent_resources_agent_id_fkey 
    foreign key (agent_id) references public.agents(id);
  end if;
end $$;

-- Agent training data (vector embeddings)
create table if not exists public.agent_training_data (
  id bigserial primary key,
  agent_id bigint references public.agents(id),
  content text,
  chunks text[],
  metadata jsonb,
  embedding vector(1536),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat sessions
create table if not exists public.chat_sessions (
  id serial primary key,
  user_id text not null references public.users(id),
  agent_id integer not null references public.agents(id),
  title text,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Chat messages
create table if not exists public.chat_messages (
  id serial primary key,
  session_id integer not null references public.chat_sessions(id),
  content text not null,
  role text not null,
  created_at timestamp not null default now()
);

-- Usage limits
create table if not exists public.usage_limits (
  id serial primary key,
  user_id text not null references public.users(id),
  message_count integer not null default 0,
  agent_count integer not null default 0,
  tokens_used integer not null default 0,
  tokens_limit integer not null default 250000,
  plan_type text not null default 'free',
  period_start timestamp not null,
  period_end timestamp not null,
  created_at timestamp not null default now()
);

-- Token usage tracking
create table if not exists public.token_usage (
  id serial primary key,
  user_id text not null references public.users(id),
  session_id integer references public.chat_sessions(id),
  agent_id integer references public.agents(id),
  message_id integer references public.chat_messages(id),
  tokens_used integer not null,
  model_used text not null,
  operation_type text not null,
  created_at timestamp not null default now()
);

-- Subscriptions
create table if not exists public.subscriptions (
  id text primary key,
  user_id text not null references public.users(id),
  status subscription_status not null,
  price_id text not null,
  stripe_subscription_id text not null unique,
  current_period_start timestamp not null,
  current_period_end timestamp not null,
  cancel_at_period_end boolean default false,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

-- Create vector similarity search function
create or replace function match_agent_content (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  agent_id bigint
)
returns table (
  id bigint,
  agent_id bigint,
  content text,
  chunk text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    td.id,
    td.agent_id,
    td.content,
    unnest(td.chunks) as chunk,
    1 - (td.embedding <=> query_embedding) as similarity
  from agent_training_data td
  where 1 - (td.embedding <=> query_embedding) > match_threshold
    and td.agent_id = match_agent_content.agent_id
  order by similarity desc
  limit match_count;
end;
$$;

-- Create indexes for performance
create index if not exists agent_training_data_embedding_idx 
on public.agent_training_data 
using ivfflat (embedding vector_cosine_ops) 
with (lists = 100);

create index if not exists token_usage_user_id_idx on public.token_usage (user_id);
create index if not exists token_usage_created_at_idx on public.token_usage (created_at);
create index if not exists token_usage_operation_type_idx on public.token_usage (operation_type);
create index if not exists usage_limits_user_id_period_idx on public.usage_limits (user_id, period_end);

-- Enable RLS (Row Level Security)
alter table public.agents enable row level security;
alter table public.usage_limits enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.agent_training_data enable row level security;

-- RLS Policies for agents
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agents' and policyname='agents_select_public_or_owner') then
    create policy agents_select_public_or_owner on public.agents
      for select using (visibility = 'public' or creator_id = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agents' and policyname='agents_insert_owner') then
    create policy agents_insert_owner on public.agents
      for insert with check (creator_id = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agents' and policyname='agents_update_owner') then
    create policy agents_update_owner on public.agents
      for update using (creator_id = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agents' and policyname='agents_delete_owner') then
    create policy agents_delete_owner on public.agents
      for delete using (creator_id = auth.uid()::text);
  end if;
end $$;

-- RLS Policies for usage_limits
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='usage_limits' and policyname='usage_limits_owner') then
    create policy usage_limits_owner on public.usage_limits
      for all using (user_id = auth.uid()::text);
  end if;
end $$;

-- RLS Policies for chat_sessions
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chat_sessions' and policyname='chat_sessions_owner') then
    create policy chat_sessions_owner on public.chat_sessions
      for all using (user_id = auth.uid()::text);
  end if;
end $$;

-- RLS Policies for chat_messages (via session ownership)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chat_messages' and policyname='chat_messages_via_session') then
    create policy chat_messages_via_session on public.chat_messages
      for all using (
        exists (
          select 1 from public.chat_sessions 
          where chat_sessions.id = chat_messages.session_id 
          and chat_sessions.user_id = auth.uid()::text
        )
      );
  end if;
end $$;

-- RLS Policies for agent_training_data (via agent ownership or public)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agent_training_data' and policyname='agent_training_data_via_agent') then
    create policy agent_training_data_via_agent on public.agent_training_data
      for all using (
        exists (
          select 1 from public.agents 
          where agents.id = agent_training_data.agent_id 
          and (agents.visibility = 'public' or agents.creator_id = auth.uid()::text)
        )
      );
  end if;
end $$;

