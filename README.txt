GOJO × TOJI Life OS v5.1 — FIXED


V5 adds a real server-side School Sync boundary for Vercel.

Endpoints
- GET /api/health
- GET /api/school/status
- GET /api/school/sync
- GET /api/school/calendar?token=...
  Returns an ICS calendar containing homework/exams.

Providers
1) hebece
   Uses the current `hebece` Node package and its mobile eduVULCAN API client.
   Required Vercel env vars:
     SCHOOL_PROVIDER=hebece
     EDUVULCAN_API_AP=<the /api/ap activation payload>
     EDUVULCAN_KEYPAIR_JSON=<JSON with fingerprint/privateKey/certificate>
     EDUVULCAN_PUPIL_ID=<optional>
     LIFE_OS_API_TOKEN=<strong random token>

   Important: the PWA never stores your eduVULCAN password.
   The hebece project labels itself experimental. If eduVULCAN changes its undocumented API,
   only the provider adapter in lib/providers/hebece.js should need replacement.

2) feed
   For a private bridge such as a self-hosted sync service:
     SCHOOL_PROVIDER=feed
     SCHOOL_FEED_URL=https://...
     SCHOOL_FEED_TOKEN=...
     LIFE_OS_API_TOKEN=...

Security
- Set LIFE_OS_API_TOKEN in production.
- Enter the same token once in Life OS Settings; it is stored locally on your device.
- Never commit eduVULCAN secrets to Git.
- Do not put eduVULCAN login/password in index.html/localStorage.

Frontend
- School sync defaults to same-origin /api/school/sync.
- Best-effort auto-sync runs at app startup, at most once every 30 minutes.
- Manual Sync still exists.
- Today page includes a School Load score and upcoming tasks.
- School load can adjust the readiness advice, but never automatically cancels a workout.
- v4 local data is retained through the existing migration logic.

Calendar
- /api/school/calendar can be subscribed as an ICS feed if the endpoint is reachable and token-protected.
- Use ?token=<LIFE_OS_API_TOKEN> when a calendar client cannot send Authorization headers.

Deploy to Vercel
1. Upload this whole project.
2. Add the chosen environment variables in Project Settings.
3. Deploy production.
4. Test /api/health and /api/school/status.
5. Configure the hebece activation material or the private feed.
6. Open Life OS → Settings and set the API token.
7. School → Sync.

No credentials are included in this package.


V5.1 fixes:
- Correct parsing of HebeCE VulcanHebeDate objects (Deadline.Date / Date.Date).
- Correct Lesson TimeSlot/Room/Teacher fields.
- Lessons are separated from homework/exams and no longer inflate School Load.
- Service worker never caches /api/* responses.
- School API is private-by-default if LIFE_OS_API_TOKEN is missing.
- Local dates use device local date, not UTC.
- New v5.1 storage key with automatic migration from v4/v3.
- Blank check-in fields no longer erase previously saved values.
- Weekly volume counts direct/primary sets instead of counting every secondary muscle as a full set.
- Safer school rendering/import and stale synced tasks are pruned.
- Export filename/version corrected.
- Fixed exercise muscle metadata index; weekly direct-set volume now works and old sessions are repaired during migration.
