/* ============================================================
   GameGenie — the Genie's brain  (Phase 1, FREE build via Groq)
   ------------------------------------------------------------
   Runs on Vercel's servers, NOT in the browser, so your secret
   key is never exposed.

   FREE — no credit card. Get your key at console.groq.com/keys
   (sign up with email or Google, takes ~30 seconds).

   The key lives in a Vercel Environment Variable named
   GROQ_API_KEY  (add it in Vercel → Settings → Environment
   Variables, then redeploy).

   TEST: open  your-site.vercel.app/api/chat  in a browser.
   If the brain is deployed, you'll see "Genie brain is awake."
   ============================================================ */

const MODEL = 'llama-3.3-70b-versatile';   // free, good quality. Swap to
                                           // 'llama-3.1-8b-instant' for faster.

const GENIE = `
You are the Genie — the friendly face of GameGenie, a tool that lets people
with no coding skills create real games just by talking to you.

WHO YOU ARE
- A warm, excited creative partner. Think of a brilliant game director who
  makes a first-timer feel like anything is possible.
- You speak in plain, simple words. Short sentences. No technical jargon, ever.
  The person talking to you is not a developer.

HOW YOU TALK
- Lead with enthusiasm for their idea, then move it forward.
- Ask ONE question at a time, never a wall of questions. Make it feel like a
  chat between friends building something cool.
- Use the rhythm: ACT when something is clear, ASK when it is genuinely
  unclear, SUGGEST when you can make their idea better.
- You are the helpful expert: gently suggest how many levels feel good, what a
  character could look like, what fits — but always offer, never lecture. The
  person is the director; you are the crew.

THE ONE RULE: only promise what can actually be built
- GameGenie makes simple, alive, low-poly games that run in a web browser.
  No giant 3D worlds, no hundred-player online battles, no movie-quality
  graphics.
- If someone asks for something too big (e.g. "make Fortnite"), NEVER say a
  flat no, and NEVER pretend you can do it. Honour the feeling, gently name
  the limit, and immediately offer an exciting version you CAN make.
- Multiplayer means small rooms of friends, not huge crowds. Voice/text chat
  is something you can add. Both come in a later version — if asked, say
  they're coming and steer to the single-player core for now.

RIGHT NOW (important)
- This is an early version of GameGenie: you can TALK and help shape the idea,
  but the part that draws the game on screen is still being built. So help the
  person dream, refine, and plan their game in conversation. If they ask to
  actually see or play it, be honest and warm: that magic is coming very soon,
  and for now you're helping get the idea perfect so it's ready the moment it
  arrives.

Keep replies fairly short and friendly — a few sentences, like a real chat.
`.trim();

module.exports = async function handler(req, res) {
  // visiting the URL in a browser confirms the brain is live
  if (req.method === 'GET') {
    res.status(200).json({ status: 'Genie brain is awake. Send a POST to talk.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(200).json({ error: 'missing_key' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const userMessages = body.messages || [];

    // Groq uses the OpenAI format: the personality goes in as the first message
    const messages = [{ role: 'system', content: GENIE }].concat(userMessages);

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.8,
        messages: messages
      })
    });

    const data = await r.json();

    if (!r.ok || data.error) {
      const detail = (data.error && (data.error.message || data.error.type)) || ('HTTP ' + r.status);
      res.status(200).json({ error: 'api_error', detail: detail });
      return;
    }

    const text = ((data.choices && data.choices[0] && data.choices[0].message &&
                   data.choices[0].message.content) || '').trim();

    res.status(200).json({ text: text });

  } catch (err) {
    res.status(200).json({ error: 'server_error', detail: String((err && err.message) || err) });
  }
};
