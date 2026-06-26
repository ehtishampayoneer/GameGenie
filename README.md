# GameGenie — Phase 1

The first living brick: a web page where you talk to the Genie and he talks back.
No game yet — that's Phase 3. Right now we wake the Genie up and get him live.

---

## What's in here

```
gamegenie/
├── index.html      ← the page people see (talk + stage + the glowing Genie)
├── api/
│   └── chat.js     ← the Genie's brain (runs on Vercel, keeps your key secret)
└── README.md       ← this file
```

Two files do the work. `index.html` is the face. `api/chat.js` is the brain.
When you want to change how the Genie *looks*, edit `index.html`.
When you want to change how the Genie *talks* (his personality), edit the
`GENIE` text near the top of `api/chat.js`.

---

## Step 1 — Get your AI key (free credit to start)

1. Go to **console.anthropic.com** and sign up.
2. New accounts get some **free credit** — enough to build and test.
3. Open **API Keys**, click **Create Key**, copy it. Keep it somewhere safe.
   You paste it into Vercel in Step 4 — never into the code.

## Step 2 — Put the files on GitHub

1. On **github.com**, click **New repository**, name it `gamegenie`, create it.
2. Click **Add file → Upload files**.
3. Upload `index.html` and `README.md`.
4. The `api` folder: click **Add file → Create new file**, and in the name box
   type `api/chat.js` (typing the slash makes the folder). Paste in the
   contents of `chat.js`, then **Commit**.

## Step 3 — Connect Vercel

1. Go to **vercel.com**, sign in **with GitHub**.
2. **Add New → Project**, pick your `gamegenie` repo, click **Import**.
3. Don't change any build settings. Just click **Deploy**.

## Step 4 — Give the Genie his magic (the API key)

1. In your Vercel project, open **Settings → Environment Variables**.
2. Add one:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** the key you copied in Step 1
3. Save. Then open the **Deployments** tab and **Redeploy** the latest one
   (the key only takes effect after a fresh deploy).

## Step 5 — Talk to your Genie

Open the Vercel link. Type a wish. He answers. 🎉
That's Phase 1 — alive on the web, exactly the way you already work.

---

## Making changes later (the way you like it)

Everything lives in two files, so a change is surgical:

- **Genie's looks / colours / layout** → edit `index.html` on GitHub, commit,
  and Vercel makes it live automatically. No other steps.
- **Genie's personality / how he steers ideas** → edit the `GENIE` text in
  `api/chat.js`, commit, done.
- **Cheaper Genie** → in `api/chat.js`, change `MODEL` to
  `claude-haiku-4-5-20251001`.

## If the Genie says he's "not connected to his magic yet"

That means the API key isn't set. Re-check Step 4 — the name must be exactly
`ANTHROPIC_API_KEY`, and you must redeploy after adding it.

---

### What's next — Phase 2

The Genie starts quietly turning your conversation into a **blueprint**: the
structured order-ticket for your game. You'll see it forming. That's the bridge
to Phase 3, where the stage on the right finally comes alive.
