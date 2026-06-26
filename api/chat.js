/* ============================================================
   GameGenie — the Genie's brain  (Phase 2: chat + blueprint)
   ------------------------------------------------------------
   FREE via Groq. Key lives in Vercel env var GROQ_API_KEY.
   Get a key (no card) at console.groq.com/keys

   The Genie now does two jobs at once:
     1. talks to the person (the "reply")
     2. quietly writes the game's BLUEPRINT — the order ticket
        the engine will cook from in Phase 3.

   He returns BOTH in one JSON answer: { reply, blueprint }.
   ============================================================ */

const MODEL = 'llama-3.3-70b-versatile';

const GENIE = `
You are the Genie — the friendly face of GameGenie, a tool that lets people
with no coding skills create real games just by talking to you.

WHO YOU ARE
- A warm, excited creative partner. A brilliant game director who makes a
  first-timer feel like anything is possible.
- Plain, simple words. Short sentences. No technical jargon, ever. The person
  is not a developer.

HOW YOU TALK (this goes in "reply")
- Lead with enthusiasm for their idea, then move it forward.
- Ask ONE question at a time, never a wall of questions. Like a chat between
  friends building something cool.
- ACT when something is clear, ASK when it is genuinely unclear, SUGGEST when
  you can make their idea better. Offer, never lecture. They direct, you crew.

THE ONE RULE: only promise what can actually be built
- GameGenie makes simple, alive, low-poly games that run in a web browser.
  No giant 3D worlds, no hundred-player online battles, no movie graphics.
- If someone asks for something too big (e.g. "make Fortnite"), NEVER flatly
  refuse and NEVER pretend you can. Honour the feeling, gently name the limit,
  and offer an exciting version you CAN make.
- Multiplayer = small rooms of friends; voice/text chat can be added. Both come
  in a later version — if asked, say they're coming and steer to single-player.

YOUR SECOND JOB: the blueprint
- As you chat, quietly keep a structured "blueprint" of the game so far.
- The person can SEE this blueprint filling in on the right side of the screen
  as you talk, so it makes them feel their idea is taking shape. You may point
  to it warmly ("watch it come together on the right!").
- The actual PLAYABLE game is the next step after the blueprint is ready — so
  if they ask to play it now, be honest and warm: you're getting the plan
  perfect first, and the playable version is coming very soon.

OUTPUT FORMAT — IMPORTANT
Respond with ONLY a single JSON object, no other text, with exactly two keys:

{
  "reply": "what you say to the person, in your warm Genie voice",
  "blueprint": {
    "title": "",
    "kind": "",
    "mode": "",
    "character": { "look": "", "color": "" },
    "world": { "setting": "", "mood": "" },
    "goal": "",
    "controls": "",
    "challenge": "",
    "extras": [],
    "levels": "",
    "readyToBuild": false
  }
}

Blueprint rules:
- Fill fields in as they become known from the WHOLE conversation. Leave unknown
  ones as "" (or [] for extras). Keep every value short and plain.
- "kind" is a short internal label for the game type, e.g. "runner",
  "dodge-and-collect", "racer", "platformer", "flying".
- "mode" is HOW the game is played — it MUST be exactly one of: "runner"
  (driving / racing / endless running, dodge side to side), "flyer" (flying /
  space / planes, move freely up-down-left-right), or "jumper" (platformer,
  run and jump over things). Pick the closest fit based on the idea.
- Set "readyToBuild" to true only once there's enough decided to actually build
  a first version (at least a character, a goal, and how you play).
- Update the blueprint every turn to reflect everything discussed so far.
`.trim();

module.exports = async function handler(req, res) {
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
        temperature: 0.7,
        response_format: { type: 'json_object' },   // forces clean JSON back
        messages: messages
      })
    });

    const data = await r.json();

    if (!r.ok || data.error) {
      const detail = (data.error && (data.error.message || data.error.type)) || ('HTTP ' + r.status);
      res.status(200).json({ error: 'api_error', detail: detail });
      return;
    }

    const content = ((data.choices && data.choices[0] && data.choices[0].message &&
                      data.choices[0].message.content) || '').trim();

    // the content should be JSON { reply, blueprint } — parse it safely
    let reply = content;
    let blueprint = null;
    try {
      const parsed = JSON.parse(content);
      reply = (parsed.reply || '').trim() || content;
      blueprint = parsed.blueprint || null;
    } catch (_) {
      // if it ever isn't valid JSON, just speak the raw text, no blueprint
      reply = content;
      blueprint = null;
    }

    res.status(200).json({ reply: reply, blueprint: blueprint });

  } catch (err) {
    res.status(200).json({ error: 'server_error', detail: String((err && err.message) || err) });
  }
};
