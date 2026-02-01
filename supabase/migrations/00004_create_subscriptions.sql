-- Create subscriptions table for Stripe billing

create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
create type plan_id as enum ('free', 'pro');

create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_id plan_id default 'free' not null,
  status subscription_status default 'active' not null,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only allow updates via service role (webhook)
-- Users cannot directly modify their subscription

-- Trigger for updated_at
create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.update_updated_at_column();

-- Index
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);

-- Function to create subscription for new user
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create subscription on profile creation
create trigger on_profile_created_subscription
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_subscription();
