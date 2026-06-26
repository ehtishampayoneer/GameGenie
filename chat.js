/* ============================================================
   GameGenie — the Genie's brain  (Phase 1)
   ------------------------------------------------------------
   This runs on Vercel's servers, NOT in the browser, so your
   secret API key is never exposed to users.

   The key lives in an Environment Variable called
   ANTHROPIC_API_KEY  (you add it in Vercel — see README).

   To make the Genie cheaper later, change MODEL to
   'claude-haiku-4-5-20251001'. For the smartest replies keep
   Sonnet.
   ============================================================ */

const MODEL = 'claude-sonnet-4-6';

/* The Genie's personality. This is the single most important
   thing to refine over time — it is who GameGenie *is*. */
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
  Example shape: "Oh, you want that shooter energy — love it. Fortnite itself
  is a huge online world that took a studio years, so we won't clone that —
  but here's what we can make right now that feels awesome: ..."
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

export default async function handler(req, res){
  if(req.method !== 'POST'){
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if(!apiKey){
    return res.status(200).json({ error: 'missing_key' });
  }

  try{
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const messages = (body && body.messages) || [];

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: GENIE,
        messages: messages
      })
    });

    const data = await r.json();

    if(data.error){
      return res.status(200).json({ error: data.error.message || 'api_error' });
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return res.status(200).json({ text });

  }catch(err){
    return res.status(200).json({ error: 'server_error' });
  }
}
