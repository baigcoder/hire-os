-- Private Realtime channels for HIRE.OS interview calls.
--
-- The API (backend/platform/realtime) mints a 15-minute token whose
-- "hireos_topics" claim lists the topics the caller may use, for example
--   ["interview:6ad93d7eebac0c49421a5378", "user:6ad93d7eebac0c49421a5371"]
-- These policies let an authenticated connection receive and send Broadcast
-- and Presence only on topics listed in its own token. Server-side
-- broadcasts use the service-role key and bypass RLS.
--
-- Apply in the Supabase SQL editor (or as a migration), then:
--   1. Realtime > Settings: turn OFF "Allow public access", or clients can
--      still join channels without the private flag.
--   2. Set SUPABASE_JWT_SECRET on the API to a secret Supabase verifies:
--      the project's legacy JWT secret (Settings > JWT Keys), or an HS256
--      secret you import as a signing key (then also set SUPABASE_JWT_KID).
--
-- Do not add "alter table realtime.messages enable row level security":
-- RLS is already on, and the statement fails with 42501 (not owner).

drop policy if exists "hireos: receive on own topics" on realtime.messages;
drop policy if exists "hireos: send on own topics" on realtime.messages;

create policy "hireos: receive on own topics"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and coalesce(auth.jwt() -> 'hireos_topics', '[]'::jsonb) ? (select realtime.topic())
);

create policy "hireos: send on own topics"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  -- "user:<id>" topics are receive-only for clients: only the API (service
  -- role) pushes to them, so one user can't fake another's notifications
  and (select realtime.topic()) like 'interview:%'
  and coalesce(auth.jwt() -> 'hireos_topics', '[]'::jsonb) ? (select realtime.topic())
);
