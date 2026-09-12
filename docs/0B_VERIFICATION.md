# 0B — Credentialed verification (NOT RUN)

These tests require a real Supabase session token and live OpenAI / Perplexity / Pinecone
credentials. They were **not executed** — no output below is recorded, only the expected
result. The requester runs them.

Placeholders used throughout:

- `HOST` — deployment origin, e.g. `https://remindme.example.com` (or `http://localhost:3000`)
- `TOKEN` — a valid Supabase access token (browser devtools → Application → Local Storage →
  `sb-<project-ref>-auth-token` → `access_token`)
- `MEMORY_ID`, `FOLLOWUP_ID` — ids returned by the calls below

```bash
export HOST="https://remindme.example.com"
export TOKEN="eyJ..."
```

---

## 1. No provider spend from unauthenticated attempts

Fire unauthenticated requests at every newly protected route, then check the OpenAI and
Perplexity dashboards.

```bash
for p in research/analyze research/suggest organize parse-linkedin; do
  curl -s -o /dev/null -w "$p -> %{http_code}\n" \
    -X POST -H 'Content-Type: application/json' -d '{}' "$HOST/api/$p"
done
```

Expected: each line prints `401`.

Expected dashboards: **zero** new requests recorded in the OpenAI usage dashboard
(platform.openai.com → Usage, filtered to the minute of the test) and **zero** new requests in
the Perplexity API dashboard for the same window.

---

## 2. Authenticated calls to the four newly protected routes return the pre-PR responses

Compare each response against the same call made before this PR (same request body).
The handlers were not otherwise modified, so the success payloads must be byte-identical in
shape.

```bash
curl -s -i -X POST "$HOST/api/parse-linkedin" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"profileText":"Jane Doe\nVP Engineering at Acme\nAbout: platform teams"}'
```

Expected: `200`, JSON object with `name`, `company`, `role`, `about`, `experience`,
`education`, `skills` keys (no `success` wrapper).

```bash
curl -s -i -X POST "$HOST/api/organize" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rawText":"Met Jane Doe, VP Eng at Acme. Follow up next week.","contextType":"business"}'
```

Expected: `200`, JSON with `people`, `memories`, `follow_ups`, `summary` fields as before.

```bash
curl -s -i -X POST "$HOST/api/research/analyze" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"interest","topic":"vector databases"}'
```

Expected: `200`, `{"success":true,"result":{...}}`.

```bash
curl -s -i -X POST "$HOST/api/research/suggest" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"userInput":"AI infrastructure","includeLinkedIn":false,"includeConversations":false,"includeMemories":false}'
```

Expected: `200`, `{"success":true,"suggestions":[...]}`.

---

## 3. Authenticated request over the 32 KB cap → 413

```bash
python3 -c "import json;print(json.dumps({'rawText':'x'*40000}))" > /tmp/big.json
wc -c /tmp/big.json   # expect ~40016 bytes

curl -s -i -X POST "$HOST/api/organize" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary @/tmp/big.json
```

Expected: `413` with body exactly `{"error":"payload_too_large","limit":32768}`.

Expected: no OpenAI usage recorded for this request.

---

## 4. Rate limit: 21 authenticated requests inside 5 minutes → 429

```bash
for i in $(seq 1 21); do
  code=$(curl -s -o /tmp/rl.json -w '%{http_code}' -X POST "$HOST/api/parse-linkedin" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d '{"profileText":"Jane Doe - VP Engineering at Acme"}')
  echo "request $i -> $code $(cat /tmp/rl.json | head -c 120)"
done
```

Expected: requests 1–20 return `200`; request 21 returns `429` with a body containing
`"error":"rate_limited"` and a numeric `retryAfter` (seconds until the window resets, ≤ 300).

Note: the bucket is per process. On a multi-instance deployment, run this against a single
instance, or expect up to 20 allowed requests per instance.

---

## 5. The six refactored bearer routes still work end to end

### 5a. Create a memory

```bash
curl -s -i -X POST "$HOST/api/save-memory" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rawText":"Met Jane Doe at a meetup","structuredData":{"people":[{"name":"Jane Doe","company":"Acme","role":"VP Engineering"}],"memories":[{"text":"Met Jane Doe at a meetup"}],"follow_ups":[{"description":"Send Jane the deck"}]}}'
```

Expected: `200` with `{"success":true,"memoryIds":["<uuid>"],"peopleCount":1,"followUpsCount":1,"eventId":null,"message":"Memory saved successfully!"}`.
Record `memoryIds[0]` as `MEMORY_ID`.

Expected side effect: the memory vector exists in Pinecone.

```bash
node check-pinecone.js   # or query the index for MEMORY_ID
```

### 5b. Delete the memory (and confirm the Pinecone delete fires)

```bash
export MEMORY_ID="<uuid from 5a>"
curl -s -i -X DELETE "$HOST/api/delete-memory/$MEMORY_ID" -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with `{"success":true,"message":"Memory deleted successfully"}`.

Expected Pinecone state: fetching `MEMORY_ID` from the index returns no vector. Expected
server log line: `✅ Memory deleted from Pinecone: <MEMORY_ID>` (and no
`⚠️ Pinecone deletion error`).

### 5c. Delete a follow-up

Take a follow-up id from the app (or the `follow_ups` table) created in 5a.

```bash
export FOLLOWUP_ID="<uuid>"
curl -s -i -X DELETE "$HOST/api/delete-followup/$FOLLOWUP_ID" -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with `{"success":true,"message":"Follow-up deleted successfully"}`.

### 5d. Update a follow-up

```bash
curl -s -i -X PATCH "$HOST/api/update-followup/$FOLLOWUP_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"done","priority":"high"}'
```

Expected: `200` with `{"success":true,"message":"Follow-up updated successfully"}`, and the
row's `status`/`priority` updated in Supabase.

### 5e. Delete a conversation

```bash
curl -s -i -X DELETE "$HOST/api/delete-conversation/<CONVERSATION_ID>" -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with `{"success":true,"message":"Conversation deleted successfully"}`, and the
matching Pinecone vector gone.

### 5f. Delete a person

```bash
curl -s -i -X DELETE "$HOST/api/delete-person/<PERSON_ID>" -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with `{"success":true}`; the person, their `memory_people` links, business
profiles and follow-ups are gone, and the associated memory vectors are removed from Pinecone.

---

## 6. Cross-user isolation (RLS still applies)

With `TOKEN` for user A, attempt to delete a memory id owned by user B.

```bash
curl -s -i -X DELETE "$HOST/api/delete-memory/<USER_B_MEMORY_ID>" -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with `{"success":true,...}` but user B's row still present — the handler scopes
the delete by `user_id` and the token-scoped client is subject to RLS. Nothing belonging to
user B may be modified.
