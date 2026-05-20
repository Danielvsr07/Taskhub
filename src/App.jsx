import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
let _sb = null;
const SUPABASE_URL = "https://azoabvqhwoctdrfrkjhg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b2FidnFod29jdGRyZnJramhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDg4MTIsImV4cCI6MjA5MzEyNDgxMn0.Ju9xLLVrATyes_WKrDKj2E1rv5EV5Rnc82kxk2UlKds";

async function initSB() {
  if (_sb) return _sb;
  await new Promise((res, rej) => {
    if (window.supabase) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}
const sb = () => _sb;

// Always-ready Supabase — initializes if not yet done
async function getSB() {
  if (_sb) return _sb;
  return await initSB();
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "taskhub_v5";
const SESSION_KEY = "taskhub_session";
const ls = {
  get: () => { try { return JSON.parse(localStorage.getItem(LS_KEY)||"null"); } catch { return null; } },
  set: d => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} },
};
const session = {
  get: () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)||"null"); } catch { return null; } },
  set: u => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {} },
  clear: () => { try { localStorage.removeItem(SESSION_KEY); } catch {} },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SQUADS = ["industria","reparadores","inovacao"];
const SQUAD_LABEL = { industria:"Indústria", reparadores:"Reparadores", inovacao:"Inovação" };
const SQUAD_ICON  = {
  industria:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>,
  reparadores: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  inovacao:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
};
const SQUAD_COLOR = {
  industria:   { h:"#00c9a7", rgb:"0,201,167" },
  reparadores: { h:"#f7971e", rgb:"247,151,30" },
  inovacao:    { h:"#a78bfa", rgb:"167,139,250" },
};
const PRIO_LABEL = { critica:"Crítica", alta:"Alta", media:"Média", baixa:"Baixa" };
const PRIO_COLOR = { critica:"#ef4444", alta:"#f97316", media:"#eab308", baixa:"#22c55e" };
const PRIO_ORDER = { critica:0, alta:1, media:2, baixa:3 };
const TAG_LABEL  = { nova_demanda:"Nova Demanda", bug:"Correção de Bug" };
const TAG_COLOR  = { nova_demanda:"#38bdf8", bug:"#f472b6" };
const TAG_ICON   = { nova_demanda:"✦", bug:"⬡" };

const STATUS = {
  pendente:    { label:"Pendente",       icon:"⏳", color:"#64748b", dot:"#94a3b8", order:0 },
  aprovada:    { label:"Aprovada",       icon:"✅", color:"#22c55e", dot:"#4ade80", order:1 },
  em_andamento:{ label:"Em Andamento",   icon:"↻", color:"#3b82f6", dot:"#60a5fa", order:2 },
  em_aprovacao:{ label:"Em Aprovação",   icon:"◎", color:"#f59e0b", dot:"#fbbf24", order:3 },
  concluida:   { label:"Concluída",      icon:"✓", color:"#8b5cf6", dot:"#a78bfa", order:4 },
  rejeitada:   { label:"Rejeitada",      icon:"❌", color:"#ef4444", dot:"#f87171", order:5 },
};
const FLOW = ["pendente","aprovada","em_andamento","em_aprovacao","concluida"];

const ROLES = {
  admin:     { label:"Admin",      icon:"◈", color:"#818cf8" },
  moderador: { label:"Moderador",  icon:"⚖", color:"#f472b6" },
  reparador: { label:"Reparador",  icon:"⚙", color:"#f7971e" },
  industria: { label:"Indústria",  icon:"▦", color:"#00c9a7" },
  inovacao:  { label:"Inovação",   icon:"◎", color:"#a78bfa" },
  user:      { label:"Usuário",    icon:"○", color:"#38bdf8" },
};
const ADMIN_EMAILS = ["daniel.cunha@oficinabrasil.com.br"];

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const SPRINT_ANCHOR = new Date("2025-01-06");
function sprintNum(date = new Date()) {
  return Math.max(1, Math.floor((new Date(date) - SPRINT_ANCHOR) / (14 * 86400000)) + 1);
}
function sprintDates(n, overrides = {}) {
  if (overrides[n]) return { start: new Date(overrides[n].start + "T00:00:00"), end: new Date(overrides[n].end + "T00:00:00"), custom: true };
  const start = new Date(SPRINT_ANCHOR.getTime() + (n - 1) * 14 * 86400000);
  return { start, end: new Date(start.getTime() + 13 * 86400000), custom: false };
}
function sprintRange(n, overrides = {}) {
  const { start, end, custom } = sprintDates(n, overrides);
  const o = { day:"2-digit", month:"short" };
  return `${start.toLocaleDateString("pt-BR",o)} – ${end.toLocaleDateString("pt-BR",o)}${custom?" ✎":""}`;
}
function toISO(d) { return d.toISOString().slice(0, 10); }
const curSprint = () => sprintNum();

// ─────────────────────────────────────────────────────────────────────────────
// DB LAYER
// ─────────────────────────────────────────────────────────────────────────────
async function dbDemands() {
  const s = await getSB(); if (s) { const { data } = await s.from("demands").select("*").order("created_at",{ascending:false}); return data||[]; }
  return ls.get()?.demands||[];
}
async function dbInsertDemand(d) {
  const s = await getSB();
  if (s) {
    const { error } = await s.from("demands").insert([d]);
    if (error) { console.error("dbInsertDemand error:", error.message); }
    else return;
  }
  const data = ls.get()||{demands:[]}; data.demands = [d,...data.demands]; ls.set(data);
}
async function dbUpdateDemand(id, patch) {
  const s = await getSB();
  if (s) { const { error } = await s.from("demands").update(patch).eq("id",id); if(error) console.error("dbUpdateDemand:",error.message); return; }
  const data = ls.get()||{demands:[]}; data.demands = data.demands.map(d=>d.id===id?{...d,...patch}:d); ls.set(data);
}
async function dbDeleteDemand(id) {
  const s = await getSB();
  if (s) { await s.from("demands").delete().eq("id",id); return; }
  const data = ls.get()||{demands:[]}; data.demands = data.demands.filter(d=>d.id!==id); ls.set(data);
}
function parseProfile(p) {
  if (!p) return p;
  let roles = p.roles;
  if (typeof roles==="string") { try { roles=JSON.parse(roles); } catch { roles=[p.role||"user"]; } }
  if (!roles||!roles.length) roles=[p.role||"user"];
  return {...p,roles};
}
async function dbProfiles() {
  const s = await getSB(); if (s) { const { data } = await s.from("profiles").select("*"); return (data||[]).map(parseProfile); }
  return Object.values(ls.get()?.profiles||{});
}
async function dbProfile(id) {
  const s = await getSB(); if (s) { const { data } = await s.from("profiles").select("*").eq("id",id).single(); return parseProfile(data); }
  return parseProfile(ls.get()?.profiles?.[id]||null);
}
async function dbProfileByEmail(email) {
  const s = sb(); if (s) { const { data } = await s.from("profiles").select("*").eq("email",email).single(); return data||null; }
  // fallback: search localStorage users
  const u = ls.get()?.users?.find(u=>u.email===email); return u||null;
}
async function dbLogin(email, password) {
  const s = sb();
  if (s) {
    const { data, error } = await s.from("profiles").select("*").eq("email",email).eq("password",password).single();
    if (error||!data) return null;
    return data;
  }
  const u = ls.get()?.users?.find(u=>u.email===email&&u.password===password);
  return u||null;
}
async function dbRegister(email, password, name) {
  const s = sb();
  // Check if already exists
  const exists = await dbProfileByEmail(email);
  if (exists) return { error:"E-mail já cadastrado." };
  const role = ADMIN_EMAILS.includes(email)?"admin":"user";
  const profile = {id:email,email,name,role,password,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  if (s) {
    const { error } = await s.from("profiles").insert([profile]);
    if (error) return { error: error.message };
  } else {
    const data = ls.get()||{users:[],profiles:{}};
    data.users = [...(data.users||[]),{...profile}];
    data.profiles = {...(data.profiles||{}), [email]:profile};
    ls.set(data);
  }
  return { user: profile };
}
async function dbResetPassword(email) {
  const s = sb();
  const tmp = Math.random().toString(36).slice(2,10).toUpperCase();
  if (s) {
    const { error } = await s.from("profiles").update({password:tmp}).eq("email",email);
    if (error) return { error: error.message };
  } else {
    const data = ls.get()||{users:[]};
    const u = data.users?.find(u=>u.email===email);
    if (!u) return { error:"E-mail não encontrado." };
    u.password = tmp; ls.set(data);
  }
  return { tmp };
}
async function dbUpsertProfile(p) {
  const s = await getSB();
  if (s) {
    const payload = {...p};
    if (payload.password===undefined) delete payload.password;
    // Store roles as JSON string if array (Supabase may not have jsonb column)
    if (Array.isArray(payload.roles)) payload.roles = JSON.stringify(payload.roles);
    const { error } = await s.from("profiles").upsert([payload]);
    if (error) console.error("dbUpsertProfile:", error.message);
    return;
  }
  const data = ls.get()||{profiles:{}}; data.profiles = {...(data.profiles||{}), [p.id]:p}; ls.set(data);
}
async function dbAvatar(userId, file) {
  const s = sb();
  if (s) {
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;
    await s.storage.from("avatars").upload(path, file, {upsert:true});
    const { data } = s.storage.from("avatars").getPublicUrl(path);
    return data?.publicUrl||null;
  }
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file); });
}
async function dbConfig() {
  const s = sb(); if (s) { const { data } = await s.from("config").select("*").eq("id","main").single(); return data||{}; }
  return ls.get()?.config||{};
}
async function dbSetConfig(patch) {
  const s = sb(); if (s) { await s.from("config").upsert({id:"main",...patch}); return; }
  const data = ls.get()||{}; data.config={...(data.config||{}),...patch}; ls.set(data);
}
async function dbNotifications(userId) {
  const s = sb(); if (s) { const { data } = await s.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(30); return data||[]; }
  return (ls.get()?.notifications||[]).filter(n=>n.user_id===userId);
}
async function dbInsertNotif(n) {
  const s = await getSB(); if (s) { await s.from("notifications").insert([n]); return; }
  const data = ls.get()||{notifications:[]}; data.notifications=[n,...(data.notifications||[])]; ls.set(data);
}

// ── Power Automate webhook ──
async function triggerPowerAutomate(webhookUrl, payload) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload),
      mode:"no-cors"
    });
  } catch(e) { console.warn("Power Automate webhook error:", e.message); }
}

async function notifyPowerAutomate(demand, event, adminNote="") {
  const s = await getSB();
  if (!s) return;
  const { data: cfg } = await s.from("config").select("*").eq("id",1).single();
  const webhookUrl = cfg?.email_config?.powerAutomateUrl;
  if (!webhookUrl) return;
  const sm = STATUS[demand.status]||STATUS.pendente;
  await triggerPowerAutomate(webhookUrl, {
    event,
    demand_id: demand.id,
    demand_title: demand.title,
    demand_squad: SQUAD_LABEL[demand.squad]||demand.squad,
    demand_status: sm.label,
    demand_priority: PRIO_LABEL[demand.priority]||demand.priority,
    user_email: demand.user_email,
    user_name: demand.user_name,
    admin_note: adminNote,
    sprint: demand.sprint ? `Sprint ${demand.sprint}` : "Não atribuída",
    updated_at: new Date().toISOString(),
    app_url: window.location.origin,
  });
}
async function dbMarkRead(userId) {
  const s = sb(); if (s) { await s.from("notifications").update({read:true}).eq("user_id",userId); return; }
  const data = ls.get()||{notifications:[]}; data.notifications=(data.notifications||[]).map(n=>n.user_id===userId?{...n,read:true}:n); ls.set(data);
}
async function dbBacklog() {
  const s = sb(); if (s) { const { data } = await s.from("backlog").select("*").order("created_at",{ascending:false}); return data||[]; }
  return ls.get()?.backlog||[];
}
async function dbUpsertBacklog(item) {
  const s = await getSB(); if (s) { await s.from("backlog").upsert([item]); return; }
  const data = ls.get()||{backlog:[]}; const exists=data.backlog.find(x=>x.id===item.id);
  data.backlog = exists?data.backlog.map(x=>x.id===item.id?item:x):[...data.backlog,item]; ls.set(data);
}
async function dbDeleteBacklog(id) {
  const s = await getSB(); if (s) { await s.from("backlog").delete().eq("id",id); return; }
  const data = ls.get()||{backlog:[]}; data.backlog=data.backlog.filter(x=>x.id!==id); ls.set(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEND EMAIL  (free tier: 100/day, no backend needed)
// ─────────────────────────────────────────────────────────────────────────────
async function sendResend({ apiKey, from, to, subject, html }) {
  if (!apiKey) return { ok: false, reason: "Resend API Key não configurada" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, id: data.id };
    return { ok: false, reason: data.message || `HTTP ${res.status}` };
  } catch (e) { return { ok: false, reason: e.message }; }
}

function buildEmailHtml({ title, toName, statusLabel, statusIcon, squadLabel, sprint, sprintRange: sr, adminNote, dateTime, description }) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><style>
body{font-family:Inter,system-ui,sans-serif;background:#0d1117;color:#e2eaf8;margin:0;padding:0}
.wrap{max-width:580px;margin:0 auto;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937}
.header{background:linear-gradient(135deg,#1e3a5f,#1e293b);padding:32px 36px;text-align:center}
.logo{font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff}
.logo span{background:linear-gradient(135deg,#3b82f6,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.body{padding:32px 36px}
.status-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);color:#60a5fa;font-size:14px;font-weight:700;margin-bottom:24px}
h2{font-size:20px;font-weight:700;margin:0 0 8px;color:#f0f4ff}
.desc{font-size:14px;color:#a8bdd4;line-height:1.6;margin:0 0 24px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
.info-item{background:#1f2937;border-radius:10px;padding:14px;border:1px solid #374151}
.info-label{font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.info-value{font-size:14px;font-weight:600;color:#e2eaf8}
.note{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:10px;padding:16px;margin-bottom:24px}
.note-label{font-size:11px;color:#818cf8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.note-text{font-size:13px;color:#c7d2fe;line-height:1.6}
.footer{background:#0d1117;padding:20px 36px;text-align:center;font-size:12px;color:#4b5563;border-top:1px solid #1f2937}
.cta{display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none}
</style></head>
<body><div style="padding:24px"><div class="wrap">
<div class="header"><div class="logo">Task<span>HUB</span></div><div style="font-size:13px;color:#94a3b8;margin-top:6px">Atualização de demanda</div></div>
<div class="body">
<div class="status-badge">${statusIcon} ${statusLabel}</div>
<h2>${title}</h2>
<p class="desc">${description}</p>
<div class="info-grid">
  <div class="info-item"><div class="info-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Solicitante</div><div class="info-value">${toName}</div></div>
  <div class="info-item"><div class="info-label"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg> Squad</div><div class="info-value">${squadLabel}</div></div>
  ${sprint ? `<div class="info-item"><div class="info-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Sprint</div><div class="info-value">Sprint ${sprint}</div></div>` : ""}
  ${sr ? `<div class="info-item"><div class="info-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Período</div><div class="info-value">${sr}</div></div>` : ""}
  <div class="info-item"><div class="info-label"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Data/Hora</div><div class="info-value">${dateTime}</div></div>
</div>
${adminNote ? `<div class="note"><div class="note-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Nota do Gestor</div><div class="note-text">${adminNote}</div></div>` : ""}
</div>
<div class="footer">TaskHUB — Plataforma de Gestão de Demandas<br/>Este e-mail foi enviado automaticamente.</div>
</div></div></body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = iso => { if (!iso) return "—"; const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); };
const fmtDate = iso => { if (!iso) return "—"; return new Date(iso).toLocaleDateString("pt-BR"); };
const resolveRole = (email, stored) => ADMIN_EMAILS.includes(email) ? "admin" : (stored || "user");

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#111318;--s1:#16191f;--s2:#1c2028;--s3:#22262f;--s4:#282d38;
  --border:#2a2f3a;--border2:#363c4a;
  --t1:#eceef2;--t2:#8990a0;--t3:#52586a;
  --blue:#5b8dee;--blue2:#4b7fe8;--indigo:#7c83f5;--green:#3ecf8e;
  --font:'Inter',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --r:14px;--rs:9px;--rx:18px;--nav-h:60px;
}
body{background:var(--bg);color:var(--t1);font-family:var(--font);min-height:100vh;overflow-x:hidden;line-height:1.5}
::selection{background:rgba(79,142,247,.28);color:#fff}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px}
::-webkit-scrollbar-thumb:hover{background:var(--t3)}
input,textarea,select,button{font-family:var(--font)}
a{color:var(--blue);text-decoration:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
@keyframes slideRight{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(79,142,247,.2)}50%{box-shadow:0 0 40px rgba(79,142,247,.5)}}
@keyframes shimmer{0%{opacity:.5}50%{opacity:.9}100%{opacity:.5}}
.card{background:var(--s2);border:1px solid var(--border);border-radius:var(--r);transition:border-color .22s,transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s}
.card:hover{border-color:var(--border2);transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.55)}
.btn{cursor:pointer;border:none;font-family:var(--font);display:inline-flex;align-items:center;gap:7px;font-weight:600;transition:all .16s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;line-height:1}
.btn-primary{background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);color:#fff;padding:10px 20px;border-radius:var(--rs);font-size:14px;box-shadow:0 4px 20px rgba(99,102,241,.35)}
.btn-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 8px 28px rgba(99,102,241,.5);filter:brightness(1.1)}
.btn-primary:active{transform:scale(.97)}
.btn-ghost{background:rgba(255,255,255,.04);border:1px solid var(--border2);color:var(--t2);padding:8px 16px;border-radius:var(--rs);font-size:13px}
.btn-ghost:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:var(--t1);transform:translateY(-1px)}
.btn-danger{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#f87171;padding:7px 14px;border-radius:var(--rs);font-size:12px}
.btn-danger:hover{background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.35);transform:translateY(-1px)}
.input{width:100%;padding:11px 14px;background:rgba(22,25,31,.8);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s}
.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(79,142,247,.14);background:rgba(28,32,40,.9)}
.input::placeholder{color:var(--t3)}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;line-height:1}
.nav-link{padding:7px 14px;border-radius:var(--rs);font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--t3);transition:all .15s;display:flex;align-items:center;gap:7px}
.nav-link:hover{background:rgba(255,255,255,.06);color:var(--t2);transform:translateY(-1px)}
.nav-link.active{background:linear-gradient(135deg,rgba(79,142,247,.18),rgba(99,102,241,.12));color:var(--blue);font-weight:700;border:1px solid rgba(79,142,247,.25);box-shadow:0 2px 10px rgba(79,142,247,.15)}
.sidebar-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--rs);cursor:pointer;border:none;background:transparent;color:var(--t3);font-size:13px;font-weight:500;width:100%;text-align:left;transition:all .15s}
.sidebar-link:hover{background:rgba(255,255,255,.05);color:var(--t2);transform:translateX(2px)}
.sidebar-link.active{background:linear-gradient(135deg,rgba(79,142,247,.16),rgba(99,102,241,.1));color:var(--blue);border:1px solid rgba(79,142,247,.22);font-weight:700;box-shadow:0 2px 12px rgba(79,142,247,.12)}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .18s ease}
.modal{background:linear-gradient(160deg,var(--s2) 0%,var(--s3) 100%);border:1px solid rgba(255,255,255,.07);border-radius:var(--rx);width:100%;max-width:860px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;animation:scaleIn .22s cubic-bezier(.34,1.56,.64,1);box-shadow:0 40px 100px rgba(0,0,0,.9)}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700}
.icon-btn{width:36px;height:36px;border-radius:9px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--t2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.icon-btn:hover{background:rgba(255,255,255,.08);border-color:var(--border2);color:var(--t1);transform:translateY(-1px)}
.icon-btn.active{background:rgba(79,142,247,.15);border-color:rgba(79,142,247,.35);color:var(--blue)}
.squad-card{padding:20px;border-radius:16px;border:1.5px solid var(--border);background:linear-gradient(160deg,var(--s2),var(--s3));cursor:pointer;transition:all .22s cubic-bezier(.34,1.56,.64,1);text-align:left;position:relative;overflow:hidden}
.squad-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.5)}
.squad-card.active{box-shadow:0 12px 36px rgba(0,0,0,.45)}
.task-card{background:linear-gradient(160deg,var(--s2) 0%,var(--s3) 100%);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .22s cubic-bezier(.34,1.56,.64,1);position:relative}
.task-card:hover{border-color:var(--border2);transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,.55)}
.sprint-header{background:linear-gradient(135deg,var(--s2),var(--s3));border:1px solid var(--border);border-radius:14px;transition:all .2s}
.sprint-header:hover{border-color:var(--border2)}
.hint{font-size:11px;color:var(--t3);line-height:1.5}
.divider{height:1px;background:linear-gradient(90deg,transparent,var(--border),transparent)}
`;


// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const Spin = () => <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .6s linear infinite",flexShrink:0}}/>;

function Toast({msg,type}) {
  const isOk = type !== "error";
  const isWarn = type === "warn";
  return (
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"14px 18px",borderRadius:14,fontSize:13,fontWeight:600,
      animation:"slideRight .3s cubic-bezier(.34,1.56,.64,1)",display:"flex",alignItems:"center",gap:10,
      background:isOk&&!isWarn?"rgba(16,185,129,.1)":isWarn?"rgba(245,158,11,.1)":"rgba(239,68,68,.1)",
      border:`1px solid ${isOk&&!isWarn?"rgba(16,185,129,.3)":isWarn?"rgba(245,158,11,.3)":"rgba(239,68,68,.3)"}`,
      color:isOk&&!isWarn?"#34d399":isWarn?"#fbbf24":"#f87171",
      boxShadow:"0 8px 32px rgba(0,0,0,.6)",
      backdropFilter:"blur(16px)",maxWidth:400,zIndex:9999}}>
      <div style={{width:20,height:20,borderRadius:6,background:"currentColor",opacity:.15,position:"absolute",left:14}}/>
      <span style={{fontSize:15,position:"relative"}}>{isOk&&!isWarn?"✓":isWarn?"⚠":"✕"}</span>
      <span style={{position:"relative"}}>{msg}</span>
    </div>
  );
}

function Avatar({name,url,size=32,radius=8}) {
  return (
    <div style={{width:size,height:size,borderRadius:radius,background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.4,fontWeight:700}}>
      {url ? <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : (name||"?").charAt(0).toUpperCase()}
    </div>
  );
}

function StatusBadge({status}) {
  const s = STATUS[status]||STATUS.pendente;
  return <span className="pill" style={{background:`${s.color}18`,color:s.dot,border:`1px solid ${s.color}44`}}>{s.icon} {s.label}</span>;
}

function PrioBadge({priority}) {
  const c = PRIO_COLOR[priority]||"#94a3b8";
  return <span className="pill" style={{background:`${c}15`,color:c,border:`1px solid ${c}35`}}>{PRIO_LABEL[priority]}</span>;
}

function FieldLabel({children}) {
  return <div style={{fontSize:11,fontWeight:700,color:"var(--t3)",marginBottom:6,textTransform:"uppercase",letterSpacing:".6px"}}>{children}</div>;
}

function ProgressFlow({status}) {
  const cur = FLOW.indexOf(status);
  if (status === "rejeitada") return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
      <span style={{fontSize:12,color:"#f87171"}}>❌ Demanda rejeitada</span>
    </div>
  );
  return (
    <div style={{padding:"10px 0"}}>
      <div style={{display:"flex",alignItems:"center",gap:0}}>
        {FLOW.map((s,i) => {
          const sm = STATUS[s];
          const done = cur > i;
          const active = cur === i;
          return (
            <div key={s} style={{display:"flex",alignItems:"center",flex:i<FLOW.length-1?1:"none"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,zIndex:1}}>
                <div style={{width:28,height:28,borderRadius:"50%",
                  background:done?"#1d2d45":active?`${sm.color}25`:"var(--s1)",
                  border:`2px solid ${done?sm.dot:active?sm.color:"var(--border)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                  transition:"all .3s",
                  boxShadow:active?`0 0 12px ${sm.color}60`:"none"}}>
                  {done ? <span style={{color:sm.dot,fontSize:11}}>✓</span> : active ? sm.icon : ""}
                </div>
                <span style={{fontSize:9,color:done||active?sm.dot:"var(--t3)",fontWeight:active?700:400,textAlign:"center",whiteSpace:"nowrap"}}>{sm.label}</span>
              </div>
              {i < FLOW.length-1 && (
                <div style={{flex:1,height:2,background:done?`linear-gradient(90deg,${STATUS[FLOW[i]].dot},${STATUS[FLOW[i+1]].dot})`:"var(--border)",margin:"0 4px",marginBottom:18,transition:"background .3s"}}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin}) {
  const [mode,setMode] = useState("login");
  const [form,setForm] = useState({name:"",email:"",password:""});
  const [err,setErr]   = useState("");
  const [info,setInfo] = useState("");
  const [loading,setLoading] = useState(false);
  const [shake,setShake] = useState(false);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function submit() {
    setErr(""); setInfo(""); setLoading(true);
    if (mode==="login") {
      const u = await dbLogin(form.email, form.password);
      if (!u) {
        setErr("E-mail ou senha incorretos.");
        setShake(true); setTimeout(()=>setShake(false),500);
        setLoading(false); return;
      }
      const role = resolveRole(u.email, u.role);
      // Update role if needed
      if (role!==u.role) await dbUpsertProfile({...u,role,updated_at:new Date().toISOString()});
      onLogin({...u,role});
      setLoading(false);
    } else if (mode==="register") {
      if (!form.name||!form.email||!form.password) { setErr("Preencha todos os campos."); setLoading(false); return; }
      const result = await dbRegister(form.email, form.password, form.name);
      if (result.error) { setErr(result.error); setLoading(false); return; }
      onLogin(result.user);
      setLoading(false);
    } else {
      // Forgot password
      if (!form.email) { setErr("Informe seu e-mail."); setLoading(false); return; }
      const exists = await dbProfileByEmail(form.email);
      if (!exists) { setErr("Nenhuma conta com este e-mail."); setLoading(false); return; }
      const result = await dbResetPassword(form.email);
      if (result.error) { setErr(result.error); setLoading(false); return; }
      setInfo(`Senha temporária gerada: ${result.tmp} — Use-a para entrar e depois altere no perfil.`);
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",background:"var(--bg)"}}>
      <style>{G}</style>
      {/* Left panel */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,background:"linear-gradient(135deg,var(--s1) 0%,var(--bg) 100%)"}}>
        <div style={{width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:40}}>
            <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 0 24px rgba(99,102,241,.4)"}}>⚡</div>
            <div>
              <div style={{fontWeight:900,fontSize:22,letterSpacing:"-1px"}}>TaskHUB</div>
              <div style={{fontSize:12,color:"var(--t3)"}}>Gestão de Demandas</div>
            </div>
          </div>

          {/* Tabs */}
          {mode!=="forgot" && (
            <div style={{display:"flex",background:"var(--s1)",borderRadius:10,padding:4,marginBottom:28,border:"1px solid var(--border)"}}>
              {["login","register"].map(m=>(
                <button key={m} onClick={()=>{setMode(m);setErr("");setInfo("");}}
                  style={{flex:1,padding:"9px 0",border:"none",borderRadius:8,fontSize:13,fontWeight:600,transition:"all .2s",cursor:"pointer",
                    background:mode===m?"var(--s2)":"transparent",color:mode===m?"var(--t1)":"var(--t3)",
                    boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.4)":"none"}}>
                  {m==="login"?"Entrar":"Criar conta"}
                </button>
              ))}
            </div>
          )}

          {mode==="forgot" && (
            <div style={{marginBottom:24}}>
              <h2 style={{fontSize:20,fontWeight:800,marginBottom:4}}>Recuperar senha</h2>
              <p style={{fontSize:13,color:"var(--t3)"}}>Informe seu e-mail para gerar uma senha temporária.</p>
            </div>
          )}

          {/* Fields */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mode==="register" && (
              <div><FieldLabel>Nome completo</FieldLabel>
                <input className="input" value={form.name} onChange={f("name")} placeholder="Seu nome completo"/>
              </div>
            )}
            <div><FieldLabel>E-mail</FieldLabel>
              <input className="input" type="email" value={form.email} onChange={f("email")} placeholder="voce@empresa.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
            </div>
            {mode!=="forgot" && (
              <div><FieldLabel>Senha</FieldLabel>
                <input className="input" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/>
              </div>
            )}
          </div>

          {/* Forgot link */}
          {mode==="login" && (
            <div style={{textAlign:"right",marginTop:10}}>
              <button onClick={()=>{setMode("forgot");setErr("");setInfo("");}} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer"}}>Esqueci minha senha</button>
            </div>
          )}
          {mode==="forgot" && (
            <div style={{marginTop:8,textAlign:"right"}}>
              <button onClick={()=>{setMode("login");setErr("");setInfo("");}} style={{background:"none",border:"none",color:"var(--t3)",fontSize:12,cursor:"pointer"}}>← Voltar</button>
            </div>
          )}

          {err && <div style={{marginTop:16,padding:"10px 14px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#f87171"}}>{err}</div>}
          {info && <div style={{marginTop:16,padding:"10px 14px",background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",borderRadius:8,fontSize:12,color:"#4ade80",lineHeight:1.6}}>{info}</div>}

          <button onClick={submit} disabled={loading} className="btn btn-primary"
            style={{width:"100%",marginTop:24,padding:"13px",fontSize:14,borderRadius:10,justifyContent:"center",opacity:loading?.7:1}}>
            {loading?<><Spin/>Aguarde...</>:mode==="login"?"Entrar →":mode==="register"?"Criar conta →":"Enviar instruções →"}
          </button>
        </div>
      </div>

      {/* Right panel — decorative */}
      <div style={{width:420,background:"linear-gradient(135deg,#0b1121,#0d1520)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,borderLeft:"1px solid var(--border)"}}>
        <div style={{textAlign:"center",maxWidth:320}}>
          <div style={{fontSize:48,marginBottom:20}}>⚡</div>
          <h2 style={{fontSize:24,fontWeight:800,letterSpacing:"-1px",marginBottom:12}}>Organize suas demandas</h2>
          <p style={{fontSize:14,color:"var(--t3)",lineHeight:1.7,marginBottom:32}}>Gerencie solicitações por squad, acompanhe o progresso em tempo real e mantenha sua equipe alinhada.</p>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {["Filas por sprint","Timeline de progresso","Notificações em tempo real","Backlog organizado"].map(f=>(
              <div key={f} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:"var(--s1)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"var(--blue)",flexShrink:0,boxShadow:"0 0 6px var(--blue)"}}/>
                <span style={{fontSize:13,color:"var(--t2)"}}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENTS DB
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetComments(demandId) {
  const s = await getSB();
  if (s) { const {data}=await s.from("comments").select("*").eq("demand_id",demandId).order("created_at",{ascending:true}); return data||[]; }
  return (ls.get()?.comments||[]).filter(c=>c.demand_id===demandId);
}
async function dbInsertComment(c) {
  const s = await getSB();
  if (s) { const {error}=await s.from("comments").insert([c]); if(error) console.error("comment:",error.message); return; }
  const d=ls.get()||{comments:[]}; d.comments=[...(d.comments||[]),c]; ls.set(d);
}
async function dbDeleteComment(id) {
  const s = await getSB();
  if (s) { await s.from("comments").delete().eq("id",id); return; }
  const d=ls.get()||{comments:[]}; d.comments=d.comments.filter(c=>c.id!==id); ls.set(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TaskModal({demand,overrides,onClose,canEdit,onEdit,isAdmin,currentUser}) {
  const [tab,setTab]       = useState("details");
  const [editing,setEditing] = useState(false);
  const [form,setForm]     = useState({title:demand.title,description:demand.description,team:demand.team||"",priority:demand.priority,tag:demand.tag});
  const [saving,setSaving] = useState(false);
  const [comments,setComments] = useState([]);
  const [loadingComments,setLoadingComments] = useState(true);
  const [comment,setComment] = useState("");
  const [replyTo,setReplyTo] = useState(null);
  const [mentionSearch,setMentionSearch] = useState(null); // {query, index}
  const [profiles,setProfiles] = useState([]);
  const [posting,setPosting] = useState(false);
  const commentRef = useRef();
  const inputRef   = useRef();
  const sq = SQUAD_COLOR[demand.squad]||{h:"#64748b",rgb:"100,116,139"};
  const sm = STATUS[demand.status]||STATUS.pendente;
  const timeline = demand.timeline||[];
  const fe = k => e => setForm(p=>({...p,[k]:e.target.value}));

  useEffect(()=>{
    const handler = e=>e.key==="Escape"&&!mentionSearch&&onClose();
    document.addEventListener("keydown",handler);
    return()=>document.removeEventListener("keydown",handler);
  },[mentionSearch]);

  useEffect(()=>{
    dbGetComments(demand.id).then(c=>{setComments(c);setLoadingComments(false);});
    dbProfiles().then(setProfiles);
    // Realtime comments
    const s=sb();
    if(s){
      const ch=s.channel(`comments-${demand.id}`)
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"comments",filter:`demand_id=eq.${demand.id}`},p=>{
          setComments(prev=>{if(prev.find(c=>c.id===p.new.id))return prev;return [...prev,p.new];});
        })
        .on("postgres_changes",{event:"DELETE",schema:"public",table:"comments",filter:`demand_id=eq.${demand.id}`},p=>{
          setComments(prev=>prev.filter(c=>c.id!==p.old.id));
        }).subscribe();
      return()=>s.removeChannel(ch);
    }
  },[demand.id]);

  // Handle @mention detection
  function handleCommentInput(e) {
    const val = e.target.value;
    setComment(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0,cursor);
    const atIdx = textBefore.lastIndexOf("@");
    if (atIdx>=0 && !textBefore.slice(atIdx+1).includes(" ")) {
      const query = textBefore.slice(atIdx+1).toLowerCase();
      setMentionSearch({query,atIdx});
    } else {
      setMentionSearch(null);
    }
  }

  function insertMention(profile) {
    const name = profile.name||profile.email;
    const before = comment.slice(0,mentionSearch.atIdx);
    const after  = comment.slice(mentionSearch.atIdx+1+mentionSearch.query.length);
    const newVal = `${before}@${name} ${after}`;
    setComment(newVal);
    setMentionSearch(null);
    setTimeout(()=>inputRef.current?.focus(),0);
  }

  const filteredProfiles = mentionSearch
    ? profiles.filter(p=>(p.name||p.email||"").toLowerCase().includes(mentionSearch.query)).slice(0,5)
    : [];

  async function postComment() {
    if (!comment.trim()) return;
    setPosting(true);
    // Extract mentions
    const mentions = [];
    const mentionRegex = /@([^\s@]+)/g;
    let m;
    while ((m=mentionRegex.exec(comment))!==null) mentions.push(m[1]);
    const c = {
      id:uid(), demand_id:demand.id,
      user_id:currentUser?.id||currentUser?.email,
      user_name:currentUser?.name||currentUser?.email,
      user_email:currentUser?.email,
      content:comment.trim(), mentions,
      parent_id:replyTo?.id||null,
      created_at:new Date().toISOString(),
    };
    await dbInsertComment(c);
    setComments(p=>[...p,c]);
    setComment(""); setReplyTo(null); setPosting(false);
  }

  function renderCommentContent(text) {
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((p,i)=>
      p.startsWith("@")
        ?<span key={i} style={{color:"#60a5fa",fontWeight:600,background:"rgba(59,130,246,.12)",padding:"0 4px",borderRadius:4}}>{p}</span>
        :<span key={i}>{p}</span>
    );
  }

  async function save() { setSaving(true); await onEdit(demand.id,form); setSaving(false); setEditing(false); }

  const topComments    = comments.filter(c=>!c.parent_id);
  const getReplies     = id => comments.filter(c=>c.parent_id===id);

  return(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:800,maxHeight:"92vh"}}>

        {/* ── HEADER ── */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:11,background:`rgba(${sq.rgb},.15)`,border:`1px solid rgba(${sq.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{SQUAD_ICON[demand.squad]}</div>
            <div style={{flex:1,minWidth:0}}>
              {editing
                ?<input className="input" value={form.title} onChange={fe("title")} style={{fontSize:17,fontWeight:700,padding:"5px 10px",marginBottom:4}}/>
                :<h2 style={{fontSize:17,fontWeight:800,lineHeight:1.3,marginBottom:6,color:"var(--t1)"}}>{demand.title}</h2>
              }
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <StatusBadge status={demand.status}/>
                <PrioBadge priority={demand.priority}/>
                {demand.tag&&<span className="tag-chip" style={{background:`${TAG_COLOR[demand.tag]}15`,color:TAG_COLOR[demand.tag],border:`1px solid ${TAG_COLOR[demand.tag]}30`,fontSize:10}}>{TAG_ICON[demand.tag]} {TAG_LABEL[demand.tag]}</span>}
                {demand.sprint&&<span style={{fontSize:10,color:"#38bdf8",fontFamily:"var(--mono)",background:"rgba(56,189,248,.1)",padding:"2px 8px",borderRadius:5}}>Sprint {demand.sprint}</span>}
                <span style={{fontSize:10,color:"var(--t3)",marginLeft:4}}>{SQUAD_LABEL[demand.squad]}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              {canEdit&&!editing&&<button className="btn btn-ghost" onClick={()=>setEditing(true)} style={{fontSize:11,padding:"5px 10px"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>}
              {editing&&<button className="btn btn-primary" onClick={save} disabled={saving} style={{fontSize:11,padding:"5px 12px"}}>{saving?<Spin/>:"Salvar"}</button>}
              {editing&&<button className="btn btn-ghost" onClick={()=>setEditing(false)} style={{fontSize:11,padding:"5px 10px"}}>✕</button>}
              <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:"1px solid var(--border)",background:"var(--s1)",color:"var(--t2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✕</button>
            </div>
          </div>

          {/* Progress bar */}
          <ProgressFlow status={demand.status}/>
        </div>

        {/* ── BODY: unified layout ── */}
        <div style={{flex:1,overflowY:"auto",minHeight:0,display:"grid",gridTemplateColumns:"1fr 300px"}}>

          {/* LEFT: description + comments */}
          <div style={{display:"flex",flexDirection:"column",borderRight:"1px solid var(--border)"}}>
            {/* Description */}
            <div style={{padding:"20px 22px",borderBottom:"1px solid var(--border)"}}>
              <FieldLabel>Descrição</FieldLabel>
              {editing
                ?<textarea className="input" value={form.description} onChange={fe("description")} rows={5} style={{resize:"vertical",lineHeight:1.7,marginTop:6}}/>
                :<div style={{fontSize:14,lineHeight:1.85,color:"var(--t2)",whiteSpace:"pre-wrap",padding:"12px 14px",background:"var(--s1)",borderRadius:10,border:"1px solid var(--border)",marginTop:6}}>{demand.description}</div>
              }
              {editing&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
                  <div><FieldLabel>Time</FieldLabel><input className="input" value={form.team} onChange={fe("team")} placeholder="Ex.: Operações"/></div>
                  <div><FieldLabel>Prioridade</FieldLabel>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                      {Object.entries(PRIO_LABEL).map(([k,v])=>(
                        <button key={k} onClick={()=>setForm(p=>({...p,priority:k}))} className="btn" style={{padding:"5px 9px",borderRadius:7,fontSize:11,fontWeight:700,border:`1px solid ${form.priority===k?PRIO_COLOR[k]:"var(--border)"}`,background:form.priority===k?`${PRIO_COLOR[k]}15`:"var(--s1)",color:form.priority===k?PRIO_COLOR[k]:"var(--t3)"}}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{gridColumn:"1/-1"}}><FieldLabel>Tipo</FieldLabel>
                    <div style={{display:"flex",gap:8,marginTop:6}}>
                      {Object.entries(TAG_LABEL).map(([k,v])=>(
                        <button key={k} onClick={()=>setForm(p=>({...p,tag:k}))} className="btn" style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:`1px solid ${form.tag===k?TAG_COLOR[k]:"var(--border)"}`,background:form.tag===k?`${TAG_COLOR[k]}15`:"var(--s1)",color:form.tag===k?TAG_COLOR[k]:"var(--t3)"}}>{TAG_ICON[k]} {v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {demand.admin_note&&(
                <div style={{marginTop:14,padding:"12px 14px",background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10}}>
                  <FieldLabel>Nota do Gestor</FieldLabel>
                  <p style={{fontSize:13,color:"#c7d2fe",lineHeight:1.6,marginTop:4}}>{demand.admin_note}</p>
                </div>
              )}
            </div>

            {/* Comments section — inline below description */}
            <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
              <div style={{padding:"12px 22px 8px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--t3)"}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span style={{fontSize:12,fontWeight:700,color:"var(--t2)"}}>Comentários</span>
                <span style={{fontSize:11,color:"var(--t3)",background:"var(--border)",padding:"1px 7px",borderRadius:999,fontFamily:"var(--mono)"}}>{comments.length}</span>
              </div>
              <div ref={commentRef} style={{flex:1,overflowY:"auto",padding:"14px 22px",display:"flex",flexDirection:"column",gap:14,minHeight:120,maxHeight:280}}>
                {loadingComments
                  ?<div style={{textAlign:"center",padding:16,color:"var(--t3)"}}><Spin/></div>
                  :topComments.length===0
                    ?<div style={{textAlign:"center",padding:"20px 0",color:"var(--t3)"}}>
                        <div style={{fontSize:11}}>Nenhum comentário ainda. Seja o primeiro!</div>
                      </div>
                    :topComments.map(c=>(
                        <CommentItem key={c.id} comment={c} replies={getReplies(c.id)} onReply={setReplyTo} onDelete={async(id)=>{await dbDeleteComment(id);setComments(p=>p.filter(x=>x.id!==id));}} currentUserId={currentUser?.id||currentUser?.email} renderContent={renderCommentContent}/>
                      ))
                }
              </div>
              {/* Comment input */}
              <div style={{padding:"12px 22px",borderTop:"1px solid var(--border)",background:"var(--s2)",flexShrink:0}}>
                {replyTo&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.2)",borderRadius:8,marginBottom:8,fontSize:11,color:"#60a5fa"}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                    Respondendo a <strong>{replyTo.user_name}</strong>
                    <button onClick={()=>setReplyTo(null)} style={{marginLeft:"auto",background:"none",border:"none",color:"#60a5fa",cursor:"pointer",fontSize:13}}>✕</button>
                  </div>
                )}
                <div style={{position:"relative"}}>
                  <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                    <Avatar name={currentUser?.name} url={currentUser?.avatar_url} size={28} radius={7}/>
                    <div style={{flex:1,position:"relative"}}>
                      <textarea ref={inputRef} value={comment} onChange={handleCommentInput}
                        onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!mentionSearch){e.preventDefault();postComment();}}}
                        rows={2} placeholder="Comentar... @ para mencionar"
                        style={{width:"100%",padding:"9px 12px",background:"var(--s1)",border:"1.5px solid var(--border)",borderRadius:9,color:"var(--t1)",fontSize:12,outline:"none",resize:"none",lineHeight:1.6,fontFamily:"var(--font)",transition:"border-color .15s"}}
                        onFocus={e=>e.target.style.borderColor="var(--blue)"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
                      {mentionSearch&&filteredProfiles.length>0&&(
                        <div style={{position:"absolute",bottom:"100%",left:0,right:0,marginBottom:4,background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.5)",overflow:"hidden",zIndex:50}}>
                          {filteredProfiles.map(p=>(
                            <button key={p.id} onClick={()=>insertMention(p)} style={{width:"100%",padding:"8px 12px",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,textAlign:"left",transition:"background .1s"}} onMouseOver={e=>e.currentTarget.style.background="var(--s3)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                              <Avatar name={p.name} url={p.avatar_url} size={24} radius={6}/>
                              <div>
                                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{p.name}</div>
                                <div style={{fontSize:9,color:"var(--t3)"}}>{p.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-primary" onClick={postComment} disabled={!comment.trim()||posting} style={{padding:"8px 12px",borderRadius:8,flexShrink:0,opacity:!comment.trim()||posting?.5:1}}>
                      {posting?<Spin/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                    </button>
                  </div>
                  <div style={{marginTop:4,fontSize:9,color:"var(--t3)"}}>Enter · Shift+Enter nova linha · @ menção</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: meta + history */}
          <div style={{display:"flex",flexDirection:"column",background:"var(--s1)",overflowY:"auto"}}>
            {/* Meta */}
            <div style={{padding:"20px 18px",borderBottom:"1px solid var(--border)"}}>
              <FieldLabel>Detalhes</FieldLabel>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
                {[
                  [<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,"Solicitante",demand.user_name],
                  [<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8l-2 4h12z"/></svg>,"Time",demand.team||"—"],
                  [SQUAD_ICON[demand.squad],"Squad",SQUAD_LABEL[demand.squad]],
                  [<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,"Criado",fmt(demand.created_at||demand.createdAt)],
                  demand.approved_at&&[<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,"Aprovado",fmt(demand.approved_at)],
                  demand.concluded_at&&[<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,"Concluído",fmt(demand.concluded_at)],
                ].filter(Boolean).map(([ic,lb,val])=>(
                  <div key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"var(--s2)",borderRadius:8,gap:8}}>
                    <span style={{fontSize:11,color:"var(--t3)",flexShrink:0,display:"flex",alignItems:"center",gap:5}}>{ic} {lb}</span>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--t2)",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline history */}
            <div style={{padding:"16px 18px",flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:"var(--t3)"}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <FieldLabel>Histórico</FieldLabel>
              </div>
              {timeline.length===0
                ?<div style={{fontSize:11,color:"var(--t3)",padding:"8px 0"}}>Sem atualizações ainda.</div>
                :<div style={{display:"flex",flexDirection:"column",gap:0,position:"relative",paddingLeft:14}}>
                  <div style={{position:"absolute",left:10,top:0,bottom:0,width:1.5,background:"var(--border)"}}/>
                  {timeline.map((t,i)=>{
                    const s=STATUS[t.status]||{icon:"◌",dot:"var(--t3)",label:t.status||"Atualização",color:"#64748b"};
                    return(
                      <div key={i} style={{display:"flex",gap:10,padding:"8px 0",position:"relative",zIndex:1}}>
                        <div style={{width:22,height:22,borderRadius:"50%",background:`${s.dot}18`,border:`2px solid ${s.dot}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0,marginLeft:-11}}>{s.icon}</div>
                        <div style={{flex:1,paddingTop:2}}>
                          <div style={{fontSize:11,fontWeight:700,color:s.dot}}>{s.label||t.status}</div>
                          {t.note&&t.note!==s.label&&<div style={{fontSize:10,color:"var(--t3)",marginTop:1,lineHeight:1.5}}>{t.note}</div>}
                          <div style={{fontSize:9,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>{fmt(t.at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </div>

            {/* ID */}
            <div style={{padding:"8px 18px 14px"}}>
              <div style={{padding:"5px 10px",background:"var(--s2)",borderRadius:7,fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)",textAlign:"center"}}>ID: {demand.id}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT ITEM
// ─────────────────────────────────────────────────────────────────────────────
function CommentItem({comment,replies=[],onReply,onDelete,currentUserId,renderContent}) {
  const [showReplies,setShowReplies] = useState(true);
  const isOwn = comment.user_id===currentUserId||comment.user_email===currentUserId;
  return(
    <div style={{animation:"fadeUp .2s ease"}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <Avatar name={comment.user_name} size={32} radius={8}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{padding:"10px 14px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:"4px 12px 12px 12px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{comment.user_name}</span>
              <span style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)"}}>{fmt(comment.created_at)}</span>
            </div>
            <div style={{fontSize:13,lineHeight:1.7,color:"var(--t2)",wordBreak:"break-word"}}>{renderContent(comment.content)}</div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:6,paddingLeft:2}}>
            <button onClick={()=>onReply(comment)} style={{background:"none",border:"none",fontSize:11,color:"var(--t3)",cursor:"pointer",padding:"2px 4px",borderRadius:4,display:"flex",alignItems:"center",gap:4,transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="var(--blue)"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Responder
            </button>
            {replies.length>0&&<button onClick={()=>setShowReplies(p=>!p)} style={{background:"none",border:"none",fontSize:11,color:"var(--blue)",cursor:"pointer",padding:"2px 4px"}}>{showReplies?"▲":"▼"} {replies.length} resposta(s)</button>}
            {isOwn&&<button onClick={()=>onDelete(comment.id)} style={{background:"none",border:"none",fontSize:11,color:"var(--t3)",cursor:"pointer",padding:"2px 4px",marginLeft:"auto",transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>Excluir</button>}
          </div>
          {/* Replies */}
          {showReplies&&replies.length>0&&(
            <div style={{marginTop:8,paddingLeft:16,borderLeft:"2px solid var(--border)",display:"flex",flexDirection:"column",gap:10}}>
              {replies.map(r=>(
                <div key={r.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                  <Avatar name={r.user_name} size={26} radius={7}/>
                  <div style={{flex:1}}>
                    <div style={{padding:"8px 12px",background:"var(--s1)",border:"1px solid var(--border)",borderRadius:"4px 10px 10px 10px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{r.user_name}</span>
                        <span style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{fmt(r.created_at)}</span>
                      </div>
                      <div style={{fontSize:12,lineHeight:1.6,color:"var(--t2)"}}>{renderContent(r.content)}</div>
                    </div>
                    {(r.user_id===currentUserId||r.user_email===currentUserId)&&(
                      <button onClick={()=>onDelete(r.id)} style={{background:"none",border:"none",fontSize:10,color:"var(--t3)",cursor:"pointer",marginTop:4,padding:"2px 4px",transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>Excluir</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK CARD (compact, shows progress inline)
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({demand,index,onClick,overrides={}}) {
  const sq = SQUAD_COLOR[demand.squad]||{h:"#64748b",rgb:"100,116,139"};
  const sm = STATUS[demand.status]||STATUS.pendente;
  const pc = PRIO_COLOR[demand.priority]||"#64748b";
  const cur = FLOW.indexOf(demand.status);
  const pct = demand.status==="rejeitada"?0:Math.max(0,Math.min(100,(cur/(FLOW.length-1))*100));
  const tc  = demand.tag?TAG_COLOR[demand.tag]:null;
  const isActive = demand.status==="em_andamento";

  return(
    <div onClick={onClick} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",animation:`fadeUp .3s ease ${index*.05}s both`,position:"relative"}}
      onMouseOver={e=>{e.currentTarget.style.borderColor=sq.h+"66";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,.4)`;}}
      onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>

      {/* Squad accent bar */}
      <div style={{height:3,background:`linear-gradient(90deg,${sq.h},transparent)`}}/>

      <div style={{padding:"16px 18px"}}>
        {/* Top row */}
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <div style={{width:42,height:42,borderRadius:12,background:`rgba(${sq.rgb},.15)`,border:`1.5px solid rgba(${sq.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,boxShadow:`0 4px 12px rgba(${sq.rgb},.12)`}}>
            {SQUAD_ICON[demand.squad]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:4,color:"var(--t1)"}}>{demand.title}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"var(--t3)"}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {demand.user_name}</span>
              {demand.team&&<span style={{fontSize:11,color:"var(--t3)"}}>· <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> {demand.team}</span>}
              {demand.sprint&&<span style={{fontSize:10,color:"#38bdf8",fontFamily:"var(--mono)"}}>Sprint {demand.sprint}</span>}
            </div>
          </div>
          {/* Status dot */}
          <div style={{width:10,height:10,borderRadius:"50%",background:sm.dot,boxShadow:`0 0 12px ${sm.dot},0 0 4px ${sm.dot}`,flexShrink:0,marginTop:4,animation:isActive?"pulse 1.5s infinite":"none"}}/>
        </div>

        {/* Progress bar */}
        {demand.status!=="rejeitada"&&(
          <div style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              {FLOW.map((s,i)=>{
                const s2=STATUS[s]; const done=cur>i; const active=cur===i;
                return(
                  <div key={s} title={s2.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:done||active?`${s2.dot}20`:"var(--s1)",border:`1.5px solid ${done||active?s2.dot:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,transition:"all .3s",boxShadow:active?`0 0 8px ${s2.dot}50`:"none"}}>
                      {done?<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={s2.dot} strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:active?<span style={{fontSize:10}}>{s2.icon}</span>:""}
                    </div>
                    {i<FLOW.length-1&&<div style={{display:"none"}}/>}
                  </div>
                );
              })}
            </div>
            <div style={{height:3,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${sq.h},${sm.dot})`,width:`${pct}%`,transition:"width .5s ease",borderRadius:3}}/>
            </div>
          </div>
        )}

        {demand.status==="rejeitada"&&(
          <div style={{marginBottom:10,padding:"5px 10px",borderRadius:7,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",fontSize:11,color:"#f87171"}}>❌ Rejeitada{demand.admin_note&&` — ${demand.admin_note.slice(0,50)}`}</div>
        )}

        {/* Footer badges */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span className="pill" style={{background:`${pc}12`,color:pc,border:`1px solid ${pc}30`,fontSize:10}}>{PRIO_LABEL[demand.priority]}</span>
          {tc&&<span className="tag-chip" style={{background:`${tc}12`,color:tc,border:`1px solid ${tc}30`,fontSize:10}}>{TAG_ICON[demand.tag]} {TAG_LABEL[demand.tag]}</span>}
          <span style={{marginLeft:"auto",fontSize:10,color:"var(--t3)"}}>{fmtDate(demand.created_at||demand.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV ICONS (flat SVG)
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ICONS = {
  "shield":  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  "scale":   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 12 3 8 3"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M3 9l4 9 4-9"/><path d="M13 9l4 9 4-9"/></svg>,
  "list":    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>,
  "plus":    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  "folder":  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  "chart":   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  "✚":       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  "⚖":      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 12 3 8 3"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M3 9l4 9 4-9"/><path d="M13 9l4 9 4-9"/></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [phase,setPhase]     = useState("loading");
  const [user,setUser]       = useState(null);
  const [demands,setDemands] = useState([]);
  const [config,setConfig]   = useState({emailConfig:{},sprintOverrides:{}});
  const [backlog,setBacklog] = useState([]);
  const [notifs,setNotifs]   = useState([]);
  const [view,setView]       = useState("queue");
  const [toast,setToast]     = useState(null);
  const [taskModal,setTaskModal] = useState(null);
  const [showNotif,setShowNotif] = useState(false);

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };
  const isAdmin = user?.role==="admin";
  const isMod   = ["admin","moderador"].includes(user?.role);
  const overrides = config.sprintOverrides||{};

  // ── SEND EMAIL VIA RESEND ──
  async function sendEmail(to, toName, subject, statusLabel, statusIcon, demand, extra={}) {
    const cfg = config.emailConfig||{};
    if (!cfg.resendKey||!cfg.fromEmail) return { ok:false, reason:"Resend não configurado" };
    const html = buildEmailHtml({
      title:demand.title, toName, statusLabel, statusIcon,
      squadLabel:SQUAD_LABEL[demand.squad],
      sprint:demand.sprint, sprintRange:demand.sprint?sprintRange(demand.sprint,overrides):"",
      adminNote:demand.admin_note||extra.note||"",
      dateTime:new Date().toLocaleString("pt-BR"),
      description:demand.description,
    });
    return sendResend({ apiKey:cfg.resendKey, from:cfg.fromEmail, to, subject, html });
  }

  // ── NOTIFY ──
  async function notify(demand, type, extra={}) {
    const sm = STATUS[type]||STATUS.pendente;
    // In-app notification
    const n = {id:uid(),user_id:demand.user_id||demand.user_email,type,demand_id:demand.id,demand_title:demand.title,squad:demand.squad,sprint:demand.sprint,admin_note:extra.note||"",read:false,created_at:new Date().toISOString()};
    await dbInsertNotif(n);
    setNotifs(p=>[n,...p]);
    // Email
    const subj = `[TaskHUB] ${sm.label}: ${demand.title}`;
    const r = await sendEmail(demand.user_email, demand.user_name, subj, sm.label, sm.icon, demand, extra);
    return r;
  }

  // ── LOAD DATA ──
  async function loadData(u) {
    const usr = u||user;
    const [d,c,b,n] = await Promise.all([
      dbDemands(), dbConfig(), dbBacklog(),
      dbNotifications(usr?.id||usr?.email||"")
    ]);
    setDemands(d||[]);
    const cfg = c&&Object.keys(c).length ? {emailConfig:c.email_config||{},sprintOverrides:c.sprint_overrides||{}} : {emailConfig:{},sprintOverrides:{}};
    setConfig(cfg);
    setBacklog(b||[]);
    setNotifs(n||[]);
  }

  // ── REALTIME ──
  useEffect(()=>{
    if (phase!=="app") return;
    const s = sb(); if (!s) return;
    // Subscribe to demands table changes
    const demandsChannel = s.channel("demands-realtime")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"demands"},payload=>{
        setDemands(p=>{
          if (p.find(d=>d.id===payload.new.id)) return p;
          return [payload.new,...p];
        });
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"demands"},payload=>{
        setDemands(p=>p.map(d=>d.id===payload.new.id?{...d,...payload.new}:d));
        setTaskModal(m=>m&&m.id===payload.new.id?{...m,...payload.new}:m);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"demands"},payload=>{
        setDemands(p=>p.filter(d=>d.id!==payload.old.id));
      })
      .subscribe();

    // Subscribe to notifications
    const notifsChannel = s.channel("notifs-realtime")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${user?.id||user?.email}`},payload=>{
        setNotifs(p=>{
          if (p.find(n=>n.id===payload.new.id)) return p;
          return [payload.new,...p];
        });
      })
      .subscribe();

    return ()=>{
      s.removeChannel(demandsChannel);
      s.removeChannel(notifsChannel);
    };
  },[phase, user]);

  // ── INIT ──
  useEffect(()=>{
    initSB().then(async()=>{
      const saved = session.get();
      if (saved) {
        const profile = await dbProfile(saved.id||saved.email);
        const u = profile ? {...saved,...profile,role:resolveRole(saved.email,profile.role||saved.role)} : saved;
        setUser(u); await loadData(u);
        setView(isMod?"admin":"queue"); setPhase("app");
      } else { setPhase("auth"); }
    }).catch(()=>setPhase("auth"));
  },[]);

  async function handleLogin(u) {
    setUser(u); session.set(u);
    await loadData(u);
    setView(["admin","moderador"].includes(u.role)?"admin":"queue");
    setPhase("app");
  }
  function handleLogout() { setUser(null); session.clear(); setPhase("auth"); }

  // ── DEMAND ACTIONS ──
  async function handleNewDemand(demand) {
    const d = {...demand, timeline:[{status:"pendente",at:new Date().toISOString(),note:"Demanda criada"}]};
    await dbInsertDemand(d);
    setDemands(p=>[d,...p]);
    const r = await notify(d,"pendente",{note:"Demanda criada com sucesso"});
    showToast(`Demanda enviada!${r.ok?" E-mail enviado ✓":""}`);
    setView("my");
  }

  async function handleApprove({demandId,status,sprint,adminNote}) {
    const demand = demands.find(d=>d.id===demandId);
    const now = new Date().toISOString();
    const entry = {status,at:now,note:adminNote||STATUS[status]?.label,sprint:status==="aprovada"?sprint:null};
    const patch = {status,sprint:status==="aprovada"?sprint:null,approved_at:now,admin_note:adminNote,timeline:[...(demand.timeline||[]),entry]};
    await dbUpdateDemand(demandId,patch);
    setDemands(p=>p.map(d=>d.id===demandId?{...d,...patch}:d));
    const updated = {...demand,...patch};
    const r = await notify(updated,status,{note:adminNote});
    await notifyPowerAutomate(updated, status==="aprovada"?"task_approved":"task_rejected", adminNote);
    showToast(`Demanda ${STATUS[status]?.label}!${r.ok?" E-mail enviado ✓":` (Email: ${r.reason})`}`,r.ok?"success":"error");
  }

  async function handleUpdateStatus(demandId,newStatus,note="") {
    const demand = demands.find(d=>d.id===demandId);
    const now = new Date().toISOString();
    const entry = {status:newStatus,at:now,note:note||STATUS[newStatus]?.label};
    const patch = {status:newStatus,timeline:[...(demand.timeline||[]),entry]};
    if (newStatus==="concluida") patch.concluded_at=now;
    await dbUpdateDemand(demandId,patch);
    setDemands(p=>p.map(d=>d.id===demandId?{...d,...patch}:d));
    const updated = {...demand,...patch};
    const r = await notify(updated,newStatus,{note});
    await notifyPowerAutomate(updated, "status_updated", note);
    showToast(`Status: ${STATUS[newStatus]?.label}!${r.ok?" E-mail enviado ✓":""}`);
    if(taskModal?.id===demandId) setTaskModal({...taskModal,...patch});
  }

  async function handleMoveSprint(demandId,newSprint) {
    const demand = demands.find(d=>d.id===demandId);
    const now = new Date().toISOString();
    const sr = sprintRange(newSprint,overrides);
    const entry = {status:"sprint_move",at:now,note:`Movida para Sprint ${newSprint} (${sr})`};
    const patch = {sprint:newSprint,timeline:[...(demand.timeline||[]),entry]};
    await dbUpdateDemand(demandId,patch);
    setDemands(p=>p.map(d=>d.id===demandId?{...d,...patch}:d));
    const updated = {...demand,...patch};
    const r = await notify(updated,demand.status,{note:`Sprint atualizada: Sprint ${newSprint} (${sr})`});
    await notifyPowerAutomate(updated, "sprint_updated");
    showToast(`Movida para Sprint ${newSprint}!${r.ok?" E-mail enviado ✓":""}`);
  }

  async function handleEditDemand(demandId,form) {
    const demand = demands.find(d=>d.id===demandId);
    const now = new Date().toISOString();
    const entry = {status:"editada",at:now,note:"Demanda editada pelo solicitante"};
    const patch = {...form,updated_at:now,timeline:[...(demand.timeline||[]),entry]};
    await dbUpdateDemand(demandId,patch);
    setDemands(p=>p.map(d=>d.id===demandId?{...d,...patch}:d));
    if(taskModal?.id===demandId) setTaskModal({...taskModal,...patch});
    showToast("Demanda atualizada!");
  }

  async function handleDeleteDemand(demandId) {
    await dbDeleteDemand(demandId);
    setDemands(p=>p.filter(d=>d.id!==demandId));
    showToast("Demanda excluída.");
  }

  async function handleSaveConfig(patch) {
    const next = {...config,...patch};
    setConfig(next);
    await dbSetConfig({email_config:next.emailConfig,sprint_overrides:next.sprintOverrides});
    showToast("Configurações salvas!");
  }

  // Nav items
  const navItems = isAdmin
    ? [{id:"admin",label:"Admin",icon:"shield"},{id:"queue",label:"Filas",icon:"list"},{id:"new",label:"Nova Task",icon:"✚"},{id:"my",label:"Minhas Tasks",icon:"folder"},{id:"analytics",label:"Visão Geral",icon:"chart"}]
    : isMod
    ? [{id:"admin",label:"Painel",icon:"⚖"},{id:"queue",label:"Filas",icon:"list"},{id:"new",label:"Nova Task",icon:"✚"},{id:"my",label:"Minhas Tasks",icon:"folder"}]
    : [{id:"queue",label:"Filas",icon:"list"},{id:"new",label:"Nova Task",icon:"✚"},{id:"my",label:"Minhas Tasks",icon:"folder"}];

  const pendingCount = demands.filter(d=>d.status==="pendente").length;
  const unread = notifs.filter(n=>!n.read).length;

  if (phase==="loading") return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{G}</style>
      <div style={{textAlign:"center",animation:"fadeUp .4s ease"}}>
        <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 16px",boxShadow:"0 0 32px rgba(99,102,241,.4)",animation:"glow 2s infinite"}}>⚡</div>
        <div style={{fontSize:20,fontWeight:800,letterSpacing:"-1px",marginBottom:8}}>TaskHUB</div>
        <div style={{fontSize:13,color:"var(--t3)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Spin/>Carregando...</div>
      </div>
    </div>
  );
  if (phase==="auth") return <AuthScreen onLogin={handleLogin}/>;

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <style>{G}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          demand={taskModal} overrides={overrides}
          onClose={()=>setTaskModal(null)}
          canEdit={taskModal.status==="pendente"&&(taskModal.user_id===user?.id||taskModal.user_email===user?.email)}
          onEdit={handleEditDemand}
          isAdmin={isAdmin}
          currentUser={user}
        />
      )}

      {/* NAVBAR */}
      <nav style={{height:60,display:"flex",alignItems:"center",padding:"0 24px",gap:10,
        background:"rgba(17,19,24,.92)",
        borderBottom:"1px solid rgba(255,255,255,.06)",
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        position:"sticky",top:0,zIndex:200,flexShrink:0,
        boxShadow:"0 1px 0 rgba(255,255,255,.04),0 4px 24px rgba(0,0,0,.4)"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:4,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(99,102,241,.4)",animation:"glow 3s infinite"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div style={{lineHeight:1}}>
            <div style={{fontWeight:900,fontSize:15,letterSpacing:"-1px",color:"var(--t1)"}}>TaskHUB</div>
            <div style={{fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1.2px",marginTop:2}}>{ROLES[user?.role]?.label||"Plataforma"}</div>
          </div>
        </div>
        <div style={{width:1,height:28,background:"var(--border)",flexShrink:0}}/>
        {/* Nav links */}
        <div style={{display:"flex",gap:2,flex:1}}>
          {navItems.filter(v=>v.id!=="new").map(v=>{
            const active=view===v.id;
            return(
              <button key={v.id} onClick={()=>setView(v.id)} className={`nav-link${active?" active":""}`} style={{fontSize:13}}>
                <span style={{display:"flex",alignItems:"center",color:active?"var(--blue)":"var(--t3)",transition:"color .15s"}}>{NAV_ICONS[v.icon]||v.icon}</span>
                {v.label}
                {v.id==="admin"&&pendingCount>0&&<span style={{minWidth:18,height:18,borderRadius:999,background:"#ef4444",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",boxShadow:"0 0 8px rgba(239,68,68,.5)"}}>{pendingCount}</span>}
              </button>
            );
          })}
        </div>
        {/* Nova Task CTA */}
        <button onClick={()=>setView("new")} className="btn btn-primary"
          style={{padding:"9px 18px",fontSize:13,borderRadius:10,flexShrink:0,
            background:view==="new"?"linear-gradient(135deg,#10b981,#059669)":"linear-gradient(135deg,#3b82f6,#6366f1)",
            boxShadow:view==="new"?"0 4px 20px rgba(16,185,129,.4)":"0 4px 20px rgba(99,102,241,.35)"}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Task
        </button>
        {/* Right */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotif(p=>!p)} className={`icon-btn${showNotif?" active":""}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unread>0&&<span style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:999,background:"#ef4444",fontSize:8,fontWeight:900,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--bg)",padding:"0 3px",boxShadow:"0 0 8px rgba(239,68,68,.5)"}}>{unread}</span>}
            </button>
            {showNotif&&<NotifDropdown notifs={notifs} onMarkRead={async()=>{await dbMarkRead(user?.id||user?.email);setNotifs(p=>p.map(n=>({...n,read:true})));}} onClose={()=>setShowNotif(false)} onOpen={d=>{setTaskModal(demands.find(x=>x.id===d.demand_id)||null);setShowNotif(false);}}/>}
          </div>
          <button onClick={()=>setView("profile")} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px 5px 5px",border:`1px solid ${view==="profile"?"rgba(79,142,247,.4)":"var(--border)"}`,borderRadius:10,background:view==="profile"?"rgba(79,142,247,.08)":"rgba(255,255,255,.03)",cursor:"pointer",transition:"all .15s"}}
            onMouseOver={e=>{e.currentTarget.style.background="rgba(255,255,255,.07)"}} onMouseOut={e=>{e.currentTarget.style.background=view==="profile"?"rgba(79,142,247,.08)":"rgba(255,255,255,.03)"}}>
            <Avatar name={user?.name} url={user?.avatar_url} size={28} radius={7}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",lineHeight:1}}>{user?.name?.split(" ")[0]}</div>
              <div style={{fontSize:9,color:"var(--t3)",lineHeight:1,marginTop:2,textTransform:"uppercase",letterSpacing:".5px"}}>{ROLES[user?.role]?.label}</div>
            </div>
          </button>
          <button onClick={handleLogout} className="icon-btn" title="Sair"
            onMouseOver={e=>{e.currentTarget.style.background="rgba(239,68,68,.1)";e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="rgba(239,68,68,.3)"}}
            onMouseOut={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.color="var(--t2)";e.currentTarget.style.borderColor="var(--border)"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </nav>

            {/* MAIN */}
      <main style={{flex:1,display:"flex",maxWidth:1400,width:"100%",margin:"0 auto",padding:"0 28px",minHeight:0,overflow:view==="admin"?"hidden":"visible"}}>
        {view==="queue"     && <QueueView demands={demands} overrides={overrides} onOpen={d=>setTaskModal(d)}/>}
        {view==="new"       && <NewTaskView user={user} onSubmit={handleNewDemand}/>}
        {view==="my"        && <MyTasksView demands={demands.filter(d=>d.user_id===user?.id||d.user_email===user?.email)} onOpen={d=>setTaskModal(d)}/>}
        {view==="admin"     && isMod && <AdminView demands={demands} config={config} backlog={backlog} isAdmin={isAdmin} overrides={overrides} onApprove={handleApprove} onDelete={handleDeleteDemand} onUpdateStatus={handleUpdateStatus} onMoveSprint={handleMoveSprint} onSaveConfig={handleSaveConfig} onBacklog={setBacklog} onOpen={d=>setTaskModal(d)}/>}
        {view==="analytics" && isAdmin && <AnalyticsView demands={demands}/>}
        {view==="profile"   && <ProfileView user={user} onUpdate={u=>{setUser(u);session.set(u);}} demands={demands}/>}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function NotifDropdown({notifs,onMarkRead,onClose,onOpen}) {
  const unread = notifs.filter(n=>!n.read).length;
  useEffect(()=>{
    const h = e=>{ if(!e.target.closest(".notif-drop")) onClose(); };
    setTimeout(()=>document.addEventListener("click",h),0);
    return()=>document.removeEventListener("click",h);
  },[]);
  return(
    <div className="notif-drop" style={{position:"absolute",top:44,right:0,width:360,background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:16,boxShadow:"0 16px 48px rgba(0,0,0,.6)",zIndex:999,overflow:"hidden",animation:"scaleIn .15s ease"}}>
      <div style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontWeight:700,fontSize:14}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> Notificações {unread>0&&<span style={{marginLeft:6,padding:"2px 8px",borderRadius:999,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",fontSize:11,color:"#f87171"}}>{unread}</span>}</div>
        {unread>0&&<button onClick={onMarkRead} style={{background:"none",border:"none",color:"var(--blue)",fontSize:11,cursor:"pointer",fontWeight:600}}>Marcar como lidas</button>}
      </div>
      <div style={{maxHeight:380,overflowY:"auto"}}>
        {notifs.length===0
          ?<div style={{padding:"32px 18px",textAlign:"center",color:"var(--t3)",fontSize:13}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.888 17.888 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Nenhuma notificação</div>
          :notifs.map(n=>{
            const sm=STATUS[n.type]||{icon:"◌",dot:"var(--t3)",label:n.type};
            return(
              <div key={n.id} onClick={()=>onOpen(n)} style={{padding:"12px 18px",borderBottom:"1px solid var(--border)",background:n.read?"transparent":`${sm.color||sm.dot}08`,cursor:"pointer",transition:"background .15s"}}
                onMouseOver={e=>e.currentTarget.style.background="var(--s3)"} onMouseOut={e=>e.currentTarget.style.background=n.read?"transparent":`${sm.color||sm.dot}08`}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:9,background:`${sm.dot}15`,border:`1px solid ${sm.dot}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{sm.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:n.read?400:700,color:"var(--t1)",marginBottom:2}}>Sua demanda foi <span style={{color:sm.dot}}>{sm.label?.toLowerCase()}</span></div>
                    <div style={{fontSize:12,color:"var(--t2)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.demand_title}</div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:3}}>{fmt(n.created_at)}</div>
                  </div>
                  {!n.read&&<div style={{width:7,height:7,borderRadius:"50%",background:"var(--blue)",flexShrink:0,marginTop:4}}/>}
                </div>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function QueueView({demands,overrides,onOpen}) {
  const [squad,setSquad] = useState("industria");
  const cur = curSprint();
  const sq  = demands.filter(d=>d.squad===squad);
  const inSprint = sq.filter(d=>["aprovada","em_andamento","em_aprovacao","concluida"].includes(d.status)&&d.sprint);
  const pending  = sq.filter(d=>d.status==="pendente");
  const rejected = sq.filter(d=>d.status==="rejeitada");
  const sprints  = [...new Set(inSprint.map(d=>d.sprint))].sort((a,b)=>a-b);
  const sqColor  = SQUAD_COLOR[squad];
  const totalAll = demands.length;

  return(
    <div style={{flex:1,padding:"24px 0",animation:"fadeUp .35s ease"}}>

      {/* Header with sprint badge */}
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,letterSpacing:"-.8px",marginBottom:6,color:"var(--t1)"}}>Filas por Sprint</h1>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:13,color:"var(--t3)"}}>Sprint atual:</span>
            <span style={{padding:"3px 12px",borderRadius:999,background:`rgba(${sqColor.rgb},.12)`,border:`1px solid rgba(${sqColor.rgb},.25)`,fontSize:12,fontWeight:700,color:sqColor.h}}>
              Sprint {cur}
            </span>
            <span style={{fontSize:12,color:"var(--t3)",fontFamily:"var(--mono)"}}>{sprintRange(cur,overrides)}</span>
          </div>
        </div>
        {/* Quick stats */}
        <div style={{display:"flex",gap:8}}>
          {[["Total",totalAll,"var(--t2)"],["Ativas",demands.filter(d=>["aprovada","em_andamento","em_aprovacao"].includes(d.status)).length,"#5b8dee"],["Concluídas",demands.filter(d=>d.status==="concluida").length,"#3ecf8e"]].map(([l,v,c])=>(
            <div key={l} style={{padding:"8px 14px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,textAlign:"center",minWidth:72}}>
              <div style={{fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:3,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Squad selector — tabs style */}
      <div style={{display:"flex",gap:8,marginBottom:28,padding:"4px",background:"var(--s2)",borderRadius:14,border:"1px solid var(--border)",width:"fit-content"}}>
        {SQUADS.map(s=>{
          const sq2=SQUAD_COLOR[s]; const active=s===squad;
          const total=demands.filter(d=>d.squad===s).length;
          const pend=demands.filter(d=>d.squad===s&&d.status==="pendente").length;
          return(
            <button key={s} onClick={()=>setSquad(s)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",borderRadius:10,border:`1px solid ${active?sq2.h+"50":"transparent"}`,
                background:active?`rgba(${sq2.rgb},.1)`:"transparent",
                cursor:"pointer",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",color:"inherit",minWidth:160}}>
              <div style={{width:34,height:34,borderRadius:10,background:`rgba(${sq2.rgb},.15)`,border:`1px solid rgba(${sq2.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,transition:"all .2s",boxShadow:active?`0 4px 12px rgba(${sq2.rgb},.25)`:"none"}}>
                {SQUAD_ICON[s]}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontWeight:700,fontSize:14,color:active?sq2.h:"var(--t2)",transition:"color .15s"}}>{SQUAD_LABEL[s]}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:1}}>{total} task{total!==1?"s":""}  {pend>0&&<span style={{color:"#f59e0b"}}>· {pend} pendente{pend!==1?"s":""}</span>}</div>
              </div>
              {active&&<div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:sq2.h,boxShadow:`0 0 10px ${sq2.h}`,animation:"pulse 2s infinite",flexShrink:0}}/>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {demands.length===0
        ?<EmptySlate icon="📭" title="Nenhuma demanda ainda" sub="Quando usuários enviarem tasks, elas aparecerão aqui organizadas por sprint."/>
        :<div style={{display:"flex",flexDirection:"column",gap:28}}>
          {/* Sprint sections */}
          {sprints.map(sp=>{
            const spDemands=inSprint.filter(d=>d.sprint===sp).sort((a,b)=>PRIO_ORDER[a.priority]-PRIO_ORDER[b.priority]);
            const isCur=sp===cur; const isPast=sp<cur;
            const {start,end}=sprintDates(sp,overrides);
            const elapsed=Math.min(100,Math.max(0,Math.round(((new Date()-start)/((end.getTime()+86400000)-start.getTime()))*100)));
            return(
              <div key={sp}>
                {/* Sprint header */}
                <div className="sprint-header" style={{padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:14,
                  borderColor:isCur?`${sqColor.h}40`:"var(--border)",
                  boxShadow:isCur?`0 0 0 1px ${sqColor.h}15,0 4px 16px rgba(0,0,0,.2)`:"none"}}>
                  <div style={{width:44,height:44,borderRadius:12,
                    background:isCur?`rgba(${sqColor.rgb},.15)`:"var(--s3)",
                    border:`2px solid ${isCur?sqColor.h:"var(--border)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:"var(--mono)",fontSize:14,fontWeight:900,
                    color:isCur?sqColor.h:"var(--t3)",flexShrink:0}}>
                    {sp}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                      <span style={{fontWeight:800,fontSize:15,color:"var(--t1)"}}>Sprint {sp}</span>
                      <span style={{padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:600,
                        background:isCur?"rgba(62,207,142,.12)":isPast?"rgba(148,163,184,.08)":"rgba(91,141,238,.1)",
                        border:`1px solid ${isCur?"rgba(62,207,142,.25)":isPast?"rgba(148,163,184,.15)":"rgba(91,141,238,.2)"}`,
                        color:isCur?"#3ecf8e":isPast?"var(--t3)":"#5b8dee"}}>
                        {isCur?"● Em andamento":isPast?"✓ Concluída":"◎ Futura"}
                      </span>
                      {overrides[sp]&&<span style={{fontSize:10,color:"#f59e0b",fontWeight:600}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></svg> editada</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:isCur||isPast?6:0}}>
                      {sprintRange(sp,overrides)} · <strong style={{color:"var(--t2)"}}>{spDemands.length}</strong> task(s)
                    </div>
                    {(isCur||isPast)&&(
                      <div style={{height:4,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:4,transition:"width .6s ease",
                          background:isCur?`linear-gradient(90deg,${sqColor.h},${sqColor.h}88)`:sqColor.h,
                          width:`${isCur?elapsed:100}%`}}/>
                      </div>
                    )}
                  </div>
                  {isCur&&<div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:sqColor.h}}>{elapsed}%</div>
                    <div style={{fontSize:10,color:"var(--t3)"}}>concluído</div>
                  </div>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:12,paddingLeft:10,borderLeft:`2px solid ${sqColor.h}20`}}>
                  {spDemands.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
                </div>
              </div>
            );
          })}

          {/* Pending section */}
          {pending.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,var(--border),transparent)"}}/>
                <span style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:"var(--t3)",padding:"5px 14px",borderRadius:999,border:"1px solid var(--border)",background:"var(--s2)",whiteSpace:"nowrap"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Aguardando Aprovação · {pending.length}
                </span>
                <div style={{height:1,width:40,background:"var(--border)"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:12}}>
                {pending.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
              </div>
            </div>
          )}

          {/* Rejected section */}
          {rejected.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(239,68,68,.2),transparent)"}}/>
                <span style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:"#f87171",padding:"5px 14px",borderRadius:999,border:"1px solid rgba(239,68,68,.2)",background:"rgba(239,68,68,.06)",whiteSpace:"nowrap"}}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Rejeitadas · {rejected.length}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:12}}>
                {rejected.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
              </div>
            </div>
          )}

          {/* Empty squad state */}
          {sq.length===0&&(
            <EmptySlate icon={SQUAD_ICON[squad]} title={`Nenhuma task para ${SQUAD_LABEL[squad]}`} sub="Este squad ainda não tem demandas. Tasks aprovadas e pendentes aparecerão aqui."/>
          )}
        </div>
      }
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// MY TASKS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function MyTasksView({demands,onOpen}) {
  const sorted = [...demands].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt));
  const [filter,setFilter] = useState("all");
  const filtered = filter==="all" ? sorted : sorted.filter(d=>d.status===filter);
  const stats = Object.entries(STATUS).map(([k,v])=>({key:k,meta:v,count:demands.filter(d=>d.status===k).length}));

  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease"}}>
      {/* Header */}
      <div style={{marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Minhas Tasks</h1>
          <p style={{fontSize:13,color:"var(--t3)"}}>{sorted.length} solicitação(ões) no total</p>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{display:"flex",gap:8,marginBottom:24,overflowX:"auto",paddingBottom:4}}>
        <button onClick={()=>setFilter("all")} style={{padding:"10px 16px",borderRadius:12,border:`1px solid ${filter==="all"?"var(--blue)":"var(--border)"}`,background:filter==="all"?"rgba(59,130,246,.1)":"var(--s2)",color:filter==="all"?"var(--blue)":"var(--t3)",fontSize:12,fontWeight:filter==="all"?700:400,cursor:"pointer",flexShrink:0,transition:"all .15s"}}>
          Todas <span style={{opacity:.7}}>({sorted.length})</span>
        </button>
        {stats.filter(s=>s.count>0).map(({key,meta,count})=>(
          <button key={key} onClick={()=>setFilter(key)} style={{padding:"10px 16px",borderRadius:12,border:`1px solid ${filter===key?meta.color:"var(--border)"}`,background:filter===key?`${meta.color}10`:"var(--s2)",color:filter===key?meta.dot:"var(--t3)",fontSize:12,fontWeight:filter===key?700:400,cursor:"pointer",flexShrink:0,transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
            {meta.icon} {meta.label} <span style={{opacity:.7}}>({count})</span>
          </button>
        ))}
      </div>

      {filtered.length===0
        ?<EmptySlate icon="📂" title="Nenhuma task encontrada" sub="Tente outro filtro ou crie sua primeira task."/>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
          {filtered.map((d,i)=><TaskCard key={d.id} demand={d} index={i} onClick={()=>onOpen(d)}/>)}
        </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS VIEW
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsView({demands}) {
  const total = demands.length;
  const bySquad = SQUADS.map(s=>({squad:s,count:demands.filter(d=>d.squad===s).length}));
  const byStatus = Object.entries(STATUS).map(([k,v])=>({status:k,meta:v,count:demands.filter(d=>d.status===k).length}));
  const byPrio = Object.entries(PRIO_LABEL).map(([k,v])=>({prio:k,label:v,color:PRIO_COLOR[k],count:demands.filter(d=>d.priority===k).length}));
  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease"}}>
      <div style={{marginBottom:24}}><h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Visão Geral</h1><p style={{fontSize:13,color:"var(--t3)"}}>Total: {total} demanda(s)</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
        {/* By Squad */}
        <div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,padding:22}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Por Squad</div>
          {bySquad.map(({squad:s,count})=>{
            const c=SQUAD_COLOR[s]; const pct=total?Math.round((count/total)*100):0;
            return(<div key={s} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13}}>{SQUAD_ICON[s]} {SQUAD_LABEL[s]}</span><span style={{fontSize:13,fontWeight:700,color:c.h}}>{count}</span></div>
              <div style={{height:6,background:"var(--border)",borderRadius:4}}><div style={{height:"100%",background:c.h,width:`${pct}%`,borderRadius:4,transition:"width .5s"}}/></div>
            </div>);
          })}
        </div>
        {/* By Status */}
        <div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,padding:22}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Por Status</div>
          {byStatus.map(({status,meta,count})=>(
            <div key={status} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{fontSize:13}}>{meta.icon} {meta.label}</span>
              <span style={{fontSize:14,fontWeight:800,color:meta.dot}}>{count}</span>
            </div>
          ))}
        </div>
        {/* By Priority */}
        <div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,padding:22}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Por Prioridade</div>
          {byPrio.map(({prio,label,color,count})=>{
            const pct=total?Math.round((count/total)*100):0;
            return(<div key={prio} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13}}>{label}</span><span style={{fontSize:13,fontWeight:700,color}}>{count}</span></div>
              <div style={{height:6,background:"var(--border)",borderRadius:4}}><div style={{height:"100%",background:color,width:`${pct}%`,borderRadius:4,transition:"width .5s"}}/></div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN VIEW
// ─────────────────────────────────────────────────────────────────────────────
// Flat SVG icons for admin sidebar
const IC = {
  pending:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  approved:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  progress:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  review:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  done:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  rejected:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  users:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  backlog:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  sprints:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  email:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  delete:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  approve:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  reject:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  sprint:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 12 12 5 19 12"/><polyline points="5 19 12 12 19 19"/></svg>,
  status:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  open:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

function AdminView({demands,config,backlog,isAdmin,overrides,onApprove,onDelete,onUpdateStatus,onMoveSprint,onSaveConfig,onBacklog,onOpen}) {
  const [tab,setTab]            = useState("pending");
  const [users,setUsers]        = useState([]);
  const [confirmDel,setConfirm] = useState(null);

  const pending    = demands.filter(d=>d.status==="pendente");
  const approved   = demands.filter(d=>d.status==="aprovada");
  const inProgress = demands.filter(d=>d.status==="em_andamento");
  const inReview   = demands.filter(d=>d.status==="em_aprovacao");
  const concluded  = demands.filter(d=>d.status==="concluida");
  const rejected   = demands.filter(d=>d.status==="rejeitada");

  useEffect(()=>{ if(isAdmin) dbProfiles().then(setUsers); },[isAdmin]);

  async function updateRole(userId,roles) {
    const profile = users.find(u=>u.id===userId)||{};
    const primaryRole = ADMIN_EMAILS.includes(profile.email)?"admin":(roles[0]||"user");
    const updated = {...profile,id:userId,roles,role:primaryRole,updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated);
    setUsers(p=>p.map(u=>u.id===userId?{...updated,roles}:u));
  }

  const demandTabs = [
    {id:"pending",      icon:IC.pending,   label:"Pendentes",    count:pending.length,    color:"#94a3b8", list:pending},
    {id:"approved",     icon:IC.approved,  label:"Aprovadas",    count:approved.length,   color:"#22c55e", list:approved},
    {id:"em_andamento", icon:IC.progress,  label:"Em Andamento", count:inProgress.length, color:"#3b82f6", list:inProgress},
    {id:"em_aprovacao", icon:IC.review,    label:"Em Aprovação", count:inReview.length,   color:"#f59e0b", list:inReview},
    {id:"concluded",    icon:IC.done,      label:"Concluídas",   count:concluded.length,  color:"#8b5cf6", list:concluded},
    {id:"rejected",     icon:IC.rejected,  label:"Rejeitadas",   count:rejected.length,   color:"#ef4444", list:rejected},
  ];
  const settingTabs = isAdmin ? [
    {id:"users",   icon:IC.users,   label:"Usuários",  color:"#a78bfa"},
    {id:"backlog", icon:IC.backlog, label:"Backlog",   color:"#34d399"},
    {id:"sprints", icon:IC.sprints, label:"Sprints",   color:"#fbbf24"},
    {id:"email",   icon:IC.email,   label:"E-mail",    color:"#818cf8"},
  ] : [];

  const allTabs = [...demandTabs,...settingTabs];
  const activeTab = allTabs.find(t=>t.id===tab);
  const list = demandTabs.find(t=>t.id===tab)?.list||[];
  const isDemandTab = demandTabs.some(t=>t.id===tab);
  const totalActive = pending.length+approved.length+inProgress.length+inReview.length;

  return(
    <div style={{flex:1,display:"flex",gap:0,minHeight:0,width:"100%"}}>
      {/* Confirm delete */}
      {confirmDel&&(
        <div className="modal-bg" onClick={()=>setConfirm(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--s2)",border:"1px solid rgba(239,68,68,.4)",borderRadius:20,padding:32,width:360,textAlign:"center",animation:"scaleIn .2s ease"}}>
            <div style={{width:48,height:48,borderRadius:14,background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",color:"#f87171"}}>{IC.delete}</div>
            <h3 style={{fontWeight:800,fontSize:18,marginBottom:8}}>Excluir task?</h3>
            <p style={{fontSize:13,color:"var(--t3)",marginBottom:24,lineHeight:1.6}}>"{confirmDel.title}" será removida permanentemente e não poderá ser recuperada.</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-danger" onClick={()=>{onDelete(confirmDel.id);setConfirm(null);}} style={{flex:1,justifyContent:"center",padding:"11px",fontSize:13}}>Excluir</button>
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)} style={{flex:1,justifyContent:"center",padding:"11px",fontSize:13}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div style={{width:240,flexShrink:0,padding:"28px 0 28px 0",display:"flex",flexDirection:"column",gap:0,borderRight:"1px solid var(--border)",background:"var(--s1)"}}>
        {/* Header */}
        <div style={{padding:"0 20px 20px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>Painel Admin</div>
          {/* Summary cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Ativas",totalActive,"#3b82f6"],["Concluídas",concluded.length,"#8b5cf6"]].map(([l,v,c])=>(
              <div key={l} style={{padding:"10px 12px",background:"var(--s2)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div style={{fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:3,fontWeight:600}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Demand tabs */}
        <div style={{padding:"16px 12px 8px",flex:1}}>
          <div style={{fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,paddingLeft:8}}>Tasks</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {demandTabs.map(t=>{
              const active = tab===t.id;
              return(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",transition:"all .15s",textAlign:"left",
                    background:active?`${t.color}15`:"transparent",
                    color:active?t.color:"var(--t3)"}}>
                  <span style={{opacity:active?1:.7,flexShrink:0}}>{t.icon}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:active?600:400}}>{t.label}</span>
                  {t.count>0&&<span style={{minWidth:22,height:18,borderRadius:999,background:active?`${t.color}25`:"var(--border)",fontSize:10,fontWeight:700,color:active?t.color:"var(--t3)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 6px"}}>{t.count}</span>}
                </button>
              );
            })}
          </div>

          {/* Settings tabs */}
          {isAdmin&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,paddingLeft:8}}>Configurações</div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {settingTabs.map(t=>{
                  const active = tab===t.id;
                  return(
                    <button key={t.id} onClick={()=>setTab(t.id)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,border:"none",cursor:"pointer",transition:"all .15s",textAlign:"left",
                        background:active?`${t.color}15`:"transparent",
                        color:active?t.color:"var(--t3)"}}>
                      <span style={{opacity:active?1:.7,flexShrink:0}}>{t.icon}</span>
                      <span style={{fontSize:13,fontWeight:active?600:400}}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,padding:"28px 0 28px 28px",overflowY:"auto",minWidth:0}}>
        {/* Page header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{width:38,height:38,borderRadius:11,background:activeTab?`${activeTab.color}15`:"var(--s2)",border:`1px solid ${activeTab?activeTab.color+"30":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",color:activeTab?.color||"var(--t2)",flexShrink:0}}>
            {activeTab?.icon}
          </div>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,letterSpacing:"-.5px",lineHeight:1,marginBottom:3}}>{activeTab?.label||"Admin"}</h1>
            {isDemandTab&&<p style={{fontSize:12,color:"var(--t3)"}}>{list.length} task(s) {activeTab?.label?.toLowerCase()}</p>}
          </div>
        </div>

        {/* Content panels */}
        {tab==="email"   && <EmailCfgPanel config={config.emailConfig||{}} onSave={c=>onSaveConfig({emailConfig:c})}/>}
        {tab==="sprints" && <SprintMgrPanel overrides={overrides} onSave={o=>onSaveConfig({sprintOverrides:o})}/>}
        {tab==="backlog" && <BacklogPanel items={backlog} onSave={onBacklog}/>}
        {tab==="users"   && <UserMgrPanel users={users} onUpdateRole={updateRole}/>}

        {isDemandTab&&(
          list.length===0
            ?<EmptySlate icon={<span style={{fontSize:40,opacity:.3}}>{activeTab?.icon}</span>} title={`Nenhuma task ${activeTab?.label?.toLowerCase()}`} sub=""/>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[...list].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map(d=>(
                <AdminTaskRow key={d.id} demand={d} overrides={overrides}
                  canAct={tab==="pending"}
                  canStatus={["approved","em_andamento","em_aprovacao"].includes(tab)}
                  onApprove={onApprove} onDelete={()=>setConfirm(d)}
                  onUpdateStatus={onUpdateStatus} onMoveSprint={onMoveSprint}
                  onOpen={()=>onOpen(d)}/>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}

function AdminTaskRow({demand,overrides,canAct,canStatus,onApprove,onDelete,onUpdateStatus,onMoveSprint,onOpen}) {
  const [actOpen,setActOpen]   = useState(false);
  const [statOpen,setStatOpen] = useState(false);
  const [spOpen,setSpOpen]     = useState(false);
  const [sprint,setSprint]     = useState(curSprint());
  const [note,setNote]         = useState("");
  const [statNote,setStatNote] = useState("");
  const [loading,setLoading]   = useState(false);
  const sq = SQUAD_COLOR[demand.squad]||{h:"#64748b",rgb:"100,116,139"};
  const sm = STATUS[demand.status]||STATUS.pendente;
  const cur = curSprint(); const nxt = cur+1;

  async function approve(status) { setLoading(true); await onApprove({demandId:demand.id,status,sprint,adminNote:note}); setLoading(false); setActOpen(false); setNote(""); }
  async function updStatus(s)    { setLoading(true); await onUpdateStatus(demand.id,s,statNote); setLoading(false); setStatOpen(false); setStatNote(""); }
  async function moveSp(sp)      { await onMoveSprint(demand.id,sp); setSpOpen(false); }

  return(
    <div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
      {/* Row */}
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:`rgba(${sq.rgb},.12)`,border:`1px solid rgba(${sq.rgb},.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{SQUAD_ICON[demand.squad]}</div>
        <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={onOpen}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{demand.title}</div>
          <div style={{display:"flex",gap:10,fontSize:11,color:"var(--t3)",flexWrap:"wrap"}}>
            <span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {demand.user_name}</span>
            {demand.team&&<span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> {demand.team}</span>}
            <span style={{color:sq.h}}>● {SQUAD_LABEL[demand.squad]}</span>
            {demand.sprint&&<span style={{color:"#38bdf8",fontFamily:"var(--mono)"}}>Sprint {demand.sprint}</span>}
          </div>
        </div>
        <PrioBadge priority={demand.priority}/>
        <StatusBadge status={demand.status}/>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {canAct&&<button className="btn btn-ghost" onClick={()=>{setActOpen(p=>!p);setStatOpen(false);setSpOpen(false);}} style={{fontSize:11,padding:"6px 12px",gap:6,background:actOpen?"rgba(99,102,241,.15)":"",borderColor:actOpen?"rgba(99,102,241,.4)":"",color:actOpen?"#818cf8":""}}>{IC.approve} Avaliar</button>}
          {canStatus&&<button className="btn btn-ghost" onClick={()=>{setStatOpen(p=>!p);setActOpen(false);setSpOpen(false);}} style={{fontSize:11,padding:"6px 12px",gap:6,background:statOpen?"rgba(56,189,248,.1)":"",borderColor:statOpen?"rgba(56,189,248,.3)":"",color:statOpen?"#38bdf8":""}}>{IC.status} Status</button>}
          {demand.sprint&&demand.status!=="concluida"&&<button className="btn btn-ghost" onClick={()=>{setSpOpen(p=>!p);setActOpen(false);setStatOpen(false);}} style={{fontSize:11,padding:"6px 12px",gap:6,background:spOpen?"rgba(251,191,36,.1)":"",borderColor:spOpen?"rgba(251,191,36,.3)":"",color:spOpen?"#fbbf24":""}}>{IC.sprint} Sprint</button>}
          <button onClick={onOpen} className="btn btn-ghost" style={{padding:"6px 10px",fontSize:11,gap:5}}>{IC.open}</button>
          <button className="btn btn-danger" onClick={onDelete} style={{padding:"6px 10px"}}>{IC.delete}</button>
        </div>
      </div>

      {/* Approve panel */}
      {actOpen&&(
        <div style={{padding:"16px 18px",borderTop:"1px solid rgba(99,102,241,.2)",background:"rgba(99,102,241,.03)",animation:"fadeIn .15s"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:14}}>
            <div>
              <FieldLabel>Alocar na sprint</FieldLabel>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                {[{sp:cur,label:"Sprint Atual",color:"#22c55e"},{sp:nxt,label:"Próxima",color:"#6366f1"}].map(({sp,label,color})=>(
                  <button key={sp} onClick={()=>setSprint(sp)} style={{flex:1,padding:"10px 8px",border:`2px solid ${sprint===sp?color:"var(--border)"}`,borderRadius:10,background:sprint===sp?`${color}10`:"var(--s1)",color:sprint===sp?color:"var(--t3)",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"}}>
                    <div style={{fontSize:13,marginBottom:2}}>#{sp}</div><div>{label}</div>
                    <div style={{fontSize:9,fontFamily:"var(--mono)",opacity:.7,marginTop:2}}>{sprintRange(sp,overrides)}</div>
                  </button>
                ))}
              </div>
              <details style={{fontSize:11,color:"var(--t3)"}}>
                <summary style={{cursor:"pointer",padding:"4px 0",userSelect:"none"}}>Outra sprint →</summary>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6,maxHeight:150,overflowY:"auto"}}>
                  {Array.from({length:6},(_,i)=>cur+i).filter(s=>s!==cur&&s!==nxt).map(sp=>(
                    <button key={sp} onClick={()=>setSprint(sp)} style={{padding:"7px 10px",border:`1px solid ${sprint===sp?"#6366f1":"var(--border)"}`,borderRadius:7,background:sprint===sp?"rgba(99,102,241,.12)":"var(--s1)",color:sprint===sp?"#818cf8":"var(--t3)",fontSize:11,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                      <span>Sprint {sp}</span><span style={{fontFamily:"var(--mono)",fontSize:9,opacity:.6}}>{sprintRange(sp,overrides)}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <div>
              <FieldLabel>Nota para o solicitante</FieldLabel>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} placeholder="Nota sobre a aprovação/rejeição..." className="input" style={{resize:"none",lineHeight:1.6,fontSize:12}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn" onClick={()=>approve("aprovada")} disabled={loading} style={{flex:1,justifyContent:"center",padding:"10px",border:"1px solid rgba(34,197,94,.4)",borderRadius:10,background:"rgba(34,197,94,.1)",color:"#4ade80",fontSize:13,fontWeight:700,opacity:loading?.6:1}}>
              {loading?<Spin/>:`✅ Aprovar → Sprint ${sprint}`}
            </button>
            <button className="btn" onClick={()=>approve("rejeitada")} disabled={loading} style={{flex:1,justifyContent:"center",padding:"10px",border:"1px solid rgba(239,68,68,.35)",borderRadius:10,background:"rgba(239,68,68,.08)",color:"#f87171",fontSize:13,fontWeight:700,opacity:loading?.6:1}}>
              {loading?<Spin/>:"❌ Rejeitar"}
            </button>
          </div>
        </div>
      )}

      {/* Status panel */}
      {statOpen&&(
        <div style={{padding:"14px 18px",borderTop:"1px solid rgba(56,189,248,.2)",background:"rgba(56,189,248,.03)",animation:"fadeIn .15s"}}>
          <FieldLabel>Atualizar status</FieldLabel>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {[...FLOW.slice(1),"rejeitada"].map(s=>{ const sm2=STATUS[s]; return(
              <button key={s} onClick={()=>updStatus(s)} disabled={demand.status===s||loading}
                style={{padding:"7px 14px",border:`1px solid ${sm2.color}44`,borderRadius:9,background:demand.status===s?`${sm2.color}20`:"var(--s1)",color:sm2.dot,fontSize:12,fontWeight:600,cursor:demand.status===s?"default":"pointer",opacity:demand.status===s?.5:1,transition:"all .15s"}}>
                {sm2.icon} {sm2.label}
              </button>
            );})}
          </div>
          <input className="input" value={statNote} onChange={e=>setStatNote(e.target.value)} placeholder="Nota opcional..." style={{fontSize:12,padding:"8px 12px"}}/>
        </div>
      )}

      {/* Sprint move panel */}
      {spOpen&&(
        <div style={{padding:"14px 18px",borderTop:"1px solid rgba(251,191,36,.2)",background:"rgba(251,191,36,.03)",animation:"fadeIn .15s"}}>
          <FieldLabel>Mover para sprint</FieldLabel>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Array.from({length:6},(_,i)=>cur+i).map(sp=>(
              <button key={sp} onClick={()=>moveSp(sp)} style={{padding:"8px 14px",border:`1px solid ${demand.sprint===sp?"#fbbf24":"var(--border)"}`,borderRadius:9,background:demand.sprint===sp?"rgba(251,191,36,.12)":"var(--s1)",color:demand.sprint===sp?"#fbbf24":"var(--t3)",fontSize:12,fontWeight:demand.sprint===sp?700:400,cursor:"pointer",transition:"all .15s"}}>
                Sprint {sp}{sp===cur&&<span style={{fontSize:9,color:"#4ade80",marginLeft:4}}>atual</span>}
                <div style={{fontSize:9,fontFamily:"var(--mono)",opacity:.6}}>{sprintRange(sp,overrides)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGER  (multi-role support)
// ─────────────────────────────────────────────────────────────────────────────
function UserMgrPanel({users,onUpdateRole}) {
  const [search,setSearch]   = useState("");
  const [saving,setSaving]   = useState({});
  const filtered = users.filter(u=>u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase()));
  const allRoles = Object.keys(ROLES);

  async function toggleRole(user,role) {
    if (ADMIN_EMAILS.includes(user.email)) return;
    const current = user.roles||[user.role||"user"];
    const next = current.includes(role) ? current.filter(r=>r!==role) : [...current,role];
    if (next.length===0) return; // must have at least one role
    setSaving(p=>({...p,[user.id]:true}));
    await onUpdateRole(user.id,next);
    setSaving(p=>({...p,[user.id]:false}));
  }

  return(
    <div>
      <div style={{display:"flex",gap:12,marginBottom:20}}>
        <input className="input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuário..." style={{maxWidth:320}}/>
        <div style={{fontSize:13,color:"var(--t3)",display:"flex",alignItems:"center"}}>{users.length} usuário(s)</div>
      </div>

      {/* Role legend */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {allRoles.map(r=>{ const rm=ROLES[r]; return(
          <div key={r} style={{padding:"4px 12px",borderRadius:999,background:`${rm.color}12`,border:`1px solid ${rm.color}30`,fontSize:11,fontWeight:600,color:rm.color,display:"flex",alignItems:"center",gap:4}}>
            {rm.icon} {rm.label}
          </div>
        );})}
      </div>

      {filtered.length===0
        ?<EmptySlate icon="◌" title="Nenhum usuário" sub=""/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map((u,i)=>{
            const roles = u.roles||[u.role||"user"];
            const isProtected = ADMIN_EMAILS.includes(u.email);
            return(
              <div key={u.id} style={{padding:"16px 18px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:14,display:"flex",alignItems:"center",gap:14,animation:`fadeUp .2s ease ${i*.04}s both`}}>
                <Avatar name={u.name} url={u.avatar_url} size={42} radius={11}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3,display:"flex",alignItems:"center",gap:8}}>
                    {u.name||"Sem nome"}
                    {isProtected&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> protegido</span>}
                  </div>
                  <div style={{fontSize:12,color:"var(--t3)"}}>{u.email}</div>
                  {u.job_title&&<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{u.job_title}</div>}
                </div>

                {/* Current roles */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",maxWidth:280}}>
                  {isProtected
                    ? <div style={{padding:"5px 12px",borderRadius:999,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",fontSize:12,fontWeight:700}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Admin</div>
                    : allRoles.map(r=>{ const rm=ROLES[r]; const active=roles.includes(r); return(
                        <button key={r} onClick={()=>toggleRole(u,r)} disabled={saving[u.id]}
                          style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${active?rm.color+"55":"var(--border)"}`,background:active?`${rm.color}12`:"var(--s1)",color:active?rm.color:"var(--t3)",fontSize:11,fontWeight:active?700:400,cursor:"pointer",transition:"all .15s",opacity:saving[u.id]?.6:1}}>
                          {rm.icon} {rm.label}
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CONFIG (Resend)
// ─────────────────────────────────────────────────────────────────────────────
function EmailCfgPanel({config,onSave}) {
  const [form,setForm] = useState({
    resendKey:config.resendKey||"",
    fromEmail:config.fromEmail||"",
    powerAutomateUrl:config.powerAutomateUrl||""
  });
  const [testing,setTesting]  = useState(false);
  const [testResult,setTestResult] = useState(null);
  const [testPA,setTestPA] = useState(false);
  const [testPAResult,setTestPAResult] = useState(null);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function testEmail() {
    setTesting(true); setTestResult(null);
    const r = await sendResend({apiKey:form.resendKey,from:form.fromEmail,to:form.fromEmail,subject:"[TaskHUB] Teste de e-mail",html:"<p>E-mail de teste enviado com sucesso pelo TaskHUB!</p>"});
    setTestResult(r); setTesting(false);
  }

  async function testPowerAutomate() {
    setTestPA(true); setTestPAResult(null);
    try {
      await triggerPowerAutomate(form.powerAutomateUrl, {
        event:"test",
        demand_title:"Task de Teste",
        demand_squad:"Indústria",
        demand_status:"Aprovada",
        demand_priority:"Média",
        user_email:"teste@oficinabrasil.com.br",
        user_name:"Usuário Teste",
        admin_note:"Teste de conexão com Power Automate",
        sprint:"Sprint 36",
        updated_at:new Date().toISOString(),
        app_url:window.location.origin,
      });
      setTestPAResult({ok:true});
    } catch(e) { setTestPAResult({ok:false,reason:e.message}); }
    setTestPA(false);
  }

  return(
    <div style={{maxWidth:600,display:"flex",flexDirection:"column",gap:16}}>
      {/* Resend */}
      <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Configuração de E-mail (Resend)
        </div>
        <p style={{fontSize:13,color:"var(--t3)",marginBottom:20,lineHeight:1.7}}>
          O TaskHUB usa <a href="https://resend.com" target="_blank" rel="noreferrer">Resend</a> para envio de e-mails. Crie uma conta gratuita (100 e-mails/dia), verifique seu domínio e cole as credenciais abaixo.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          <div>
            <FieldLabel>Resend API Key</FieldLabel>
            <input className="input" value={form.resendKey} onChange={f("resendKey")} placeholder="re_xxxxxxxxxxxxxxxxxxxx" type="password"/>
          </div>
          <div>
            <FieldLabel>E-mail remetente (From)</FieldLabel>
            <input className="input" value={form.fromEmail} onChange={f("fromEmail")} placeholder="noreply@seudominio.com"/>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:5}}>Para testes use: <code style={{color:"var(--blue)"}}>onboarding@resend.dev</code></div>
          </div>
        </div>
        {testResult&&(
          <div style={{marginBottom:14,padding:"10px 14px",borderRadius:8,fontSize:12,background:testResult.ok?"rgba(62,207,142,.1)":"rgba(239,68,68,.1)",border:`1px solid ${testResult.ok?"rgba(62,207,142,.3)":"rgba(239,68,68,.3)"}`,color:testResult.ok?"#3ecf8e":"#f87171"}}>
            {testResult.ok?`Enviado! ID: ${testResult.id}`:`Erro: ${testResult.reason}`}
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={()=>onSave(form)} style={{flex:1,justifyContent:"center",padding:"11px"}}>Salvar tudo</button>
          <button className="btn btn-ghost" onClick={testEmail} disabled={!form.resendKey||!form.fromEmail||testing} style={{padding:"11px 20px"}}>
            {testing?<><Spin/>Testando...</>:"Testar e-mail"}
          </button>
        </div>
      </div>

      {/* Power Automate */}
      <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Power Automate (Microsoft)
        </div>
        <p style={{fontSize:13,color:"var(--t3)",marginBottom:16,lineHeight:1.7}}>
          Conecte ao Power Automate para enviar notificações via Outlook/Teams quando tasks forem aprovadas, rejeitadas ou atualizadas.
        </p>

        <div style={{padding:14,background:"rgba(91,141,238,.07)",border:"1px solid rgba(91,141,238,.2)",borderRadius:10,marginBottom:18,fontSize:12,color:"#93c5fd",lineHeight:1.8}}>
          <strong style={{color:"#60a5fa",display:"block",marginBottom:4}}>Como configurar:</strong>
          1. Acesse <a href="https://make.powerautomate.com" target="_blank" rel="noreferrer" style={{color:"#60a5fa"}}>make.powerautomate.com</a><br/>
          2. Criar → <strong>Flow automatizado</strong> → gatilho: <strong>"Quando uma solicitação HTTP é recebida"</strong><br/>
          3. Adicione uma ação <strong>Enviar e-mail (Outlook)</strong> ou <strong>Publicar mensagem (Teams)</strong><br/>
          4. Salve → copie a URL gerada e cole abaixo<br/>
          5. Use as variáveis: <code style={{background:"rgba(0,0,0,.2)",padding:"1px 5px",borderRadius:3}}>triggerBody()?['user_email']</code>, <code style={{background:"rgba(0,0,0,.2)",padding:"1px 5px",borderRadius:3}}>triggerBody()?['demand_title']</code>, <code style={{background:"rgba(0,0,0,.2)",padding:"1px 5px",borderRadius:3}}>triggerBody()?['demand_status']</code>
        </div>

        <div style={{marginBottom:16}}>
          <FieldLabel>URL do Webhook (HTTP POST)</FieldLabel>
          <input className="input" value={form.powerAutomateUrl} onChange={f("powerAutomateUrl")} placeholder="https://prod-xx.westus.logic.azure.com/workflows/..."/>
          <div style={{fontSize:11,color:"var(--t3)",marginTop:5}}>
            Eventos enviados: <code style={{color:"#93c5fd"}}>task_approved</code> · <code style={{color:"#93c5fd"}}>task_rejected</code> · <code style={{color:"#93c5fd"}}>status_updated</code> · <code style={{color:"#93c5fd"}}>sprint_updated</code>
          </div>
        </div>

        {testPAResult&&(
          <div style={{marginBottom:14,padding:"10px 14px",borderRadius:8,fontSize:12,background:testPAResult.ok?"rgba(62,207,142,.1)":"rgba(239,68,68,.1)",border:`1px solid ${testPAResult.ok?"rgba(62,207,142,.3)":"rgba(239,68,68,.3)"}`,color:testPAResult.ok?"#3ecf8e":"#f87171"}}>
            {testPAResult.ok?"Webhook disparado com sucesso! Verifique o Power Automate.":(`Erro: ${testPAResult.reason}`)}
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={()=>onSave(form)} style={{flex:1,justifyContent:"center",padding:"11px"}}>Salvar tudo</button>
          <button className="btn btn-ghost" onClick={testPowerAutomate} disabled={!form.powerAutomateUrl||testPA} style={{padding:"11px 20px"}}>
            {testPA?<><Spin/>Testando...</>:"Testar webhook"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRINT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function SprintMgrPanel({overrides={},onSave}) {
  const cur = curSprint();
  const nums = Array.from({length:12},(_,i)=>cur+i);

  function def(n,baseOverrides={}) {
    const d = sprintDates(n, baseOverrides);
    return {start:toISO(d.start), end:toISO(d.end)};
  }

  const [local,setLocal] = useState(()=>{
    const o={};
    nums.forEach(n=>{
      o[n] = overrides[n] ? {start:overrides[n].start,end:overrides[n].end} : def(n,overrides);
    });
    return o;
  });

  // When a sprint's END date changes, cascade all subsequent sprints
  function handleEndChange(n, newEnd) {
    setLocal(prev => {
      const next = {...prev, [n]:{...prev[n], end:newEnd}};
      // Cascade: each subsequent sprint starts the day after previous ends
      for (let i = nums.indexOf(n)+1; i < nums.length; i++) {
        const prevN = nums[i-1];
        const prevEnd = new Date(next[prevN].end);
        const sprintLen = 14; // default sprint length in days
        const newStart = new Date(prevEnd);
        newStart.setDate(newStart.getDate()+1);
        const newEndD = new Date(newStart);
        newEndD.setDate(newEndD.getDate()+sprintLen-1);
        next[nums[i]] = {
          start: toISO(newStart),
          end: toISO(newEndD),
        };
      }
      return next;
    });
  }

  // When a sprint's START date changes, adjust its end and cascade
  function handleStartChange(n, newStart) {
    setLocal(prev => {
      const next = {...prev};
      const prevEnd = new Date(prev[n].end);
      const prevStart = new Date(prev[n].start);
      const duration = Math.round((prevEnd - prevStart)/(1000*60*60*24));
      const ns = new Date(newStart);
      const ne = new Date(ns);
      ne.setDate(ne.getDate() + duration);
      next[n] = {start:newStart, end:toISO(ne)};
      // Cascade subsequent sprints
      for (let i = nums.indexOf(n)+1; i < nums.length; i++) {
        const prevN = nums[i-1];
        const pe = new Date(next[prevN].end);
        const ss = new Date(pe); ss.setDate(ss.getDate()+1);
        const se = new Date(ss); se.setDate(se.getDate()+13);
        next[nums[i]] = {start:toISO(ss), end:toISO(se)};
      }
      return next;
    });
  }

  function save() {
    const r={};
    nums.forEach(n=>{
      const d=def(n,{});
      if(local[n].start!==d.start||local[n].end!==d.end) r[n]={start:local[n].start,end:local[n].end};
    });
    onSave(r);
  }

  function resetAll() {
    const o={};
    nums.forEach(n=>{ o[n]=def(n,{}); });
    setLocal(o);
  }

  const hasChanges = nums.some(n=>{ const d=def(n,{}); return local[n]?.start!==d.start||local[n]?.end!==d.end; });
  const editedCount = nums.filter(n=>{ const d=def(n,{}); return local[n]?.start!==d.start||local[n]?.end!==d.end; }).length;

  return(
    <div style={{maxWidth:760}}>
      <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Gerenciar Sprints
          </div>
          {hasChanges&&<button className="btn btn-ghost" onClick={resetAll} style={{fontSize:11,padding:"5px 12px",color:"#f87171",borderColor:"rgba(239,68,68,.3)"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
            Resetar tudo
          </button>}
        </div>
        <p style={{fontSize:13,color:"var(--t3)",marginBottom:8,lineHeight:1.6}}>
          Alterar a data de fim de uma sprint <strong style={{color:"var(--t2)"}}>recalcula automaticamente</strong> todas as sprints seguintes.
        </p>
        <div style={{padding:"8px 12px",background:"rgba(245,158,11,.07)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,fontSize:11,color:"#fde68a",marginBottom:20,display:"flex",alignItems:"center",gap:7}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Alterar datas não move demandas já aprovadas. {editedCount>0&&<strong style={{color:"#fbbf24"}}>{editedCount} sprint(s) editada(s)</strong>}
        </div>

        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr 90px 36px",gap:10,padding:"6px 10px",fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>
          <span>Sprint</span><span>Início</span><span>Fim</span><span>Status</span><span></span>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {nums.map(n=>{
            const d=def(n,{});
            const edited=local[n]?.start!==d.start||local[n]?.end!==d.end;
            const isCur=n===cur;
            const isFuture=n>cur;
            return(
              <div key={n} style={{display:"grid",gridTemplateColumns:"72px 1fr 1fr 90px 36px",gap:10,padding:"10px 10px",
                background:isCur?"rgba(91,141,238,.05)":edited?"rgba(245,158,11,.04)":"var(--s1)",
                border:`1px solid ${edited?"rgba(245,158,11,.35)":isCur?"rgba(91,141,238,.25)":"var(--border)"}`,
                borderRadius:10,alignItems:"center",
                transition:"border-color .2s,background .2s"}}>
                {/* Sprint number */}
                <div>
                  <div style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:13,color:isCur?"var(--blue)":edited?"#fbbf24":"var(--t2)"}}>
                    #{n}
                  </div>
                  <div style={{fontSize:9,fontWeight:600,marginTop:1,color:isCur?"#3ecf8e":isFuture?"var(--t3)":"var(--t3)"}}>
                    {isCur?"atual":isFuture?"futura":"passada"}
                  </div>
                </div>
                {/* Start date */}
                <input type="date" value={local[n]?.start||""} onChange={e=>handleStartChange(n,e.target.value)}
                  style={{padding:"7px 10px",background:"var(--s2)",border:`1px solid ${edited?"rgba(245,158,11,.3)":"var(--border)"}`,borderRadius:7,color:"var(--t1)",fontSize:12,outline:"none",width:"100%",cursor:"pointer"}}/>
                {/* End date */}
                <input type="date" value={local[n]?.end||""} onChange={e=>handleEndChange(n,e.target.value)}
                  style={{padding:"7px 10px",background:"var(--s2)",border:`1px solid ${edited?"rgba(245,158,11,.3)":"var(--border)"}`,borderRadius:7,color:"var(--t1)",fontSize:12,outline:"none",width:"100%",cursor:"pointer"}}/>
                {/* Status badge */}
                <div style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:999,textAlign:"center",
                  background:edited?"rgba(245,158,11,.12)":isCur?"rgba(91,141,238,.1)":"transparent",
                  color:edited?"#fbbf24":isCur?"var(--blue)":"var(--t3)",
                  border:`1px solid ${edited?"rgba(245,158,11,.25)":isCur?"rgba(91,141,238,.2)":"transparent"}`}}>
                  {edited?"editada":isCur?"atual":"padrão"}
                </div>
                {/* Reset button */}
                <button onClick={()=>setLocal(p=>({...p,[n]:def(n,{})}))} title="Resetar sprint"
                  style={{width:32,height:32,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
                  onMouseOver={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="rgba(239,68,68,.3)";}}
                  onMouseOut={e=>{e.currentTarget.style.color="var(--t3)";e.currentTarget.style.borderColor="var(--border)";}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",gap:10,marginTop:20,alignItems:"center"}}>
          <button className="btn btn-primary" onClick={save} disabled={!hasChanges}
            style={{padding:"11px 24px",opacity:hasChanges?1:.4,justifyContent:"center",flex:1}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {hasChanges?`Salvar (${editedCount} alteração${editedCount>1?"ões":""})` :"Sem alterações"}
          </button>
          {hasChanges&&<div style={{fontSize:11,color:"var(--t3)"}}>As datas subsequentes foram recalculadas automaticamente.</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKLOG PANEL
// ─────────────────────────────────────────────────────────────────────────────
const REQ_STATUS_COLORS = {pendente:"#f97316","em andamento":"#38bdf8",concluído:"#4ade80",cancelado:"#94a3b8"};
function BacklogPanel({items=[],onSave}) {
  const [list,setList]   = useState(items);
  const [adding,setAdding] = useState(null);
  const [editId,setEditId] = useState(null);
  const [reveal,setReveal] = useState({});
  const [filter,setFilter] = useState("all");
  const blank = t => ({id:uid(),type:t,title:"",login:"",password:"",notes:"",status:"pendente",created_at:new Date().toISOString()});
  const [form,setForm] = useState(blank("account"));
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  function startEdit(item) { setForm({...item}); setEditId(item.id); setAdding(item.type); }
  async function save() {
    if(!form.title.trim()) return;
    await dbUpsertBacklog(form);
    let next; if(editId) next=list.map(i=>i.id===editId?{...form}:i); else next=[...list,{...form}];
    setList(next); onSave(next); setAdding(null); setEditId(null);
  }
  async function remove(id) { await dbDeleteBacklog(id); const next=list.filter(i=>i.id!==id); setList(next); onSave(next); }
  async function updStatus(id,status) { const item={...list.find(i=>i.id===id),status}; await dbUpsertBacklog(item); const next=list.map(i=>i.id===id?item:i); setList(next); onSave(next); }

  const displayed = filter==="all"?list:list.filter(i=>i.type===filter);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",gap:8}}>
          {[["all","Todos",list.length],["account","Contas",list.filter(i=>i.type==="account").length],["request","Solicitações",list.filter(i=>i.type==="request").length]].map(([v,l,c])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{padding:"7px 14px",border:`1px solid ${filter===v?"#34d399":"var(--border)"}`,borderRadius:9,background:filter===v?"rgba(52,211,153,.1)":"var(--s1)",color:filter===v?"#34d399":"var(--t3)",fontSize:12,fontWeight:filter===v?700:400,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              {l}<span style={{fontSize:10,opacity:.7}}>{c}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setForm(blank("account"));setAdding("account");setEditId(null);}} style={{padding:"8px 14px",border:"1px solid rgba(52,211,153,.4)",borderRadius:9,background:"rgba(52,211,153,.08)",color:"#34d399",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Conta</button>
          <button onClick={()=>{setForm(blank("request"));setAdding("request");setEditId(null);}} style={{padding:"8px 14px",border:"1px solid rgba(56,189,248,.4)",borderRadius:9,background:"rgba(56,189,248,.08)",color:"#38bdf8",fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Solicitação</button>
        </div>
      </div>

      {adding&&(
        <div style={{padding:22,background:"var(--s2)",border:`1px solid ${adding==="account"?"rgba(52,211,153,.3)":"rgba(56,189,248,.3)"}`,borderRadius:14,marginBottom:20,animation:"fadeUp .2s ease"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:adding==="account"?"#34d399":"#38bdf8"}}>{editId?"Editar":"+"} {adding==="account"?"Conta / Senha":"Solicitação"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{gridColumn:"1/-1"}}><FieldLabel>Título</FieldLabel><input className="input" value={form.title} onChange={f("title")} placeholder={adding==="account"?"Ex.: AWS Console":"Ex.: Renovar SSL"}/></div>
            {adding==="account"&&<><div><FieldLabel>Login</FieldLabel><input className="input" value={form.login} onChange={f("login")} placeholder="usuario@empresa.com"/></div><div><FieldLabel>Senha</FieldLabel><input className="input" value={form.password} onChange={f("password")} placeholder="••••••"/></div></>}
            {adding==="request"&&<div><FieldLabel>Status</FieldLabel><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["pendente","em andamento","concluído","cancelado"].map(s=><button key={s} onClick={()=>setForm(p=>({...p,status:s}))} style={{padding:"5px 10px",border:`1px solid ${form.status===s?REQ_STATUS_COLORS[s]:"var(--border)"}`,borderRadius:7,background:form.status===s?`${REQ_STATUS_COLORS[s]}15`:"var(--s1)",color:form.status===s?REQ_STATUS_COLORS[s]:"var(--t3)",fontSize:11,cursor:"pointer"}}>{s}</button>)}</div></div>}
            <div style={{gridColumn:"1/-1"}}><FieldLabel>Observações</FieldLabel><textarea className="input" value={form.notes} onChange={f("notes")} rows={3} style={{resize:"none"}}/></div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button className="btn btn-primary" onClick={save} style={{padding:"9px 20px"}}>{editId?"Salvar":"Adicionar"}</button>
            <button className="btn btn-ghost" onClick={()=>{setAdding(null);setEditId(null);}} style={{padding:"9px 16px"}}>Cancelar</button>
          </div>
        </div>
      )}

      {displayed.length===0?<EmptySlate icon="◌" title="Backlog vazio" sub='Clique em "+ Conta" ou "+ Solicitação"'/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {displayed.map((item,i)=>{
            const isAcc=item.type==="account"; const ac=isAcc?"#34d399":"#38bdf8"; const sc=REQ_STATUS_COLORS[item.status]||"#94a3b8";
            return(
              <div key={item.id} style={{padding:"14px 18px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,animation:`fadeUp .2s ease ${i*.03}s both`}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`${ac}12`,border:`1px solid ${ac}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{isAcc?<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{item.title}</div>
                    <div style={{fontSize:11,color:"var(--t3)"}}>{isAcc&&item.login?"● " + item.login:!isAcc?<span style={{color:sc}}>● {item.status}</span>:""}</div>
                  </div>
                  {!isAcc&&<select value={item.status} onChange={e=>updStatus(item.id,e.target.value)} onClick={e=>e.stopPropagation()} style={{padding:"4px 8px",border:`1px solid ${sc}44`,borderRadius:7,background:`${sc}10`,color:sc,fontSize:11,fontWeight:700,outline:"none",cursor:"pointer"}}>
                    {["pendente","em andamento","concluído","cancelado"].map(s=><option key={s} value={s} style={{background:"var(--bg)",color:"var(--t1)"}}>{s}</option>)}
                  </select>}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>startEdit(item)} style={{width:30,height:30,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",fontSize:13}} onMouseOver={e=>e.currentTarget.style.color="#38bdf8"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    {isAcc&&<button onClick={()=>setReveal(p=>({...p,[item.id]:!p[item.id]}))} style={{width:30,height:30,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",fontSize:13}}>{reveal[item.id]?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}</button>}
                    <button onClick={()=>remove(item.id)} className="btn btn-danger" style={{width:30,height:30,padding:0,justifyContent:"center",fontSize:13}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                </div>
                {isAcc&&reveal[item.id]&&<div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={{padding:"8px 12px",background:"var(--s1)",borderRadius:8}}><div style={{fontSize:10,color:"var(--t3)",marginBottom:3}}>LOGIN</div><div style={{fontSize:13,fontFamily:"var(--mono)",color:"var(--t2)"}}>{item.login||"—"}</div></div>
                  <div style={{padding:"8px 12px",background:"var(--s1)",borderRadius:8}}><div style={{fontSize:10,color:"var(--t3)",marginBottom:3}}>SENHA</div><div style={{fontSize:13,fontFamily:"var(--mono)",color:"#4ade80"}}>{item.password||"—"}</div></div>
                </div>}
                {item.notes&&<div style={{marginTop:8,fontSize:12,color:"var(--t3)",lineHeight:1.5}}>{item.notes}</div>}
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW TASK VIEW
// ─────────────────────────────────────────────────────────────────────────────
function NewTaskView({user,onSubmit}) {
  const [form,setForm] = useState({squad:"industria",priority:"media",tag:"nova_demanda",title:"",team:"",description:""});
  const [files,setFiles] = useState([]);
  const [errors,setErrors] = useState({});
  const [loading,setLoading] = useState(false);
  const [submitted,setSubmitted] = useState(false);
  const fileRef = useRef();
  const titleRef = useRef();
  const f = k => e => { setForm(p=>({...p,[k]:e.target.value})); if(errors[k]) setErrors(p=>({...p,[k]:null})); };
  const sq = SQUAD_COLOR[form.squad]||{h:"#64748b",rgb:"100,116,139"};

  // Auto-focus title on mount
  useEffect(()=>{ setTimeout(()=>titleRef.current?.focus(),100); },[]);

  async function submit() {
    const e={};
    if(!form.title.trim()) e.title="Título é obrigatório";
    if(!form.description.trim()) e.description="Descrição é obrigatória";
    if(form.description.trim().length<20) e.description="Descreva com pelo menos 20 caracteres";
    setErrors(e); if(Object.keys(e).length) return;
    setLoading(true);
    await onSubmit({id:uid(),user_id:user.id||user.email,user_email:user.email,user_name:user.name,...form,files,created_at:new Date().toISOString(),status:"pendente",sprint:null});
    setLoading(false);
    setSubmitted(true);
  }

  // Success state
  if(submitted) return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeUp .4s ease"}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{width:80,height:80,borderRadius:24,background:"rgba(62,207,142,.12)",border:"2px solid rgba(62,207,142,.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",animation:"scaleIn .4s cubic-bezier(.34,1.56,.64,1)"}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3ecf8e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{fontSize:24,fontWeight:900,letterSpacing:"-.5px",marginBottom:8,color:"var(--t1)"}}>Task enviada!</h2>
        <p style={{fontSize:14,color:"var(--t3)",lineHeight:1.7,marginBottom:28}}>Sua solicitação foi recebida e será analisada pelo time. Você receberá uma notificação quando for aprovada.</p>
        <div style={{padding:"14px 20px",background:"rgba(62,207,142,.06)",border:"1px solid rgba(62,207,142,.2)",borderRadius:12,fontSize:13,color:"#3ecf8e",marginBottom:24}}>
          <strong>"{form.title}"</strong> · {SQUAD_LABEL[form.squad]}
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button className="btn btn-primary" onClick={()=>setSubmitted(false)&&setForm({squad:"industria",priority:"media",tag:"nova_demanda",title:"",team:"",description:""})} style={{padding:"10px 20px",borderRadius:10}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova Task
          </button>
          <button className="btn btn-ghost" onClick={()=>setSubmitted(false)} style={{padding:"10px 20px",borderRadius:10}}>Ver Filas</button>
        </div>
      </div>
    </div>
  );

  const descLen = form.description.trim().length;
  const isComplete = form.title.trim() && descLen >= 20;

  return(
    <div style={{flex:1,padding:"24px 0",animation:"fadeUp .35s ease"}}>
      {/* Header */}
      <div style={{marginBottom:28,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,letterSpacing:"-.8px",marginBottom:6}}>Nova Task</h1>
          <p style={{fontSize:13,color:"var(--t3)"}}>Preencha os detalhes da sua solicitação para o squad <strong style={{color:sq.h}}>{SQUAD_LABEL[form.squad]}</strong></p>
        </div>
        {/* Completeness indicator */}
        <div style={{flexShrink:0,padding:"8px 16px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32}}>
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke={isComplete?"#3ecf8e":"#5b8dee"} strokeWidth="3"
                strokeDasharray={`${(isComplete?100:Math.min(90,((form.title?40:0)+(descLen>0?Math.min(50,descLen/20*50):0))))*0.879} 87.9`}
                strokeLinecap="round" transform="rotate(-90 18 18)"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:isComplete?"#3ecf8e":"var(--t2)"}}>{isComplete?"Pronto!":"Preenchendo..."}</div>
            <div style={{fontSize:9,color:"var(--t3)"}}>Completude</div>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20}}>
        {/* Left — main form */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Title + Team */}
          <div style={{padding:22,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
              <div style={{width:28,height:28,borderRadius:8,background:`rgba(${sq.rgb},.15)`,border:`1px solid rgba(${sq.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{SQUAD_ICON[form.squad]}</div>
              <span style={{fontWeight:700,fontSize:14,color:"var(--t1)"}}>Informações básicas</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <FieldLabel>Título <span style={{color:"#f87171"}}>*</span></FieldLabel>
                <input ref={titleRef} className="input" value={form.title} onChange={f("title")}
                  placeholder="Ex.: Implementar editor de texto no OB ADS"
                  style={{borderColor:errors.title?"#ef4444":form.title?"rgba(62,207,142,.4)":"",fontSize:15,fontWeight:form.title?600:400}}/>
                {errors.title
                  ? <div style={{fontSize:11,color:"#f87171",marginTop:5,display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.title}</div>
                  : form.title && <div style={{fontSize:11,color:"#3ecf8e",marginTop:5,display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Ótimo!</div>
                }
              </div>
              <div>
                <FieldLabel>Time solicitante</FieldLabel>
                <input className="input" value={form.team} onChange={f("team")} placeholder="Ex.: Operações, TI, Comercial..."/>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{padding:22,background:"var(--s2)",border:`1px solid ${errors.description?"rgba(239,68,68,.4)":"var(--border)"}`,borderRadius:16,transition:"border-color .2s"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span style={{fontWeight:700,fontSize:14}}>Descrição <span style={{color:"#f87171"}}>*</span></span>
              </div>
              <span style={{fontSize:11,fontFamily:"var(--mono)",color:descLen<20?"var(--t3)":descLen>200?"#3ecf8e":"#5b8dee"}}>
                {descLen} / 20 mín.
              </span>
            </div>
            <textarea className="input" value={form.description} onChange={f("description")} rows={7}
              placeholder="Descreva detalhadamente:&#10;• O que precisa ser feito?&#10;• Por que é necessário?&#10;• Quais são os critérios de aceite?"
              style={{resize:"vertical",lineHeight:1.75,borderColor:"transparent",background:"var(--s1)",padding:"12px 14px"}}/>
            {errors.description && <div style={{fontSize:11,color:"#f87171",marginTop:6,display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.description}</div>}
            {/* Progress bar */}
            <div style={{marginTop:10,height:2,background:"var(--border)",borderRadius:2}}>
              <div style={{height:"100%",borderRadius:2,transition:"width .3s,background .3s",
                background:descLen<20?"#f59e0b":descLen>100?"#3ecf8e":"#5b8dee",
                width:`${Math.min(100,(descLen/200)*100)}%`}}/>
            </div>
          </div>

          {/* Attachments */}
          <div style={{padding:22,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span style={{fontWeight:700,fontSize:14}}>Anexos <span style={{fontSize:11,color:"var(--t3)",fontWeight:400}}>(opcional)</span></span>
            </div>
            <div onClick={()=>fileRef.current.click()}
              style={{border:"1.5px dashed var(--border)",borderRadius:12,padding:"20px 16px",textAlign:"center",cursor:"pointer",transition:"all .2s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=sq.h;e.currentTarget.style.background=`rgba(${sq.rgb},.04)`;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="transparent";}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" style={{marginBottom:8}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{fontSize:13,color:"var(--t3)",fontWeight:500}}>Arraste arquivos ou <span style={{color:"var(--blue)"}}>clique para selecionar</span></div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>PDF, imagens, docs — qualquer formato</div>
              <input ref={fileRef} type="file" multiple onChange={e=>setFiles(p=>[...p,...Array.from(e.target.files).map(x=>({name:x.name,size:x.size}))])} style={{display:"none"}}/>
            </div>
            {files.length>0&&(
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>
                {files.map((fl,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--s3)",borderRadius:9,fontSize:12,border:"1px solid var(--border)"}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span style={{flex:1,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fl.name}</span>
                    <span style={{color:"var(--t3)",flexShrink:0}}>{(fl.size/1024).toFixed(0)}KB</span>
                    <button onClick={()=>setFiles(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"var(--t3)",cursor:"pointer",fontSize:16,lineHeight:1,padding:"0 2px",transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — config sidebar */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Squad */}
          <div style={{padding:18,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Squad <span style={{color:"#f87171"}}>*</span></FieldLabel>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
              {SQUADS.map(s=>{
                const c=SQUAD_COLOR[s]; const sel=form.squad===s;
                return(
                  <button key={s} onClick={()=>setForm(p=>({...p,squad:s}))}
                    style={{padding:"10px 12px",border:`1.5px solid ${sel?c.h+"60":"var(--border)"}`,borderRadius:10,
                      background:sel?`rgba(${c.rgb},.1)`:"var(--s1)",
                      color:"inherit",fontSize:13,fontWeight:sel?700:400,
                      textAlign:"left",cursor:"pointer",transition:"all .2s cubic-bezier(.34,1.56,.64,1)",
                      display:"flex",alignItems:"center",gap:9,
                      boxShadow:sel?`0 4px 12px rgba(${c.rgb},.2)`:"none"}}>
                    <div style={{width:28,height:28,borderRadius:8,background:`rgba(${c.rgb},.15)`,border:`1px solid rgba(${c.rgb},.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{SQUAD_ICON[s]}</div>
                    <span style={{color:sel?c.h:"var(--t2)"}}>{SQUAD_LABEL[s]}</span>
                    {sel&&<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.h} strokeWidth="2.5" style={{marginLeft:"auto"}}><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div style={{padding:18,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Prioridade</FieldLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}>
              {Object.entries(PRIO_LABEL).map(([k,v])=>{
                const sel=form.priority===k; const c=PRIO_COLOR[k];
                const dot=k==="critica"?"<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0,verticalAlign:"middle"}}/>":k==="alta"?"<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#f97316",flexShrink:0,verticalAlign:"middle"}}/>":k==="media"?"<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#eab308",flexShrink:0,verticalAlign:"middle"}}/>":"<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0,verticalAlign:"middle"}}/>";
                return(
                  <button key={k} onClick={()=>setForm(p=>({...p,priority:k}))}
                    style={{padding:"9px 8px",border:`1px solid ${sel?c+"60":"var(--border)"}`,borderRadius:9,
                      background:sel?`${c}12`:"var(--s1)",color:sel?c:"var(--t3)",
                      fontSize:12,fontWeight:sel?700:400,cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                    {dot} {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type */}
          <div style={{padding:18,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Tipo</FieldLabel>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
              {Object.entries(TAG_LABEL).map(([k,v])=>{
                const sel=form.tag===k; const c=TAG_COLOR[k];
                return(
                  <button key={k} onClick={()=>setForm(p=>({...p,tag:k}))}
                    style={{padding:"9px 12px",border:`1px solid ${sel?c+"55":"var(--border)"}`,borderRadius:9,
                      background:sel?`${c}10`:"var(--s1)",color:sel?c:"var(--t2)",
                      fontSize:12,fontWeight:sel?700:400,textAlign:"left",cursor:"pointer",transition:"all .15s",
                      display:"flex",alignItems:"center",gap:7}}>
                    <span>{TAG_ICON[k]}</span>{v}
                    {sel&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" style={{marginLeft:"auto"}}><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit button */}
          <button className="btn btn-primary" onClick={submit} disabled={loading||!isComplete}
            style={{padding:"14px",fontSize:14,borderRadius:12,justifyContent:"center",width:"100%",
              background:isComplete?`linear-gradient(135deg,${sq.h},#6366f1)`:"var(--s3)",
              boxShadow:isComplete?`0 4px 20px rgba(${sq.rgb},.3)`:"none",
              color:isComplete?"#fff":"var(--t3)",
              border:isComplete?"none":"1px solid var(--border)",
              cursor:isComplete?"pointer":"not-allowed",
              transition:"all .2s"}}>
            {loading?<><Spin/>Enviando...</>:isComplete?<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Enviar Task</>:"Complete os campos obrigatórios"}
          </button>
          {!isComplete&&<div style={{fontSize:11,color:"var(--t3)",textAlign:"center",marginTop:-6}}>
            {!form.title.trim()?"Adicione um título":"Descrição precisa de pelo menos 20 caracteres"}
          </div>}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ProfileView({user,onUpdate,demands}) {
  const [profile,setProfile] = useState(null);
  const [tab,setTab]         = useState("info");
  const [form,setForm]       = useState({name:"",job_title:"",team:"",phone:"",bio:""});
  const [prefs,setPrefs]     = useState({emailNotify:true});
  const [saving,setSaving]   = useState(false);
  const [saved,setSaved]     = useState(false);
  const [uploading,setUploading] = useState(false);
  const [pwForm,setPwForm]   = useState({current:"",newPw:"",confirm:""});
  const [pwMsg,setPwMsg]     = useState(null);
  const [pwSaving,setPwSaving] = useState(false);
  const fileRef = useRef();
  const f  = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const fp = k => e => setPwForm(p=>({...p,[k]:e.target.value}));
  const myDemands = demands.filter(d=>d.user_id===user.id||d.user_email===user.email);
  const roles = profile?.roles||[profile?.role||user?.role||"user"];
  const stats = Object.entries(STATUS).map(([k,v])=>({key:k,meta:v,count:myDemands.filter(d=>d.status===k).length}));
  const totalDone = myDemands.filter(d=>d.status==="concluida").length;
  const totalAll  = myDemands.length;
  const pct = totalAll ? Math.round((totalDone/totalAll)*100) : 0;

  useEffect(()=>{
    dbProfile(user.id||user.email).then(p=>{
      if(p){ setProfile(p); setForm({name:p.name||"",job_title:p.job_title||"",team:p.team||"",phone:p.phone||"",bio:p.bio||""}); setPrefs(p.prefs||{emailNotify:true}); }
      else { setForm({name:user.name||"",job_title:"",team:"",phone:"",bio:""}); }
    });
  },[user]);

  async function save() {
    setSaving(true);
    const updated={id:user.id||user.email,email:user.email,name:form.name,role:user.role,job_title:form.job_title,team:form.team,phone:form.phone,bio:form.bio,prefs,avatar_url:profile?.avatar_url||null,updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated); setProfile(updated); setSaving(false); setSaved(true);
    onUpdate({...user,name:form.name}); setTimeout(()=>setSaved(false),2500);
  }
  async function changePassword() {
    setPwMsg(null); setPwSaving(true);
    if (!pwForm.current||!pwForm.newPw||!pwForm.confirm) { setPwMsg({ok:false,text:"Preencha todos os campos."}); setPwSaving(false); return; }
    if (pwForm.newPw!==pwForm.confirm) { setPwMsg({ok:false,text:"Senhas não coincidem."}); setPwSaving(false); return; }
    if (pwForm.newPw.length<6) { setPwMsg({ok:false,text:"Mínimo 6 caracteres."}); setPwSaving(false); return; }
    const u = await dbLogin(user.email, pwForm.current);
    if (!u) { setPwMsg({ok:false,text:"Senha atual incorreta."}); setPwSaving(false); return; }
    const s = sb();
    if (s) await s.from("profiles").update({password:pwForm.newPw,updated_at:new Date().toISOString()}).eq("email",user.email);
    setPwMsg({ok:true,text:"Senha alterada com sucesso!"}); setPwForm({current:"",newPw:"",confirm:""}); setPwSaving(false);
  }
  async function handleAvatar(e) {
    const file=e.target.files?.[0]; if(!file) return; setUploading(true);
    const url=await dbAvatar(user.id||user.email,file);
    const updated={...(profile||{}),id:user.id||user.email,email:user.email,avatar_url:url,updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated); setProfile(updated); setUploading(false);
  }

  const profileTabs = [{id:"info",label:"Informações"},{id:"security",label:"Segurança"},{id:"tasks",label:`Tasks (${totalAll})`}];

  return(
    <div style={{flex:1,animation:"fadeUp .35s ease",paddingBottom:40,minWidth:0}}>
      {/* Cover banner — fully contained */}
      <div style={{marginTop:28,marginBottom:60,position:"relative"}}>
        <div style={{height:130,background:"linear-gradient(135deg,#1e2230 0%,#22262f 40%,#1a1d26 100%)",borderRadius:20,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(59,130,246,.15) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(99,102,241,.12) 0%,transparent 50%)"}}/>
          {/* Progress ring */}
          <div style={{position:"absolute",top:14,right:20,display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"rgba(0,0,0,.35)",borderRadius:999,backdropFilter:"blur(8px)"}}>
            <svg width="32" height="32" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#4ade80" strokeWidth="3" strokeDasharray={`${pct*.879} 87.9`} strokeLinecap="round" transform="rotate(-90 18 18)"/>
              <text x="18" y="22" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">{pct}%</text>
            </svg>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{totalDone}/{totalAll}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>concluídas</div>
            </div>
          </div>
        </div>
        {/* Avatar sitting below banner edge */}
        <div style={{position:"absolute",bottom:-44,left:24}}>
          <div style={{position:"relative"}}>
            <div onClick={()=>fileRef.current.click()} style={{width:88,height:88,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",border:"4px solid var(--bg)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
              {profile?.avatar_url?<img src={profile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(form.name||user.name||"?").charAt(0).toUpperCase()}
            </div>
            <div onClick={()=>fileRef.current.click()} style={{position:"absolute",bottom:2,right:2,width:24,height:24,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"3px solid var(--bg)"}}>
              {uploading?<Spin/>:<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:"none"}}/>
          </div>
        </div>
      </div>

      {/* Name + roles row */}
      <div style={{padding:"0 32px",marginBottom:24,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:900,letterSpacing:"-.5px",marginBottom:4}}>{form.name||user.name}</h1>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"var(--t3)"}}>{user.email}</span>
            {form.job_title&&<><span style={{color:"var(--border)"}}>·</span><span style={{fontSize:13,color:"var(--t2)"}}>{form.job_title}</span></>}
            {form.team&&<><span style={{color:"var(--border)"}}>·</span><span style={{fontSize:13,color:"var(--t2)"}}>{form.team}</span></>}
          </div>
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            {roles.map(r=>{ const rm=ROLES[r]||ROLES.user; return <span key={r} style={{padding:"3px 10px",borderRadius:999,background:`${rm.color}12`,border:`1px solid ${rm.color}30`,fontSize:11,fontWeight:700,color:rm.color}}>{rm.icon} {rm.label}</span>; })}
          </div>
        </div>
        {/* Stat pills */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[["Total",totalAll,"var(--blue)"],["Concluídas",totalDone,"#8b5cf6"],["Pendentes",myDemands.filter(d=>d.status==="pendente").length,"#94a3b8"]].map(([l,v,c])=>(
            <div key={l} style={{padding:"10px 16px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,textAlign:"center",minWidth:72}}>
              <div style={{fontSize:22,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginTop:3,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding:"0 32px",marginBottom:24}}>
        <div style={{display:"flex",gap:2,background:"var(--s1)",borderRadius:12,padding:4,border:"1px solid var(--border)",width:"fit-content"}}>
          {profileTabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 20px",borderRadius:9,border:"none",fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",transition:"all .15s",background:tab===t.id?"var(--s2)":"transparent",color:tab===t.id?"var(--t1)":"var(--t3)",boxShadow:tab===t.id?"0 2px 8px rgba(0,0,0,.3)":"none"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{padding:"0 32px"}}>
        {/* INFO TAB */}
        {tab==="info"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:900}}>
            <div style={{gridColumn:"1/-1",padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:20,display:"flex",alignItems:"center",gap:8}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Informações Pessoais
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div><FieldLabel>Nome completo</FieldLabel><input className="input" value={form.name} onChange={f("name")} placeholder="Seu nome"/></div>
                <div><FieldLabel>Cargo / Função</FieldLabel><input className="input" value={form.job_title} onChange={f("job_title")} placeholder="Ex.: Designer de Produto"/></div>
                <div><FieldLabel>Time / Departamento</FieldLabel><input className="input" value={form.team} onChange={f("team")} placeholder="Ex.: Produto"/></div>
                <div><FieldLabel>Telefone</FieldLabel><input className="input" value={form.phone} onChange={f("phone")} placeholder="+55 11 9xxxx-xxxx"/></div>
                <div style={{gridColumn:"1/-1"}}><FieldLabel>Bio</FieldLabel><textarea className="input" value={form.bio} onChange={f("bio")} rows={3} placeholder="Breve descrição sobre você..." style={{resize:"none",lineHeight:1.7}}/></div>
              </div>
            </div>

            <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                Preferências
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"var(--s1)",borderRadius:10,border:"1px solid var(--border)"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>Notificações por e-mail</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Receber atualizações de tasks</div>
                </div>
                <button onClick={()=>setPrefs(p=>({...p,emailNotify:!p.emailNotify}))} style={{width:48,height:26,borderRadius:999,border:"none",background:prefs.emailNotify?"var(--blue)":"var(--border2)",transition:"all .2s",position:"relative",cursor:"pointer",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:prefs.emailNotify?26:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
                </button>
              </div>
            </div>

            <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Atividade
              </div>
              {stats.map(({key,meta,count})=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                  <div style={{width:28,height:28,borderRadius:8,background:`${meta.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>{meta.icon}</div>
                  <span style={{flex:1,fontSize:12,color:"var(--t2)"}}>{meta.label}</span>
                  <span style={{fontWeight:800,fontSize:16,color:meta.dot}}>{count}</span>
                  <div style={{width:60,height:4,background:"var(--border)",borderRadius:4}}><div style={{height:"100%",background:meta.dot,width:`${totalAll?Math.round((count/totalAll)*100):0}%`,borderRadius:4,transition:"width .5s"}}/></div>
                </div>
              ))}
            </div>

            <div style={{gridColumn:"1/-1"}}>
              <button className="btn btn-primary" onClick={save} disabled={saving} style={{padding:"13px 32px",fontSize:14,borderRadius:12,justifyContent:"center"}}>
                {saving?<><Spin/>Salvando...</>:saved?<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Salvo!</>:<>Salvar alterações</>}
              </button>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {tab==="security"&&(
          <div style={{maxWidth:480}}>
            <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Alterar Senha
              </div>
              <p style={{fontSize:12,color:"var(--t3)",marginBottom:20,lineHeight:1.6}}>Use uma senha forte com pelo menos 6 caracteres.</p>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div><FieldLabel>Senha atual</FieldLabel><input className="input" type="password" value={pwForm.current} onChange={fp("current")} placeholder="••••••••"/></div>
                <div><FieldLabel>Nova senha</FieldLabel><input className="input" type="password" value={pwForm.newPw} onChange={fp("newPw")} placeholder="Mínimo 6 caracteres"/>
                  {pwForm.newPw&&<div style={{marginTop:6,height:4,background:"var(--border)",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,transition:"all .3s",width:pwForm.newPw.length<6?"33%":pwForm.newPw.length<10?"66%":"100%",background:pwForm.newPw.length<6?"#ef4444":pwForm.newPw.length<10?"#f59e0b":"#22c55e"}}/>
                  </div>}
                </div>
                <div><FieldLabel>Confirmar nova senha</FieldLabel><input className="input" type="password" value={pwForm.confirm} onChange={fp("confirm")} placeholder="Repita a nova senha" style={{borderColor:pwForm.confirm&&pwForm.newPw!==pwForm.confirm?"#ef4444":""}}/></div>
              </div>
              {pwMsg&&<div style={{marginTop:14,padding:"10px 14px",borderRadius:9,fontSize:12,lineHeight:1.5,background:pwMsg.ok?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${pwMsg.ok?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,color:pwMsg.ok?"#4ade80":"#f87171"}}>{pwMsg.ok?"✓":""} {pwMsg.text}</div>}
              <button className="btn btn-primary" onClick={changePassword} disabled={pwSaving} style={{marginTop:18,width:"100%",justifyContent:"center",padding:"12px"}}>
                {pwSaving?<><Spin/>Alterando...</>:"Alterar senha"}
              </button>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {tab==="tasks"&&(
          <div style={{maxWidth:760}}>
            {myDemands.length===0
              ?<EmptySlate icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity:.2}}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} title="Nenhuma task enviada" sub="Clique em Nova Task para começar"/>
              :<div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[...myDemands].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map(d=>{
                  const sm=STATUS[d.status]||STATUS.pendente; const sq2=SQUAD_COLOR[d.squad]||{h:"#64748b",rgb:"100,116,139"};
                  const cur2=FLOW.indexOf(d.status); const pct2=d.status==="rejeitada"?0:Math.max(0,Math.min(100,(cur2/(FLOW.length-1))*100));
                  return(
                    <div key={d.id} style={{padding:"14px 18px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",position:"relative"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${sq2.h},transparent)`}}/>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:36,height:36,borderRadius:10,background:`rgba(${sq2.rgb},.12)`,border:`1px solid rgba(${sq2.rgb},.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{SQUAD_ICON[d.squad]}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.title}</div>
                          <div style={{fontSize:11,color:"var(--t3)"}}>{SQUAD_LABEL[d.squad]}{d.sprint&&` · Sprint ${d.sprint}`} · {fmtDate(d.created_at||d.createdAt)}</div>
                        </div>
                        <StatusBadge status={d.status}/>
                      </div>
                      {d.status!=="rejeitada"&&(
                        <div style={{marginTop:10,height:3,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",background:`linear-gradient(90deg,${sq2.h},${sm.dot})`,width:`${pct2}%`,borderRadius:3,transition:"width .5s"}}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY SLATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptySlate({icon,title,sub,action,onAction}) {
  return(
    <div style={{textAlign:"center",padding:"56px 20px",color:"var(--t3)",animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"center",marginBottom:20,fontSize:typeof icon==="string"?52:undefined}}>
        {typeof icon==="string"
          ? <div style={{width:80,height:80,borderRadius:24,background:"var(--s3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{icon}</div>
          : icon}
      </div>
      <div style={{fontSize:18,fontWeight:800,color:"var(--t2)",marginBottom:8,letterSpacing:"-.3px"}}>{title}</div>
      {sub&&<div style={{fontSize:13,color:"var(--t3)",lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>{sub}</div>}
      {action&&onAction&&(
        <button className="btn btn-primary" onClick={onAction} style={{marginTop:20,padding:"10px 24px",fontSize:13,borderRadius:10,justifyContent:"center"}}>
          {action}
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return(
    <div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",padding:"16px 18px"}}>
      <div style={{height:3,background:"var(--border)",marginBottom:14,borderRadius:3}}/>
      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{width:42,height:42,borderRadius:12,background:"var(--s3)",animation:"shimmer 1.5s infinite",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{height:14,background:"var(--s3)",borderRadius:7,marginBottom:8,width:"70%",animation:"shimmer 1.5s infinite"}}/>
          <div style={{height:10,background:"var(--s3)",borderRadius:5,width:"45%",animation:"shimmer 1.5s infinite"}}/>
        </div>
      </div>
      <div style={{marginTop:14,height:3,background:"var(--s3)",borderRadius:3,animation:"shimmer 1.5s infinite"}}/>
      <div style={{display:"flex",gap:6,marginTop:12}}>
        <div style={{width:60,height:20,background:"var(--s3)",borderRadius:999,animation:"shimmer 1.5s infinite"}}/>
        <div style={{width:80,height:20,background:"var(--s3)",borderRadius:999,animation:"shimmer 1.5s infinite"}}/>
      </div>
    </div>
  );
}

