-- Groups table
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Group members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- Link trips to groups (optional — a trip can exist without a group)
alter table trips add column group_id uuid references groups(id) on delete set null;

-- RLS policies
alter table groups enable row level security;
alter table group_members enable row level security;

create policy "Members can view their groups"
  on groups for select using (
    id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "Members can view group membership"
  on group_members for select using (
    group_id in (select group_id from group_members where user_id = auth.uid())
  );

create policy "Owners can manage groups"
  on groups for all using (created_by = auth.uid());

create policy "Group admins can manage members"
  on group_members for all using (
    group_id in (
      select group_id from group_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
