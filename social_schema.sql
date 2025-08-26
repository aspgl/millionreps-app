-- Friends & Friend Requests schema for Supabase (Postgres)

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamp with time zone not null default now(),
  constraint friend_requests_not_self check (sender_id <> receiver_id),
  unique (sender_id, receiver_id)
);

create table if not exists public.friends (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (user_id, friend_id),
  constraint friends_not_self check (user_id <> friend_id)
);

-- Optionally, an index for fast lookups
create index if not exists idx_friend_requests_receiver on public.friend_requests(receiver_id);
create index if not exists idx_friend_requests_sender on public.friend_requests(sender_id);
create index if not exists idx_friends_user on public.friends(user_id);

-- RLS policies (enable and basic policies)
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;

-- Recreate policies (DROP IF EXISTS first because CREATE POLICY has no IF NOT EXISTS)
drop policy if exists "select_own_requests" on public.friend_requests;
drop policy if exists "insert_own_requests" on public.friend_requests;
drop policy if exists "update_involved_requests" on public.friend_requests;

drop policy if exists "select_own_friends" on public.friends;
drop policy if exists "insert_own_friend_rows" on public.friends;
drop policy if exists "delete_own_friend_rows" on public.friends;

-- Only involved users can view their requests
create policy "select_own_requests" on public.friend_requests
  for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

-- Send a request as the sender
create policy "insert_own_requests" on public.friend_requests
  for insert with check (
    auth.uid() = sender_id
  );

-- Receiver can update to accepted/rejected; sender can cancel (update status)
create policy "update_involved_requests" on public.friend_requests
  for update using (
    auth.uid() = receiver_id or auth.uid() = sender_id
  );

-- Friends list: a user can view their own rows
create policy "select_own_friends" on public.friends
  for select using (
    auth.uid() = user_id
  );

-- Users can insert friendship rows that include themselves (app will insert both directions)
create policy "insert_own_friend_rows" on public.friends
  for insert with check (
    auth.uid() = user_id
  );

-- Users can delete their own friendship rows
create policy "delete_own_friend_rows" on public.friends
  for delete using (
    auth.uid() = user_id
  );

-- RPC: accept friend request (creates both friendship rows under SECURITY DEFINER)
create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_status text;
begin
  select sender_id, receiver_id, status into v_sender, v_receiver, v_status
  from public.friend_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'friend request not found';
  end if;

  -- Only sender or receiver may accept via RPC
  if auth.uid() is null or (auth.uid() <> v_receiver and auth.uid() <> v_sender) then
    raise exception 'not allowed';
  end if;

  -- Update status
  update public.friend_requests
  set status = 'accepted'
  where id = p_request_id;

  -- Create friendship rows (idempotent)
  insert into public.friends(user_id, friend_id)
  values (v_sender, v_receiver)
  on conflict (user_id, friend_id) do nothing;

  insert into public.friends(user_id, friend_id)
  values (v_receiver, v_sender)
  on conflict (user_id, friend_id) do nothing;
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

-- RPC: remove friendship (deletes both directions) under SECURITY DEFINER
create or replace function public.remove_friendship(p_user_id uuid, p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only involved user may remove via RPC
  if auth.uid() is null or (auth.uid() <> p_user_id and auth.uid() <> p_friend_id) then
    raise exception 'not allowed';
  end if;

  delete from public.friends
  where (user_id = p_user_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = p_user_id);
end;
$$;

grant execute on function public.remove_friendship(uuid, uuid) to authenticated;

-- Exam sharing: join table instead of array for better RLS and querying
create table if not exists public.exam_shares (
  exam_id uuid not null references public.exams(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  shared_with_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exam_id, shared_with_id)
);

create index if not exists idx_exam_shares_shared_with on public.exam_shares(shared_with_id);
create index if not exists idx_exam_shares_owner on public.exam_shares(owner_id);

alter table public.exam_shares enable row level security;

-- Policies: owner can insert/select/delete their shares, recipient can select rows that grant them visibility
drop policy if exists "exam_shares_owner_select" on public.exam_shares;
drop policy if exists "exam_shares_owner_insert" on public.exam_shares;
drop policy if exists "exam_shares_owner_delete" on public.exam_shares;
drop policy if exists "exam_shares_recipient_select" on public.exam_shares;

create policy "exam_shares_owner_select" on public.exam_shares
  for select using (auth.uid() = owner_id);

create policy "exam_shares_owner_insert" on public.exam_shares
  for insert with check (auth.uid() = owner_id);

create policy "exam_shares_owner_delete" on public.exam_shares
  for delete using (auth.uid() = owner_id);

create policy "exam_shares_recipient_select" on public.exam_shares
  for select using (auth.uid() = shared_with_id);

-- Ensure recipients can read shared exams (requires RLS on exams)
do $$ begin
  perform 1 from information_schema.tables where table_schema = 'public' and table_name = 'exams';
  if found then
    execute 'alter table public.exams enable row level security';
    -- Drop old policies if present to avoid duplicates
    execute 'drop policy if exists exams_select_shared on public.exams';
    execute 'drop policy if exists exams_select_owner on public.exams';
    -- Recipient can select exams if there is a share row
    execute $$
      create policy exams_select_shared on public.exams
      for select using (
        exists (
          select 1 from public.exam_shares s
          where s.exam_id = exams.id
            and (s.shared_with_id = auth.uid() or s.owner_id = auth.uid())
        )
      );
    $$;
    -- Owner can always select own exams
    execute $$
      create policy exams_select_owner on public.exams
      for select using (created_by = auth.uid());
    $$;
  end if;
end $$;

-- Organization exam shares (share exams with an organization)
create table if not exists public.org_exam_shares (
  exam_id uuid not null references public.exams(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exam_id, organization_id)
);

create index if not exists idx_org_exam_shares_org on public.org_exam_shares(organization_id);
create index if not exists idx_org_exam_shares_owner on public.org_exam_shares(owner_id);

alter table public.org_exam_shares enable row level security;

drop policy if exists org_shares_owner_select on public.org_exam_shares;
drop policy if exists org_shares_owner_insert on public.org_exam_shares;
drop policy if exists org_shares_owner_delete on public.org_exam_shares;
drop policy if exists org_shares_member_select on public.org_exam_shares;

create policy org_shares_owner_select on public.org_exam_shares
  for select using (auth.uid() = owner_id);
create policy org_shares_owner_insert on public.org_exam_shares
  for insert with check (auth.uid() = owner_id);
create policy org_shares_owner_delete on public.org_exam_shares
  for delete using (auth.uid() = owner_id);

-- Members of the organization can see org shares
create policy org_shares_member_select on public.org_exam_shares
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.organization = org_exam_shares.organization_id
    )
  );


