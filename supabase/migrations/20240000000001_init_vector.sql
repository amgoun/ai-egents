-- Enable the pgvector extension
create extension if not exists vector;

-- Create a table for storing page sections
create table if not exists agent_training_data (
  id bigserial primary key,
  agent_id bigint references agents(id),
  content text, -- raw content
  chunks text[], -- chunks of content for better context
  metadata jsonb, -- metadata about the document (file type, name, etc.)
  embedding vector(1536), -- OpenAI embedding vector
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to match similar content
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

-- Create an index for faster similarity searches
create index on agent_training_data
using ivfflat (embedding vector_cosine_ops)
with (lists = 100); 