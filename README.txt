GOJO × TOJI Life OS v6

Source: authoritative v5.1 FINAL FIXED PWA archive. The four-day plan and training/body/nutrition/school features are retained. Fresh visitors start with an empty personal history; the private baseline JSON can be imported after opening the app.

Build: Node 22.x, npm ci, npm run build. Vercel framework Other; root directory is this folder. Public browser bundle: assets/life-data.js. Serverless API: api/*.js.

Supabase project: gojo-toji-life-os, Frankfurt eu-central-1, ref tnorzynsakwyacnukzjy. Apply supabase/migrations/20260928000000_life_os_v6.sql to a new dedicated project only. This schema has already been applied to that project. Browser contains a publishable key; no service key is bundled.

Sign-in: Supabase Auth email magic link. Configure the final HTTPS production URL in Supabase Auth URL Configuration (Site URL and Redirect URLs). The user enters their own email; no account is hardcoded. Local mode works without signing in.

Offline/conflicts: UI saves synchronously to localStorage, then an IndexedDB snapshot and pending queue batch. Online authenticated sync compares UUID records with cloud updated_at and chooses the newer timestamp. Server rows win ties. Immutable workout history has stable UUIDs; date-keyed body/nutrition/readiness uses deterministic UUIDs. Once synced, the cloud snapshot is hydrated into the UI and the queue is cleared. On network error the local write stands and the batch remains pending. The cloud is authoritative after reconciliation. A per-user migration marker is set after successful reconciliation; deterministic IDs and upsert prevent duplicate v5.1 records on subsequent launches. Existing localStorage versions v5.1, v5, v4 and v3 are read.

Security: all 12 user-facing tables have owner RLS with auth.uid() = user_id for read, insert, update and delete. School sync is a Node 22 Vercel function because hebece 0.2.4 is Node-oriented; it verifies the user's Supabase JWT and writes under that user's RLS. Tasks and regular lessons are separate. Missing provider credentials return NOT_CONFIGURED. Server-only Vercel variables are SCHOOL_PROVIDER=hebece, EDUVULCAN_API_AP, EDUVULCAN_KEYPAIR_JSON, optional EDUVULCAN_PUPIL_ID; alternative feed provider uses SCHOOL_PROVIDER=feed, SCHOOL_FEED_URL, SCHOOL_FEED_TOKEN. Never store an eduVULCAN password in the PWA. The ICS endpoint uses Bearer JWT and reads school_items under RLS; it is deliberately not a public token-in-URL feed.

PWA: install in Safari via Share → Add to Home Screen. Shell, manifest, icons and bundled data client are precached; /api/* and cross-origin Supabase/Auth responses are never cached. Auth and synchronization require network, while all local UI functions and pending writes work offline.

JSON export/import remains a secondary backup. Imported rows keep their identifiers where possible and are queued for cloud reconciliation after sign-in.
