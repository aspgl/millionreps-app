-- Create calendar_events table
create table public.calendar_events (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  title character varying(255) not null,
  description text null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  all_day boolean null default false,
  category character varying(50) null default 'general'::character varying,
  color character varying(7) null default '#3B82F6'::character varying,
  location text null,
  url text null,
  status character varying(20) null default 'confirmed'::character varying,
  is_public boolean null default false,
  is_recurring boolean null default false,
  recurrence_rule text null,
  priority character varying(20) null default 'medium'::character varying,
  attendees uuid[] null default '{}'::uuid[],
  tags text[] null default '{}'::text[],
  icon character varying(50) null default 'calendar'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint calendar_events_pkey primary key (id),
  constraint calendar_events_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint valid_color_format check (((color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)),
  constraint valid_time_range check ((end_time > start_time))
) tablespace pg_default;

-- Create indexes
create index if not exists idx_calendar_events_user_id on public.calendar_events using btree (user_id) tablespace pg_default;
create index if not exists idx_calendar_events_start_time on public.calendar_events using btree (start_time) tablespace pg_default;
create index if not exists idx_calendar_events_category on public.calendar_events using btree (category) tablespace pg_default;
create index if not exists idx_calendar_events_user_start on public.calendar_events using btree (user_id, start_time) tablespace pg_default;
create index if not exists idx_calendar_events_shared_with on public.calendar_events using gin (attendees) tablespace pg_default;

-- Create updated_at trigger
create or replace function update_calendar_events_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_calendar_events_updated_at
  before update on calendar_events
  for each row
  execute function update_calendar_events_updated_at();

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Create RLS policies
create policy "Users can view their own calendar events" on calendar_events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own calendar events" on calendar_events
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own calendar events" on calendar_events
  for update using (auth.uid() = user_id);

create policy "Users can delete their own calendar events" on calendar_events
  for delete using (auth.uid() = user_id);

-- Drop existing functions first (if they exist)
drop function if exists get_user_events(uuid, timestamp with time zone, timestamp with time zone);
drop function if exists get_user_events_for_week(uuid, timestamp with time zone);
drop function if exists get_user_events_for_day(uuid, timestamp with time zone);
drop function if exists get_upcoming_events(uuid, integer);
drop function if exists search_events(uuid, text);

-- Create helper RPC functions
create or replace function get_user_events(user_uuid uuid, start_date timestamp with time zone default null, end_date timestamp with time zone default null)
returns table (
  id uuid,
  title text,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  all_day boolean,
  category text,
  color text,
  location text,
  url text,
  status text,
  is_public boolean,
  is_recurring boolean,
  recurrence_rule text,
  priority text,
  attendees uuid[],
  tags text[],
  icon text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) language plpgsql security definer as $$
begin
  return query
  select 
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.all_day,
    ce.category,
    ce.color,
    ce.location,
    ce.url,
    ce.status,
    ce.is_public,
    ce.is_recurring,
    ce.recurrence_rule,
    ce.priority,
    ce.attendees,
    ce.tags,
    ce.icon,
    ce.created_at,
    ce.updated_at
  from calendar_events ce
  where ce.user_id = user_uuid
    and (start_date is null or ce.start_time >= start_date)
    and (end_date is null or ce.start_time <= end_date)
  order by ce.start_time asc;
end;
$$;

create or replace function get_user_events_for_week(user_uuid uuid, week_start timestamp with time zone)
returns table (
  id uuid,
  title text,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  all_day boolean,
  category text,
  color text,
  location text,
  url text,
  status text,
  is_public boolean,
  is_recurring boolean,
  recurrence_rule text,
  priority text,
  attendees uuid[],
  tags text[],
  icon text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) language plpgsql security definer as $$
declare
  week_end timestamp with time zone;
begin
  week_end := week_start + interval '7 days';
  
  return query
  select 
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.all_day,
    ce.category,
    ce.color,
    ce.location,
    ce.url,
    ce.status,
    ce.is_public,
    ce.is_recurring,
    ce.recurrence_rule,
    ce.priority,
    ce.attendees,
    ce.tags,
    ce.icon,
    ce.created_at,
    ce.updated_at
  from calendar_events ce
  where ce.user_id = user_uuid
    and ce.start_time >= week_start
    and ce.start_time < week_end
  order by ce.start_time asc;
end;
$$;

create or replace function get_user_events_for_day(user_uuid uuid, day_date timestamp with time zone)
returns table (
  id uuid,
  title text,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  all_day boolean,
  category text,
  color text,
  location text,
  url text,
  status text,
  is_public boolean,
  is_recurring boolean,
  recurrence_rule text,
  priority text,
  attendees uuid[],
  tags text[],
  icon text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) language plpgsql security definer as $$
declare
  day_start timestamp with time zone;
  day_end timestamp with time zone;
begin
  day_start := date_trunc('day', day_date);
  day_end := day_start + interval '1 day';
  
  return query
  select 
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.all_day,
    ce.category,
    ce.color,
    ce.location,
    ce.url,
    ce.status,
    ce.is_public,
    ce.is_recurring,
    ce.recurrence_rule,
    ce.priority,
    ce.attendees,
    ce.tags,
    ce.icon,
    ce.created_at,
    ce.updated_at
  from calendar_events ce
  where ce.user_id = user_uuid
    and ce.start_time >= day_start
    and ce.start_time < day_end
  order by ce.start_time asc;
end;
$$;

create or replace function get_upcoming_events(user_uuid uuid, limit_count integer default 10)
returns table (
  id uuid,
  title text,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  all_day boolean,
  category text,
  color text,
  location text,
  url text,
  status text,
  is_public boolean,
  is_recurring boolean,
  recurrence_rule text,
  priority text,
  attendees uuid[],
  tags text[],
  icon text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) language plpgsql security definer as $$
begin
  return query
  select 
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.all_day,
    ce.category,
    ce.color,
    ce.location,
    ce.url,
    ce.status,
    ce.is_public,
    ce.is_recurring,
    ce.recurrence_rule,
    ce.priority,
    ce.attendees,
    ce.tags,
    ce.icon,
    ce.created_at,
    ce.updated_at
  from calendar_events ce
  where ce.user_id = user_uuid
    and ce.start_time >= now()
  order by ce.start_time asc
  limit limit_count;
end;
$$;

create or replace function search_events(user_uuid uuid, search_term text)
returns table (
  id uuid,
  title text,
  description text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  all_day boolean,
  category text,
  color text,
  location text,
  url text,
  status text,
  is_public boolean,
  is_recurring boolean,
  recurrence_rule text,
  priority text,
  attendees uuid[],
  tags text[],
  icon text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) language plpgsql security definer as $$
begin
  return query
  select 
    ce.id,
    ce.title,
    ce.description,
    ce.start_time,
    ce.end_time,
    ce.all_day,
    ce.category,
    ce.color,
    ce.location,
    ce.url,
    ce.status,
    ce.is_public,
    ce.is_recurring,
    ce.recurrence_rule,
    ce.priority,
    ce.attendees,
    ce.tags,
    ce.icon,
    ce.created_at,
    ce.updated_at
  from calendar_events ce
  where ce.user_id = user_uuid
    and (
      ce.title ilike '%' || search_term || '%'
      or ce.description ilike '%' || search_term || '%'
      or ce.location ilike '%' || search_term || '%'
      or ce.category ilike '%' || search_term || '%'
      or ce.tags::text ilike '%' || search_term || '%'
    )
  order by ce.start_time desc;
end;
$$;
