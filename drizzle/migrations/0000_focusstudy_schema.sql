
create table public.profiles (
  id uuid primary key,
  name text not null default '',
  grade text not null default '',
  subjects text[] not null default '{}',
  study_hours text not null default '',
  daily_goal_min int not null default 120,
  reminder_style text not null default 'gentle',
  problem text not null default '',
  onboarded boolean not null default false,
  points int not null default 0,
  focus_preset text not null default 'pomodoro',
  custom_focus_min int not null default 30,
  reminders_enabled boolean not null default true,
  leave_warning boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  subject text not null default 'General',
  description text not null default '',
  priority text not null default 'medium',
  due_at timestamptz,
  duration_min int not null default 30,
  reminder_min int,
  repeat text not null default 'none',
  notes text not null default '',
  completed_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "own tasks" on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  task_id uuid references public.tasks(id) on delete set null,
  subject text not null default 'General',
  planned_min int not null,
  actual_min int not null default 0,
  completed boolean not null default false,
  points int not null default 0,
  started_at timestamptz not null default now(),
  is_sample boolean not null default false
);
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant all on public.focus_sessions to service_role;
alter table public.focus_sessions enable row level security;
create policy "own sessions" on public.focus_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.doubts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  question text not null,
  subject text not null default 'General',
  topic text not null default '',
  answer jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.doubts to authenticated;
grant all on public.doubts to service_role;
alter table public.doubts enable row level security;
create policy "own doubts" on public.doubts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  subject text not null default 'General',
  exam_date date not null,
  topics text not null default '',
  progress int not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.exams to authenticated;
grant all on public.exams to service_role;
alter table public.exams enable row level security;
create policy "own exams" on public.exams for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category text not null default 'reminders',
  title text not null,
  body text not null default '',
  dedupe_key text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text not null default '',
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  display_name text not null default 'Student',
  status text not null default 'offline',
  status_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table public.group_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  title text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.group_task_done (
  task_id uuid not null references public.group_tasks(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  primary key (task_id, user_id)
);
grant select, insert, update, delete on public.study_groups, public.group_members, public.group_tasks, public.group_task_done to authenticated;
grant all on public.study_groups, public.group_members, public.group_tasks, public.group_task_done to service_role;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_tasks enable row level security;
alter table public.group_task_done enable row level security;

create or replace function public.is_group_member(_group uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = _group and user_id = _user)
$$;

create or replace function public.join_group_by_code(_code text, _name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare g uuid;
begin
  select id into g from public.study_groups where invite_code = upper(trim(_code));
  if g is null then raise exception 'Invalid invite code'; end if;
  insert into public.group_members(group_id, user_id, display_name) values (g, auth.uid(), coalesce(nullif(_name,''),'Student'))
  on conflict do nothing;
  return g;
end $$;
grant execute on function public.join_group_by_code(text, text) to authenticated;

create policy "members read groups" on public.study_groups for select to authenticated using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));
create policy "create groups" on public.study_groups for insert to authenticated with check (owner_id = auth.uid());
create policy "members update groups" on public.study_groups for update to authenticated using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));
create policy "owner deletes" on public.study_groups for delete to authenticated using (owner_id = auth.uid());

create policy "members read members" on public.group_members for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "owner adds self" on public.group_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.study_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "self update" on public.group_members for update to authenticated using (user_id = auth.uid());
create policy "self leave" on public.group_members for delete to authenticated using (user_id = auth.uid());

create policy "members group tasks" on public.group_tasks for all to authenticated using (public.is_group_member(group_id, auth.uid())) with check (public.is_group_member(group_id, auth.uid()));

create policy "members read done" on public.group_task_done for select to authenticated using (exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id, auth.uid())));
create policy "self done" on public.group_task_done for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.group_tasks t where t.id = task_id and public.is_group_member(t.group_id, auth.uid())));
create policy "self undone" on public.group_task_done for delete to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
