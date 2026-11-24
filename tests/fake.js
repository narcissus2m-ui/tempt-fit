// Minimal PostgREST + GoTrue emulator over a real local Postgres (runs as role `authenticated` so RLS applies).
const { Pool, types } = require("pg");
types.setTypeParser(1082, (v) => v); // date는 PostgREST처럼 "YYYY-MM-DD" 문자열로
const pool = new Pool({ host: "localhost", user: "postgres", password: "pg", database: "sb" });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (p) => b64({ alg: "HS256", typ: "JWT" }) + "." + b64(p) + ".sig";
const ANON = jwt({ role: "anon", iss: "supabase" });
const users = new Map(); // email -> {id, password, meta}
const log = [];
const tokenUser = (h) => {
  const a = (h["authorization"] || "").replace(/^Bearer /, "");
  try { const p = JSON.parse(Buffer.from(a.split(".")[1], "base64url").toString()); return p.sub || null; } catch (e) { return null; }
};
function sessionFor(u, email) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: u.id, aud: "authenticated", role: "authenticated", email, user_metadata: u.meta, app_metadata: {}, created_at: new Date().toISOString() };
  return { access_token: jwt({ sub: u.id, role: "authenticated", exp, email }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r" + u.id, user };
}
const qi = (s) => '"' + s.replace(/"/g, "") + '"';
function where(params, args) {
  const parts = [];
  for (const [k, v] of params) {
    if (["select", "order", "offset", "limit", "on_conflict", "columns"].includes(k)) continue;
    let m;
    if ((m = v.match(/^eq\.(.*)$/))) { args.push(m[1]); parts.push(`${qi(k)}::text = $${args.length}`); }
    else if ((m = v.match(/^in\.\((.*)\)$/))) { args.push(m[1].split(",").map((x) => x.replace(/^"|"$/g, ""))); parts.push(`${qi(k)}::text = any($${args.length})`); }
    else throw new Error("filter " + k + "=" + v);
  }
  return parts.length ? " where " + parts.join(" and ") : "";
}
async function asUser(sub, fn) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(sub ? "set local role authenticated" : "set local role anon");
    await c.query("select set_config('request.jwt.claim.sub', $1, true)", [sub || ""]);
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) { await c.query("rollback"); throw e; } finally { c.release(); }
}
async function handle(method, url, headers, bodyText, bodyBuf) {
  const u = new URL(url); const p = u.pathname;
  if (p.startsWith("/storage/v1/")) return storage(method, u, headers, bodyText, bodyBuf);
  const body = bodyText ? JSON.parse(bodyText) : null;
  log.push(method + " " + p + u.search);
  if (p.startsWith("/auth/v1/")) {
    if (p === "/auth/v1/signup") {
      if (users.has(body.email)) return [422, { code: 422, error_code: "user_already_exists", msg: "User already registered" }];
      let r;
      try { r = await pool.query("insert into auth.users(raw_user_meta_data) values ($1) returning id, raw_user_meta_data", [body.data || {}]); }
      catch (e) { return [500, { code: 500, error_code: "unexpected_failure", msg: "Database error saving new user" }]; }
      const uu = { id: r.rows[0].id, password: body.password, meta: r.rows[0].raw_user_meta_data }; users.set(body.email, uu);
      return [200, sessionFor(uu, body.email)];
    }
    if (p === "/auth/v1/token") {
      const uu = users.get(body.email);
      if (!uu || uu.password !== body.password) return [400, { error: "invalid_grant", error_description: "Invalid login credentials", code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }];
      return [200, sessionFor(uu, body.email)];
    }
    if (p === "/auth/v1/logout") return [204, null];
    if (p === "/auth/v1/user") { const sub = tokenUser(headers); for (const [e, uu] of users) if (uu.id === sub) return [200, sessionFor(uu, e).user]; return [401, { msg: "no" }]; }
    return [404, { msg: "auth " + p }];
  }
  const sub = tokenUser(headers);
  try {
    if (p.startsWith("/rest/v1/rpc/")) {
      const fn = p.split("/").pop(); const keys = Object.keys(body || {});
      const call = `public.${qi(fn)}(${keys.map((k, i) => `${qi(k)} => $${i + 1}`).join(",")})`;
      const info = (await pool.query("select proretset s, proargnames n, proargtypes::regtype[]::text[] t from pg_proc where proname=$1 and pronamespace='public'::regnamespace limit 1", [fn])).rows[0] || {};
      const typeOf = (k) => { const i = (info.n || []).indexOf(k); return i >= 0 ? (info.t || [])[i] : null; };
      // json/jsonb 인자는 JSON 문자열로 (node-pg는 배열을 Postgres 배열로 바꿈)
      const val = (k) => (/json/.test(typeOf(k) || "") && body[k] != null ? JSON.stringify(body[k]) : body[k]);
      const r = await asUser(sub, (c) => c.query(info.s ? `select coalesce(json_agg(t), '[]'::json) as v from ${call} t` : `select ${call} as v`, keys.map(val)));
      return [200, r.rows[0].v];
    }
    const table = qi(p.replace("/rest/v1/", ""));
    const params = [...u.searchParams.entries()]; const args = [];
    const prefer = headers["prefer"] || "";
    const sel = u.searchParams.get("select") || "*";
    const cols = sel === "*" ? "*" : sel.split(",").map(qi).join(",");
    if (method === "GET") {
      let sql = `select ${cols} from public.${table}` + where(params, args);
      const ord = u.searchParams.get("order");
      if (ord) sql += " order by " + ord.split(",").map((o) => { const [c, d] = o.split("."); return qi(c) + (d === "desc" ? " desc" : " asc"); }).join(",");
      if (u.searchParams.get("limit")) sql += " limit " + +u.searchParams.get("limit");
      if (u.searchParams.get("offset")) sql += " offset " + +u.searchParams.get("offset");
      const r = await asUser(sub, (c) => c.query(sql, args));
      if ((headers["accept"] || "").includes("vnd.pgrst.object")) return r.rows.length === 1 ? [200, r.rows[0]] : [406, { code: "PGRST116", message: "not single" }];
      return [200, r.rows];
    }
    const ret = prefer.includes("return=representation");
    if (method === "POST") {
      const rows = Array.isArray(body) ? body : [body];
      const keys = [...new Set(rows.flatMap(Object.keys))];
      args.push(JSON.stringify(rows));
      let sql = `insert into public.${table} (${keys.map(qi).join(",")}) select ${keys.map(qi).join(",")} from json_populate_recordset(null::public.${table}, $1)`;
      const oc = u.searchParams.get("on_conflict");
      if (prefer.includes("resolution=ignore-duplicates")) sql += ` on conflict (${qi(oc || "id")}) do nothing`;
      else if (prefer.includes("resolution=merge-duplicates")) sql += ` on conflict (${qi(oc || "id")}) do update set ` + keys.map((k) => `${qi(k)} = excluded.${qi(k)}`).join(",");
      if (ret) sql += ` returning ${cols}`;
      const r = await asUser(sub, (c) => c.query(sql, args));
      return [ret ? 201 : 201, ret ? r.rows : null];
    }
    if (method === "PATCH") {
      const keys = Object.keys(body); args.push(JSON.stringify(body));
      const w = where(params, args);
      const sql = `update public.${table} set ${keys.map((k) => `${qi(k)} = (json_populate_record(null::public.${table}, $1)).${qi(k)}`).join(",")}${w}${ret ? " returning " + cols : ""}`;
      const r = await asUser(sub, (c) => c.query(sql, args));
      return [ret ? 200 : 204, ret ? r.rows : null];
    }
    if (method === "DELETE") {
      const r = await asUser(sub, (c) => c.query(`delete from public.${table}` + where(params, args) + (ret ? " returning " + cols : ""), args));
      return [ret ? 200 : 204, ret ? r.rows : null];
    }
  } catch (e) {
    const code = e.code === "42501" ? 403 : e.code === "P0001" ? 400 : 400;
    return [code, { code: e.code, message: e.message, details: null, hint: null }];
  }
  return [404, { message: "?" }];
}
// Storage: objects live in storage.objects (bytes column), inserted/selected as the user so RLS policies apply
const sigs = new Map();
async function storage(method, u, headers, bodyText, bodyBuf) {
  const p = u.pathname.replace("/storage/v1/", ""); const sub = tokenUser(headers);
  log.push(method + " /storage/" + p);
  try {
    let m;
    if (method === "POST" && (m = p.match(/^object\/sign\/([^/]+)$/))) {
      const b = JSON.parse(bodyText); const out = [];
      for (const path of b.paths) {
        const r = await asUser(sub, (c) => c.query("select name from storage.objects where bucket_id=$1 and name=$2", [m[1], path]));
        if (!r.rows.length) { out.push({ error: "not found", path, signedURL: null }); continue; }
        const tok = "t" + Math.random().toString(36).slice(2); sigs.set(tok, [m[1], path]);
        out.push({ error: null, path, signedURL: `/object/sign/${m[1]}/${path}?token=${tok}` });
      }
      return [200, out];
    }
    if (method === "GET" && (m = p.match(/^object\/sign\/([^/]+)\/(.+)$/))) {
      const t = sigs.get(u.searchParams.get("token")); if (!t) return [400, { message: "bad token" }];
      const r = await pool.query("select bytes, mime from storage.objects where bucket_id=$1 and name=$2", t);
      if (!r.rows.length) return [404, { message: "gone" }];
      return [200, { __raw: r.rows[0].bytes, mime: r.rows[0].mime }];
    }
    if (method === "POST" && (m = p.match(/^object\/([^/]+)\/(.+)$/))) {
      const size = bodyBuf ? bodyBuf.length : 0;
      if (size > 52428800) return [413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" }];
      let ct = headers["content-type"] || ""; let data = bodyBuf;
      const bm = ct.match(/boundary=(.+)$/);
      if (bm) { // multipart: take the file part (name="")
        const parts = bodyBuf.toString("latin1").split("--" + bm[1]);
        const fp = parts.find((x) => /name=""/.test(x));
        const i = fp.indexOf("\r\n\r\n"); const hdr = fp.slice(0, i);
        ct = (hdr.match(/Content-Type: (.+)/i) || [])[1] || "application/octet-stream";
        data = Buffer.from(fp.slice(i + 4, fp.length - 2), "latin1");
      }
      await asUser(sub, (c) => c.query("insert into storage.objects(bucket_id, name, mime, bytes) values ($1,$2,$3,$4)", [m[1], decodeURIComponent(m[2]), ct.trim(), data]));
      return [200, { Key: m[1] + "/" + m[2] }];
    }
    if (method === "DELETE" && (m = p.match(/^object\/([^/]+)$/))) {
      const b = JSON.parse(bodyText);
      const r = await asUser(sub, (c) => c.query("delete from storage.objects where bucket_id=$1 and name = any($2) returning name", [m[1], b.prefixes]));
      return [200, r.rows.map((x) => ({ name: x.name }))];
    }
  } catch (e) { return [e.code === "42501" ? 403 : 400, { statusCode: "403", error: "Unauthorized", message: e.message }]; }
  return [404, { message: "storage " + p }];
}
module.exports = { handle, pool, ANON, log };
