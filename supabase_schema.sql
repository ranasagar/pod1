-- Create a table to store application settings (styles, mockups, textures, api keys)
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table app_settings enable row level security;

-- Create policies
-- 1. Allow public read access (so the app can load styles/mockups without login if needed, or we can restrict it later)
create policy "Allow public read access" on app_settings for select using (true);

-- 2. Allow anonymous write/update access (For this specific demo/admin app where we just want it to work with the key provided)
-- WARNING: In a production app, you would restrict this to authenticated users only.
create policy "Allow anon insert access" on app_settings for insert with check (true);
create policy "Allow anon update access" on app_settings for update using (true);

-- Insert default data structure if not exists (Optional, app handles this via upsert usually)
