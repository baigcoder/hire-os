-- S11: make the resumes bucket private.
-- Run in the Supabase SQL editor AFTER:
--   1. deploying the API with SUPABASE_SERVICE_ROLE_KEY set (server only), and
--   2. running: node scripts/migrate-private-resumes.js --api-base <api url> --apply
-- The API reads and writes this bucket with the service-role key, which
-- bypasses RLS, so no storage policies are needed for it.

-- 1. Stop serving files from the public endpoint
update storage.buckets
set public = false
where id = 'resumes';

-- 2. Review storage policies. Any policy that grants anon or authenticated
--    users select/insert/update/delete on bucket 'resumes' re-opens the hole
--    (the browser has the anon key). List them:
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and (qual ilike '%resumes%' or with_check ilike '%resumes%');

-- 3. Drop each policy that step 2 shows for 'resumes', e.g.:
-- drop policy "Public resume access" on storage.objects;
-- drop policy "Anyone can upload resumes" on storage.objects;

-- 4. Verify: this should return false
select public from storage.buckets where id = 'resumes';
