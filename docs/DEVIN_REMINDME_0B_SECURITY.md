# Devin task — RemindMe: close the unauthenticated provider routes

Paste everything below the line into a **new** Devin session. This is the `etlagent/remindme` repository — **not** `vitruvity-internal`. It shares no files with the Users & Access work, so the two can run at the same time.

One thing must happen outside Devin, by a human: rotating the Perplexity API key. It's listed under "Human prerequisites."

---

## Objective

In `etlagent/remindme`, make every API route that reaches a paid provider or the database require an authenticated caller, and remove a debug endpoint that leaks API key material. One pull request against `main`.

This is security hardening only. **Do not** refactor features, reorganize routes, rename anything, upgrade dependencies, touch the UI, or migrate anything toward Vitruvity Internal. If you find yourself editing a file under `components/` or a `page.tsx`, stop — you have gone out of scope.

## Context you need

- Next.js 16.0.6, React 19.2.0, Tailwind 4, `@supabase/auth-helpers-nextjs` 0.15.0 (not `@supabase/ssr`).
- There are 66 route handlers under `app/api/`. **55 already call `supabase.auth.getUser()`.** You are not touching those.
- **There is no `middleware.ts` anywhere in this repository.** Nothing gates any route today.
- Of the 11 handlers that don't call `getUser()`, six use a bearer-token pattern instead, which is fine and stays. Five have no authentication of any kind.

## Credentials — you get none

You will not be given a Supabase connection string, an API key, a service key, or a deployment environment. **Do not ask for any.** Everything in steps 1–5 is code and can be written without them.

## Human prerequisites — handled by the requester, not you

1. `PERPLEXITY_API_KEY` rotated and the old value revoked. Treat the current key as disclosed — see step 1.
2. Provider-side spend caps set on the OpenAI and Perplexity projects backing RemindMe.

Neither blocks your work. Do steps 1–5 regardless and note in the PR that both are the requester's to confirm.

## Step 1 — Delete `app/api/test-perplexity/route.ts`

Delete the file outright. No replacement, no auth added to it.

It is an unauthenticated `GET` whose JSON response body includes:

```ts
hasApiKey: !!process.env.PERPLEXITY_API_KEY,
keyFormat: process.env.PERPLEXITY_API_KEY?.substring(0, 10) + '...'
```

That publishes the existence and first ten characters of a live API key to any anonymous caller. It is a debug endpoint that reached production. Remove it and grep the repo for any reference to the path; there should be none.

## Step 2 — Add `middleware.ts` at the repository root

There is no middleware today. Add one that redirects unauthenticated page navigation to the sign-in page and returns `401` JSON for unauthenticated API calls — never login HTML from an API route.

- Use the Supabase client library already in this repo (`@supabase/auth-helpers-nextjs`). Do **not** add `@supabase/ssr` or any new dependency.
- Read the existing sign-in route from `app/` and redirect there. Do not invent a `/login` path if this app uses a different one — check first.
- Exempt the sign-in route, any auth callback route, and static assets.
- For paths starting with `/api/`, return `NextResponse.json({ error: 'unauthorized' }, { status: 401 })` rather than a redirect.
- Matcher should mirror the one in `vitruvity-internal/src/middleware.ts`: everything except `_next/static`, `_next/image`, `favicon.ico` and image extensions.

Middleware is a backstop, not the control. Step 3 is the control.

## Step 3 — Authenticate the four remaining unauthenticated routes

| File | Method | Providers |
|---|---|---|
| `app/api/research/analyze/route.ts` | POST | OpenAI + Perplexity |
| `app/api/research/suggest/route.ts` | POST | OpenAI + Perplexity |
| `app/api/organize/route.ts` | POST | OpenAI |
| `app/api/parse-linkedin/route.ts` | POST | OpenAI |

**Use the bearer pattern already in this repository. Do not invent a second scheme.** The canonical implementation is the top of `app/api/save-memory/route.ts`: read the `authorization` header, return `401` when it is missing, strip the `Bearer ` prefix, construct a Supabase client that forwards the token so RLS still applies, then `supabase.auth.getUser(token)` and return `401` when that fails.

Extract that block into `lib/auth/requireBearerUser.ts` as a single exported helper returning either the user or a `NextResponse`, then call it from all four routes **and** refactor the six existing bearer routes to use it — `save-memory`, `delete-memory/[id]`, `delete-person/[id]`, `delete-conversation/[id]`, `update-followup/[id]`, `delete-followup/[id]`. Ten call sites, one implementation.

The check goes **before** `request.json()` and before any provider client is used. Do not change any handler's success response.

`app/api/decide/habits/reorder/route.ts` also uses `SUPABASE_SERVICE_ROLE_KEY`. **Leave it alone** — it is server-side and bearer-checked. Just note it in the PR description so it is on record.

## Step 4 — Request limits

Add `lib/api/guard.ts` mirroring the approach used in `vitruvity-internal`:

- Reject a request whose body exceeds **32 KB** with `413` and `{ "error": "payload_too_large", "limit": 32768 }`. Enforce it on the bytes actually read, not only on `content-length`.
- Parse the JSON body once in the guard and return it, so handlers don't read the stream twice.
- `400` with `{ "error": "invalid_json" }` on a parse failure.
- Per-user token bucket keyed by `` `${userId}:${module}` ``: 20 requests per 5 minutes, `429` with `retryAfter`.
- Back it with a module-scoped `Map` and comment it verbatim: `// Temporary in-process ceiling: resets on deploy, not shared across instances.`
- No Redis, no Upstash, no new dependency.

Apply the guard to the four routes in step 3 and to any other handler that calls OpenAI, Perplexity or Pinecone. Do not apply it to routes that only read from Supabase.

## Step 5 — `.env.example` and README

Add `PERPLEXITY_API_KEY` to `env.example` — it is used by the code and currently missing from that file. Add a short README section listing every server-only variable (`OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `SUPABASE_SERVICE_ROLE_KEY`) with a line stating that none of them may ever be prefixed `NEXT_PUBLIC_`.

## Verification — two halves

### What you run, and paste into the PR

None of these need credentials. Start the app locally with `npm run dev` using placeholder environment values — each route must reject the caller *before* any provider or Supabase client is constructed, so these answer correctly even with fake keys. If a route errors on a missing key instead of returning `401`, the check is in the wrong place; fix it.

1. `curl -i localhost:3000/api/test-perplexity` → `404`.
2. `curl -i -X POST localhost:3000/api/research/analyze -H 'content-type: application/json' -d '{}'` with no auth header → `401`, `content-type: application/json`, not HTML. Repeat for `research/suggest`, `organize`, `parse-linkedin`.
3. The same four routes with a malformed `authorization` header → `401`.
4. A >32 KB body with no auth header → `401`, not `413` — auth is checked first. Confirm that ordering.
5. Signed-out navigation to a page route → redirect to the sign-in page.
6. `grep -rn "substring(0, 10)" .` → no matches outside `node_modules`.
7. `grep -rn "NEXT_PUBLIC_.*\(OPENAI\|PERPLEXITY\|PINECONE\|SERVICE_ROLE\)" .` → no matches outside `node_modules`.
8. Confirm all ten bearer call sites now route through the shared helper and none parse the `authorization` header inline.
9. `npm run build` → passes.

### What the requester runs — write it down for them

Add `docs/0B_VERIFICATION.md` containing the tests that need a real session or a deployed app, written so someone else can execute them: exact curl commands with placeholders for host and token, the exact expected status and body, one test per section, each independently runnable.

Cover at minimum:

- Zero new calls in the OpenAI and Perplexity dashboards after the unauthenticated attempts.
- An authenticated call to each of the four newly protected routes returns the same successful response as before this PR.
- An authenticated request with a >32 KB body returns `413`.
- 21 authenticated requests within five minutes — the 21st returns `429`.
- The six refactored bearer routes still work end to end: create a memory, delete a memory, delete a followup, and confirm the Pinecone deletion still fires in `delete-memory`.

Do not run these yourself, and do not fabricate their output.

## Stop and ask if

- The sign-in route path is ambiguous, or there is more than one.
- Adding the auth check changes any successful response body.
- A route appears to be called by something other than the RemindMe front end — a webhook, a cron job, an external integration. Those need a different mechanism than a user bearer token; do not guess.
- Refactoring the six existing bearer routes would change their behavior in any way.
- You are about to add a dependency, or touch anything under `components/` or a `page.tsx`.

## Do NOT do in this PR

- Add or change any RLS policy. A separate audit is running on the database; policy work is not yours.
- Reconcile the duplicated `app/api/meeting/*` and `app/api/meetings/*` namespaces.
- Change the `decide/habits/reorder` service-role usage.
- Any work related to migrating this app into Vitruvity Internal.

## PR description must include

- The verification output you were able to run.
- A statement that the credentialed tests in `docs/0B_VERIFICATION.md` are pending on the requester's side and have not been run.
- A note that `decide/habits/reorder` still uses the service-role key, deliberately unchanged.
- A note that the rate limiter is in-process and temporary.
- A reminder that `PERPLEXITY_API_KEY` rotation and provider spend caps are the requester's to confirm.
