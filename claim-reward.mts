import { createClient } from "@supabase/supabase-js";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

export default async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers });

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return Response.json({ error: "Sign in is required." }, { status: 401, headers });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return Response.json({ error: "Server configuration is incomplete." }, { status: 500, headers });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return Response.json({ error: "Your session is invalid. Please sign in again." }, { status: 401, headers });

  let body: { kind?: string };
  try { body = await request.json() as { kind?: string }; }
  catch { return Response.json({ error: "Invalid request body." }, { status: 400, headers }); }

  const kind = body.kind;
  if (kind !== "mining" && kind !== "checkin") return Response.json({ error: "Unknown reward type." }, { status: 400, headers });

  const envName = kind === "mining" ? "MINE_MASTER_DAILY_REWARD" : "MINE_MASTER_CHECKIN_REWARD";
  const amount = Number(process.env[envName] || (kind === "mining" ? "10" : "2"));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return Response.json({ error: "Reward amount is not configured correctly." }, { status: 500, headers });

  // Claims are limited to one per UTC calendar day. The database enforces uniqueness.
  const day = new Date().toISOString().slice(0, 10);
  const reference = `${kind}:${day}`;
  const description = kind === "mining" ? "Daily mining reward" : "Daily check-in reward";
  const { error } = await admin.rpc("claim_reward", {
    p_user_id: authData.user.id,
    p_reward_type: kind,
    p_amount: amount,
    p_reference: reference,
    p_description: description
  });

  if (error) {
    const duplicate = error.message.toLowerCase().includes("already claimed") || error.code === "23505";
    return Response.json({ error: duplicate ? "You have already claimed this reward today. Try again tomorrow." : "Reward claim failed. Please try again later." }, { status: duplicate ? 409 : 400, headers });
  }

  return Response.json({ success: true, amount, currency: "MM points" }, { status: 200, headers });
};

