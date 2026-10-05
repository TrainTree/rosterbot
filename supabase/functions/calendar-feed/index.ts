import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function text(body: string, status = 200, extra: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: {
      ...cors,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      ...extra,
    },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return text("Not found", 404);

  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";

  // 32 random bytes encoded as base64url is normally 43 chars. Keep a small
  // range so malformed requests are rejected before touching the database.
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return text("Not found", 404);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return text("Calendar service unavailable", 503);

  const tokenHash = await sha256Hex(token);
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("calendar_feeds")
    .select("ics_text,enabled,updated_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  // Deliberately return the same response for unknown and disabled links.
  if (error || !data || !data.enabled) return text("Not found", 404);

  return new Response(data.ics_text || "", {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="RosterBot.ics"',
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Last-Modified": new Date(data.updated_at).toUTCString(),
    },
  });
});
