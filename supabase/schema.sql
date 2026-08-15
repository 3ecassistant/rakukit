-- RakuKit PRO billing / workspace schema
-- docs/billing-spec.md の ■130〜■150 に対応するMVP用スキーマ。
--
-- 使い方: Supabaseダッシュボード > SQL Editor にこのファイルの内容を貼り付けて実行する。
-- Supabase CLIを使う場合は supabase/migrations/ 配下へこの内容をマイグレーションとして配置してよい。
--
-- 設計方針（docs/billing-spec.md 参照）:
--   User → Workspace → Store → Products → Scenarios / tool_runs  (■32)
--   サブスクリプションは workspace 単位で持つ (■30)
--   Stripeを課金状態の原本とし、subscriptions はアプリ内権限判定用のミラー (■82)
--   RLSは「auth.uid() が workspace_members に存在し、対象row.workspace_idと一致する」を基本条件とする (■146-147)

-- =========================================================
-- 共通ユーティリティ
-- =========================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 注意: is_workspace_member() / is_workspace_owner() は workspace_members
-- テーブルを参照するため、テーブル作成後（本ファイル下部）にまとめて定義する。
-- LANGUAGE sql の関数はCREATE FUNCTION時点でテーブル存在を検証するため、
-- 先に定義すると "relation does not exist" で失敗する。

-- =========================================================
-- profiles (■131)
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: self select" on public.profiles
  for select using (id = auth.uid());

create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid());

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 新規ユーザー登録時に自動でprofilesへ1行作成する
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- workspaces / workspace_members (■132-135, ■30-33)
-- =========================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- role: MVPは OWNER のみ運用。将来 ADMIN / MEMBER / VIEWER を追加 (■134-135)
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'OWNER' check (role in ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- workspace_members を参照するRLSポリシーが自己再帰しないよう、
-- SECURITY DEFINERで「auth.uid()が指定workspaceのメンバーか」を判定するヘルパー関数を用意する。
-- (workspace_members作成後に定義する必要がある。上記の注意書き参照)
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.user_id = auth.uid()
      and m.role = 'OWNER'
  );
$$;

alter table public.workspaces enable row level security;

-- 注意: owner_user_id = auth.uid() を直接条件に含めているのは、
-- INSERT ... RETURNING 直後のRLS再チェック対策。is_workspace_member() は
-- on_workspace_created トリガー(AFTER INSERT)がworkspace_membersへ行を追加した後で
-- ないと真にならず、RETURNING句の評価タイミングによっては新規作成した本人が
-- 直後に自分のworkspaceを取得できず "new row violates row-level security policy"
-- となることがあるため、オーナー本人は常時許可する経路を用意している。
create policy "workspaces: member select" on public.workspaces
  for select using (owner_user_id = auth.uid() OR public.is_workspace_member(id));

create policy "workspaces: owner insert" on public.workspaces
  for insert with check (owner_user_id = auth.uid());

create policy "workspaces: owner update" on public.workspaces
  for update using (public.is_workspace_owner(id));

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

alter table public.workspace_members enable row level security;

create policy "workspace_members: member select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "workspace_members: owner manage" on public.workspace_members
  for all using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- workspace作成者を自動的にOWNERとしてworkspace_membersへ登録する
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_user_id, 'OWNER');
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- =========================================================
-- stores / store_settings (■136-138)
-- =========================================================

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  store_name text not null,
  store_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores enable row level security;

create policy "stores: workspace member access" on public.stores
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- 楽天手数料等をハードコードせず、店舗ごとのデフォルト値として保持する (■138)
create table if not exists public.store_settings (
  store_id uuid primary key references public.stores (id) on delete cascade,
  default_sales_fee_rate numeric,
  default_shipping_cost numeric,
  default_customer_shipping_charge numeric,
  default_point_burden_rate numeric,
  default_min_profit_rate numeric,
  default_coupon_burden numeric,
  default_aov numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "store_settings: workspace member access" on public.store_settings
  for all using (
    exists (
      select 1 from public.stores s
      where s.id = store_settings.store_id
        and public.is_workspace_member(s.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_settings.store_id
        and public.is_workspace_member(s.workspace_id)
    )
  );

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- =========================================================
-- products (■139, ■27 上限1,000商品/店舗はアプリ側で判定)
-- =========================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  product_code text,
  sku text,
  product_name text not null,
  selling_price numeric,
  cost numeric,
  shipping_cost numeric,
  sales_fee_rate numeric,
  point_burden_rate numeric,
  current_cpc numeric,
  current_cvr numeric,
  current_rating numeric,
  review_count integer,
  inventory integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products: workspace member access" on public.products
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create index if not exists products_workspace_id_idx on public.products (workspace_id);
create index if not exists products_store_id_idx on public.products (store_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- =========================================================
-- scenarios (■140, ■28 上限5,000シナリオ程度はアプリ側で判定)
-- =========================================================

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  tool_code text not null,
  scenario_name text not null,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scenarios enable row level security;

create policy "scenarios: workspace member access" on public.scenarios
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create index if not exists scenarios_workspace_id_idx on public.scenarios (workspace_id);
create index if not exists scenarios_product_id_idx on public.scenarios (product_id);
create index if not exists scenarios_tool_code_idx on public.scenarios (tool_code);

create trigger scenarios_set_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();

-- =========================================================
-- tool_runs: PRO履歴用 (■141, ■143-145 共通JSON形式で開始)
-- =========================================================

create table if not exists public.tool_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_code text not null,
  product_id uuid references public.products (id) on delete set null,
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tool_runs enable row level security;

create policy "tool_runs: workspace member access" on public.tool_runs
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create index if not exists tool_runs_workspace_id_idx on public.tool_runs (workspace_id);
create index if not exists tool_runs_product_id_idx on public.tool_runs (product_id);
create index if not exists tool_runs_tool_code_idx on public.tool_runs (tool_code);
create index if not exists tool_runs_created_at_idx on public.tool_runs (created_at desc);

-- =========================================================
-- subscriptions (■81-82): Stripeが原本、ここはミラー/キャッシュ。
-- クライアントからの直接書き込みは許可しない。書き込みはWebhookハンドラが
-- service roleで行う（service roleはRLSをバイパスするため書き込みポリシー不要）。
-- =========================================================

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  provider text not null default 'stripe',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_code text not null default 'FREE' check (plan_code in ('FREE', 'PRO')),
  billing_interval text not null default 'NONE' check (billing_interval in ('NONE', 'MONTH', 'YEAR')),
  status text not null default 'NONE'
    check (status in ('NONE', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  past_due_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- 読み取りのみワークスペースメンバーに許可。書き込みはservice role経由(Webhook)のみ。
create policy "subscriptions: workspace member select" on public.subscriptions
  for select using (public.is_workspace_member(workspace_id));

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =========================================================
-- stripe_events (■79-80, ■197): Webhook重複処理防止。クライアントアクセス不可。
-- =========================================================

create table if not exists public.stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz,
  processing_status text not null default 'PENDING'
    check (processing_status in ('PENDING', 'PROCESSED', 'ERROR')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- ポリシーを一切作成しない = service role以外は読み書き不可。
