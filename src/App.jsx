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
const SQUAD_ICON  = { industria:"🏭", reparadores:"🔧", inovacao:"💡" };
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
const TAG_ICON   = { nova_demanda:"✦", bug:"🐛" };

const STATUS = {
  pendente:    { label:"Pendente",       icon:"⏳", color:"#64748b", dot:"#94a3b8", order:0 },
  aprovada:    { label:"Aprovada",       icon:"✅", color:"#22c55e", dot:"#4ade80", order:1 },
  em_andamento:{ label:"Em Andamento",   icon:"🔄", color:"#3b82f6", dot:"#60a5fa", order:2 },
  em_aprovacao:{ label:"Em Aprovação",   icon:"🔍", color:"#f59e0b", dot:"#fbbf24", order:3 },
  concluida:   { label:"Concluída",      icon:"🏁", color:"#8b5cf6", dot:"#a78bfa", order:4 },
  rejeitada:   { label:"Rejeitada",      icon:"❌", color:"#ef4444", dot:"#f87171", order:5 },
};
const FLOW = ["pendente","aprovada","em_andamento","em_aprovacao","concluida"];

const ROLES = {
  admin:     { label:"Admin",      icon:"🛡️", color:"#818cf8" },
  moderador: { label:"Moderador",  icon:"⚖️", color:"#f472b6" },
  reparador: { label:"Reparador",  icon:"🔧", color:"#f7971e" },
  industria: { label:"Indústria",  icon:"🏭", color:"#00c9a7" },
  inovacao:  { label:"Inovação",   icon:"💡", color:"#a78bfa" },
  user:      { label:"Usuário",    icon:"👤", color:"#38bdf8" },
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
  return `${start.toLocaleDateString("pt-BR",o)} – ${end.toLocaleDateString("pt-BR",o)}${custom?" 📌":""}`;
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
async function dbProfiles() {
  const s = sb(); if (s) { const { data } = await s.from("profiles").select("*"); return data||[]; }
  return Object.values(ls.get()?.profiles||{});
}
async function dbProfile(id) {
  const s = sb(); if (s) { const { data } = await s.from("profiles").select("*").eq("id",id).single(); return data; }
  return ls.get()?.profiles?.[id]||null;
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
  <div class="info-item"><div class="info-label">👤 Solicitante</div><div class="info-value">${toName}</div></div>
  <div class="info-item"><div class="info-label">🏭 Squad</div><div class="info-value">${squadLabel}</div></div>
  ${sprint ? `<div class="info-item"><div class="info-label">📅 Sprint</div><div class="info-value">Sprint ${sprint}</div></div>` : ""}
  ${sr ? `<div class="info-item"><div class="info-label">📆 Período</div><div class="info-value">${sr}</div></div>` : ""}
  <div class="info-item"><div class="info-label">🕐 Data/Hora</div><div class="info-value">${dateTime}</div></div>
</div>
${adminNote ? `<div class="note"><div class="note-label">📝 Nota do Gestor</div><div class="note-text">${adminNote}</div></div>` : ""}
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
  --bg:#060912;--s1:#0b1121;--s2:#101928;--s3:#162033;
  --border:#1d2d45;--border2:#243650;
  --t1:#f0f4ff;--t2:#8ba3c1;--t3:#4e6a87;
  --blue:#3b82f6;--indigo:#6366f1;
  --font:'Inter',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --r:14px;--rs:8px;--rx:20px;
}
body{background:var(--bg);color:var(--t1);font-family:var(--font);min-height:100vh;overflow-x:hidden}
::selection{background:rgba(99,102,241,.35);color:#fff}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
input,textarea,select,button{font-family:var(--font)}
a{color:var(--blue)}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes slideRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes glow{0%,100%{box-shadow:0 0 12px rgba(99,102,241,.3)}50%{box-shadow:0 0 24px rgba(99,102,241,.6)}}
.card{background:var(--s2);border:1px solid var(--border);border-radius:var(--r);transition:border-color .2s,transform .2s,box-shadow .2s}
.card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,.4)}
.btn{cursor:pointer;border:none;font-family:var(--font);display:inline-flex;align-items:center;gap:8px;font-weight:600;transition:all .15s;white-space:nowrap}
.btn-primary{background:linear-gradient(135deg,var(--blue),var(--indigo));color:#fff;padding:10px 20px;border-radius:var(--rs);font-size:14px;box-shadow:0 4px 16px rgba(99,102,241,.25)}
.btn-primary:hover{opacity:.88;transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.4)}
.btn-ghost{background:transparent;border:1px solid var(--border2);color:var(--t2);padding:8px 16px;border-radius:var(--rs);font-size:13px}
.btn-ghost:hover{background:var(--s3);border-color:var(--t3);color:var(--t1)}
.btn-danger{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;padding:7px 14px;border-radius:var(--rs);font-size:12px}
.btn-danger:hover{background:rgba(239,68,68,.18)}
.input{width:100%;padding:11px 14px;background:var(--s1);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s}
.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.input::placeholder{color:var(--t3)}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;line-height:1}
.nav-link{padding:8px 16px;border-radius:var(--rs);font-size:13px;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--t2);transition:all .15s;display:flex;align-items:center;gap:6px;position:relative}
.nav-link:hover{background:var(--s2);color:var(--t1)}
.nav-link.active{background:var(--s2);color:var(--t1);font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.sidebar-link{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:var(--rs);cursor:pointer;border:none;background:transparent;color:var(--t2);font-size:14px;font-weight:500;width:100%;text-align:left;transition:all .15s}
.sidebar-link:hover{background:var(--s2);color:var(--t1)}
.sidebar-link.active{background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(99,102,241,.12));color:var(--t1);border:1px solid rgba(99,102,241,.2)}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
.modal{background:var(--s2);border:1px solid var(--border2);border-radius:var(--rx);width:100%;max-width:700px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;animation:scaleIn .2s ease;box-shadow:0 24px 80px rgba(0,0,0,.7)}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:600}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
const Spin = () => <div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.2)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .6s linear infinite",flexShrink:0}}/>;

function Toast({msg,type}) {
  const isOk = type !== "error";
  return (
    <div style={{position:"fixed",top:24,right:24,zIndex:9999,padding:"14px 20px",borderRadius:12,fontSize:13,fontWeight:600,
      animation:"slideRight .3s ease",display:"flex",alignItems:"center",gap:10,
      background:isOk?"rgba(34,197,94,.12)":"rgba(239,68,68,.12)",
      border:`1px solid ${isOk?"rgba(34,197,94,.35)":"rgba(239,68,68,.35)"}`,
      color:isOk?"#4ade80":"#f87171",boxShadow:"0 8px 32px rgba(0,0,0,.5)",
      backdropFilter:"blur(12px)",maxWidth:400}}>
      <span style={{fontSize:16}}>{isOk?"✓":"✕"}</span>{msg}
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
// TASK MODAL
// ─────────────────────────────────────────────────────────────────────────────
function TaskModal({demand,overrides,onClose,canEdit,onEdit,isAdmin}) {
  const [editing,setEditing] = useState(false);
  const [form,setForm] = useState({title:demand.title,description:demand.description,team:demand.team||"",priority:demand.priority,tag:demand.tag});
  const [saving,setSaving] = useState(false);
  const sq = SQUAD_COLOR[demand.squad]||{h:"#64748b"};
  const sm = STATUS[demand.status]||STATUS.pendente;
  const timeline = demand.timeline||[];
  const fe = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function save() {
    setSaving(true);
    await onEdit(demand.id, form);
    setSaving(false); setEditing(false);
  }

  useEffect(() => {
    const handler = e => e.key==="Escape"&&onClose();
    document.addEventListener("keydown",handler);
    return ()=>document.removeEventListener("keydown",handler);
  },[]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"flex-start",gap:14,flexShrink:0}}>
          <div style={{width:42,height:42,borderRadius:11,background:`rgba(${sq.rgb},.15)`,border:`1px solid rgba(${sq.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{SQUAD_ICON[demand.squad]}</div>
          <div style={{flex:1,minWidth:0}}>
            {editing
              ? <input className="input" value={form.title} onChange={fe("title")} style={{fontSize:18,fontWeight:700,padding:"6px 10px"}}/>
              : <h2 style={{fontSize:18,fontWeight:800,lineHeight:1.3,marginBottom:6}}>{demand.title}</h2>
            }
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <StatusBadge status={demand.status}/>
              <PrioBadge priority={demand.priority}/>
              {demand.tag && <span className="tag-chip" style={{background:`${TAG_COLOR[demand.tag]}15`,color:TAG_COLOR[demand.tag],border:`1px solid ${TAG_COLOR[demand.tag]}35`}}>{TAG_ICON[demand.tag]} {TAG_LABEL[demand.tag]}</span>}
              {demand.sprint && <span style={{fontSize:11,color:"#38bdf8",fontFamily:"var(--mono)",background:"rgba(56,189,248,.1)",padding:"2px 8px",borderRadius:5}}>Sprint {demand.sprint} · {sprintRange(demand.sprint,overrides)}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {canEdit && !editing && <button className="btn btn-ghost" onClick={()=>setEditing(true)} style={{fontSize:12,padding:"6px 12px"}}>✏️ Editar</button>}
            {editing && <button className="btn btn-primary" onClick={save} disabled={saving} style={{fontSize:12,padding:"6px 14px"}}>{saving?<Spin/>:"Salvar"}</button>}
            {editing && <button className="btn btn-ghost" onClick={()=>setEditing(false)} style={{fontSize:12,padding:"6px 12px"}}>Cancelar</button>}
            <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--s1)",color:"var(--t2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{overflowY:"auto",flex:1}}>
          {/* Progress flow */}
          <div style={{padding:"16px 24px",borderBottom:"1px solid var(--border)",background:"var(--s1)"}}>
            <FieldLabel>Progresso da Task</FieldLabel>
            <ProgressFlow status={demand.status}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 300px",minHeight:0}}>
            {/* Left */}
            <div style={{padding:"20px 24px",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:20}}>
              {/* Description */}
              <div>
                <FieldLabel>Descrição</FieldLabel>
                {editing
                  ? <textarea className="input" value={form.description} onChange={fe("description")} rows={5} style={{resize:"vertical",lineHeight:1.6}}/>
                  : <p style={{fontSize:14,lineHeight:1.7,color:"var(--t2)"}}>{demand.description}</p>
                }
              </div>

              {/* Edit fields */}
              {editing && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div>
                    <FieldLabel>Time</FieldLabel>
                    <input className="input" value={form.team} onChange={fe("team")} placeholder="Ex.: Operações"/>
                  </div>
                  <div>
                    <FieldLabel>Prioridade</FieldLabel>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {Object.entries(PRIO_LABEL).map(([k,v])=>(
                        <button key={k} onClick={()=>setForm(p=>({...p,priority:k}))} className="btn"
                          style={{padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:700,border:`1px solid ${form.priority===k?PRIO_COLOR[k]:"var(--border)"}`,background:form.priority===k?`${PRIO_COLOR[k]}15`:"var(--s1)",color:form.priority===k?PRIO_COLOR[k]:"var(--t3)"}}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <FieldLabel>Tipo</FieldLabel>
                    <div style={{display:"flex",gap:8}}>
                      {Object.entries(TAG_LABEL).map(([k,v])=>(
                        <button key={k} onClick={()=>setForm(p=>({...p,tag:k}))} className="btn"
                          style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,border:`1px solid ${form.tag===k?TAG_COLOR[k]:"var(--border)"}`,background:form.tag===k?`${TAG_COLOR[k]}15`:"var(--s1)",color:form.tag===k?TAG_COLOR[k]:"var(--t3)"}}>
                          {TAG_ICON[k]} {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin note */}
              {demand.admin_note && (
                <div style={{padding:14,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10}}>
                  <FieldLabel>📝 Nota do Gestor</FieldLabel>
                  <p style={{fontSize:13,color:"#c7d2fe",lineHeight:1.6}}>{demand.admin_note}</p>
                </div>
              )}

              {/* Files */}
              {demand.files?.length > 0 && (
                <div>
                  <FieldLabel>Anexos ({demand.files.length})</FieldLabel>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {demand.files.map((f,i)=>(
                      <div key={i} style={{padding:"6px 12px",background:"var(--s1)",border:"1px solid var(--border)",borderRadius:8,fontSize:12,color:"var(--t2)"}}>📄 {f.name}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: meta + timeline */}
            <div style={{padding:"20px 20px",display:"flex",flexDirection:"column",gap:16,background:"var(--s1)"}}>
              {/* Meta */}
              <div>
                <FieldLabel>Detalhes</FieldLabel>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    ["👤","Solicitante",demand.user_name],
                    ["🏷️","Time",demand.team||"—"],
                    [`${SQUAD_ICON[demand.squad]}`,"Squad",SQUAD_LABEL[demand.squad]],
                    ["🕐","Criado em",fmt(demand.created_at||demand.createdAt)],
                    demand.approved_at&&["✅","Aprovado em",fmt(demand.approved_at)],
                    demand.concluded_at&&["🏁","Concluído em",fmt(demand.concluded_at)],
                  ].filter(Boolean).map(([ic,lb,val])=>(
                    <div key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"var(--s2)",borderRadius:8}}>
                      <span style={{fontSize:12,color:"var(--t3)"}}>{ic} {lb}</span>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--t2)",textAlign:"right",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div style={{flex:1}}>
                <FieldLabel>Histórico</FieldLabel>
                {timeline.length===0
                  ? <div style={{fontSize:12,color:"var(--t3)",padding:"12px 0"}}>Sem atualizações ainda.</div>
                  : <div style={{display:"flex",flexDirection:"column",gap:0,position:"relative"}}>
                      <div style={{position:"absolute",left:13,top:14,bottom:14,width:2,background:"var(--border)"}}/>
                      {timeline.map((t,i)=>{
                        const s = STATUS[t.status]||{icon:"📌",dot:"var(--t3)",label:t.status||"Atualização"};
                        return(
                          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",position:"relative",zIndex:1}}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:`${s.dot}18`,border:`2px solid ${s.dot}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{s.icon}</div>
                            <div style={{flex:1,paddingTop:4}}>
                              <div style={{fontSize:12,fontWeight:700,color:s.dot}}>{s.label||t.status}</div>
                              {t.note&&t.note!==s.label&&<div style={{fontSize:11,color:"var(--t3)",marginTop:2,lineHeight:1.4}}>{t.note}</div>}
                              <div style={{fontSize:10,color:"var(--t3)",marginTop:3,fontFamily:"var(--mono)"}}>{fmt(t.at)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>

              {/* ID */}
              <div style={{padding:"6px 10px",background:"var(--s2)",borderRadius:8,fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",textAlign:"center"}}>ID: {demand.id}</div>
            </div>
          </div>
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

  return(
    <div onClick={onClick} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all .2s",animation:`fadeUp .3s ease ${index*.05}s both`,position:"relative"}}
      onMouseOver={e=>{e.currentTarget.style.borderColor=sq.h+"66";e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 28px rgba(0,0,0,.4)`;}}
      onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>

      {/* Squad accent bar */}
      <div style={{height:3,background:`linear-gradient(90deg,${sq.h},transparent)`}}/>

      <div style={{padding:"16px 18px"}}>
        {/* Top row */}
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:`rgba(${sq.rgb},.12)`,border:`1px solid rgba(${sq.rgb},.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
            {SQUAD_ICON[demand.squad]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:14,lineHeight:1.3,marginBottom:4,color:"var(--t1)"}}>{demand.title}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"var(--t3)"}}>👤 {demand.user_name}</span>
              {demand.team&&<span style={{fontSize:11,color:"var(--t3)"}}>· 🏷️ {demand.team}</span>}
              {demand.sprint&&<span style={{fontSize:10,color:"#38bdf8",fontFamily:"var(--mono)"}}>Sprint {demand.sprint}</span>}
            </div>
          </div>
          {/* Status dot */}
          <div style={{width:10,height:10,borderRadius:"50%",background:sm.dot,boxShadow:`0 0 8px ${sm.dot}`,flexShrink:0,marginTop:4,animation:demand.status==="em_andamento"?"pulse 2s infinite":"none"}}/>
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
                      {done?"✓":active?s2.icon:""}
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
    ? [{id:"admin",label:"Admin",icon:"🛡️"},{id:"queue",label:"Filas",icon:"📋"},{id:"analytics",label:"Visão Geral",icon:"📊"}]
    : isMod
    ? [{id:"admin",label:"Painel",icon:"⚖️"},{id:"queue",label:"Filas",icon:"📋"}]
    : [{id:"queue",label:"Filas",icon:"📋"},{id:"new",label:"Nova Task",icon:"✚"},{id:"my",label:"Minhas Tasks",icon:"📂"}];

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
        />
      )}

      {/* NAVBAR */}
      <nav style={{height:62,display:"flex",alignItems:"center",padding:"0 28px",gap:16,background:"rgba(6,9,18,.92)",borderBottom:"1px solid var(--border)",backdropFilter:"blur(16px)",position:"sticky",top:0,zIndex:200,flexShrink:0}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#3b82f6,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 0 16px rgba(99,102,241,.3)"}}>⚡</div>
          <div>
            <div style={{fontWeight:900,fontSize:15,letterSpacing:"-1px",lineHeight:1}}>TaskHUB</div>
            <div style={{fontSize:9,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px"}}>{ROLES[user?.role]?.label||"Plataforma"}</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:2,background:"var(--s1)",borderRadius:10,padding:3,border:"1px solid var(--border)"}}>
          {navItems.map(v=>{
            const active=view===v.id;
            return(
              <button key={v.id} onClick={()=>setView(v.id)} className="nav-link"
                style={{background:active?"var(--s2)":"transparent",color:active?"var(--t1)":"var(--t3)",fontWeight:active?700:400,boxShadow:active?"0 2px 8px rgba(0,0,0,.3)":"none",borderRadius:8,fontSize:13}}>
                <span>{v.icon}</span>{v.label}
                {v.id==="admin"&&pendingCount>0&&<span style={{minWidth:18,height:18,borderRadius:999,background:"#ef4444",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{pendingCount}</span>}
              </button>
            );
          })}
        </div>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {/* Bell */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotif(p=>!p)} style={{width:36,height:36,borderRadius:9,border:`1px solid ${showNotif?"rgba(59,130,246,.4)":"var(--border)"}`,background:showNotif?"rgba(59,130,246,.1)":"var(--s1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",transition:"all .15s",position:"relative"}}>
              🔔
              {unread>0&&<span style={{position:"absolute",top:-5,right:-5,minWidth:18,height:18,borderRadius:999,background:"#ef4444",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid var(--bg)",padding:"0 4px"}}>{unread}</span>}
            </button>
            {showNotif&&<NotifDropdown notifs={notifs} onMarkRead={async()=>{await dbMarkRead(user?.id||user?.email);setNotifs(p=>p.map(n=>({...n,read:true})));}} onClose={()=>setShowNotif(false)} onOpen={d=>{setTaskModal(demands.find(x=>x.id===d.demand_id)||null);setShowNotif(false);}}/>}
          </div>

          {/* User */}
          <button onClick={()=>setView("profile")} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px 6px 6px",border:`1px solid ${view==="profile"?"rgba(59,130,246,.4)":"var(--border)"}`,borderRadius:10,background:view==="profile"?"rgba(59,130,246,.08)":"var(--s1)",cursor:"pointer",transition:"all .15s"}}>
            <Avatar name={user?.name} url={user?.avatar_url} size={28} radius={7}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",lineHeight:1}}>{user?.name?.split(" ")[0]}</div>
              <div style={{fontSize:10,color:"var(--t3)",lineHeight:1,marginTop:2}}>{ROLES[user?.role]?.icon} {ROLES[user?.role]?.label}</div>
            </div>
          </button>

          <button onClick={handleLogout} title="Sair" style={{width:36,height:36,borderRadius:9,border:"1px solid var(--border)",background:"var(--s1)",color:"var(--t3)",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s"}}
            onMouseOver={e=>{e.currentTarget.style.background="rgba(239,68,68,.1)";e.currentTarget.style.color="#f87171";e.currentTarget.style.borderColor="rgba(239,68,68,.3)"}}
            onMouseOut={e=>{e.currentTarget.style.background="var(--s1)";e.currentTarget.style.color="var(--t3)";e.currentTarget.style.borderColor="var(--border)"}}>
            ↩
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{flex:1,display:"flex",maxWidth:1400,width:"100%",margin:"0 auto",padding:"0 24px"}}>
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
        <div style={{fontWeight:700,fontSize:14}}>🔔 Notificações {unread>0&&<span style={{marginLeft:6,padding:"2px 8px",borderRadius:999,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",fontSize:11,color:"#f87171"}}>{unread}</span>}</div>
        {unread>0&&<button onClick={onMarkRead} style={{background:"none",border:"none",color:"var(--blue)",fontSize:11,cursor:"pointer",fontWeight:600}}>Marcar como lidas</button>}
      </div>
      <div style={{maxHeight:380,overflowY:"auto"}}>
        {notifs.length===0
          ?<div style={{padding:"32px 18px",textAlign:"center",color:"var(--t3)",fontSize:13}}>🔕 Nenhuma notificação</div>
          :notifs.map(n=>{
            const sm=STATUS[n.type]||{icon:"📌",dot:"var(--t3)",label:n.type};
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

  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease"}}>
      {/* Page header */}
      <div style={{marginBottom:24,display:"flex",alignItems:"flex-end",gap:16}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Filas por Sprint</h1>
          <p style={{fontSize:13,color:"var(--t3)"}}>Sprint atual: <strong style={{color:SQUAD_COLOR[squad].h}}>Sprint {cur}</strong> · {sprintRange(cur,overrides)}</p>
        </div>
        {["admin","moderador"].includes(undefined)&&null}
      </div>

      {/* Squad selector */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
        {SQUADS.map(s=>{
          const sq2=SQUAD_COLOR[s]; const active=s===squad;
          const total=demands.filter(d=>d.squad===s).length;
          const pend=demands.filter(d=>d.squad===s&&d.status==="pendente").length;
          const conc=demands.filter(d=>d.squad===s&&d.status==="concluida").length;
          return(
            <button key={s} onClick={()=>setSquad(s)} style={{padding:"18px 20px",border:`1.5px solid ${active?sq2.h+"55":"var(--border)"}`,borderRadius:16,background:active?`rgba(${sq2.rgb},.06)`:"var(--s2)",cursor:"pointer",transition:"all .2s",textAlign:"left",boxShadow:active?`0 4px 20px rgba(${sq2.rgb},.15)`:""}}
              onMouseOver={e=>!active&&(e.currentTarget.style.borderColor=sq2.h+"33")} onMouseOut={e=>!active&&(e.currentTarget.style.borderColor="var(--border)")}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:38,height:38,borderRadius:11,background:`rgba(${sq2.rgb},.15)`,border:`1px solid rgba(${sq2.rgb},.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{SQUAD_ICON[s]}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,color:active?sq2.h:"var(--t1)"}}>{SQUAD_LABEL[s]}</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>{total} demanda(s)</div>
                </div>
                {active&&<div style={{width:8,height:8,borderRadius:"50%",background:sq2.h,boxShadow:`0 0 10px ${sq2.h}`,animation:"pulse 2s infinite"}}/>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:"rgba(148,163,184,.1)",color:"var(--t3)"}}>⏳ {pend}</span>
                <span style={{fontSize:11,padding:"3px 9px",borderRadius:999,background:"rgba(139,92,246,.1)",color:"#a78bfa"}}>🏁 {conc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sprints */}
      {demands.length===0
        ?<EmptySlate icon="📭" title="Nenhuma demanda ainda" sub="Aguarde solicitações dos usuários"/>
        :<div style={{display:"flex",flexDirection:"column",gap:28}}>
          {sprints.map(sp=>{
            const spDemands=inSprint.filter(d=>d.sprint===sp).sort((a,b)=>PRIO_ORDER[a.priority]-PRIO_ORDER[b.priority]);
            const isCur=sp===cur; const isPast=sp<cur;
            const {start,end}=sprintDates(sp,overrides);
            const elapsed=Math.min(100,Math.max(0,Math.round(((new Date()-start)/((end.getTime()+86400000)-start.getTime()))*100)));
            return(
              <div key={sp}>
                {/* Sprint header */}
                <div style={{padding:"14px 18px",background:"var(--s2)",borderRadius:14,border:`1px solid ${isCur?SQUAD_COLOR[squad].h+"40":"var(--border)"}`,marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:isCur?`rgba(${SQUAD_COLOR[squad].rgb},.15)`:"var(--s1)",border:`2px solid ${isCur?SQUAD_COLOR[squad].h:"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:14,fontWeight:900,color:isCur?SQUAD_COLOR[squad].h:"var(--t3)",flexShrink:0}}>{sp}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontWeight:800,fontSize:15}}>Sprint {sp}</span>
                      <span style={{padding:"2px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:isCur?"rgba(34,197,94,.12)":isPast?"rgba(148,163,184,.08)":"rgba(59,130,246,.1)",color:isCur?"#4ade80":isPast?"var(--t3)":"#60a5fa"}}>
                        {isCur?"🟢 Em andamento":isPast?"✓ Concluída":"🔵 Futura"}
                      </span>
                      {overrides[sp]&&<span style={{fontSize:10,color:"#fbbf24"}}>📌</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--t3)",fontFamily:"var(--mono)"}}>{sprintRange(sp,overrides)} · {spDemands.length} task(s)</div>
                    {(isCur||isPast)&&<div style={{marginTop:8,height:3,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:`linear-gradient(90deg,${SQUAD_COLOR[squad].h},${SQUAD_COLOR[squad].h}88)`,width:`${isCur?elapsed:100}%`,transition:"width .5s",borderRadius:3}}/></div>}
                  </div>
                  <div style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:800,color:"var(--t3)"}}>{spDemands.length}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14,paddingLeft:8,borderLeft:`2px solid ${SQUAD_COLOR[squad].h}22`}}>
                  {spDemands.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
                </div>
              </div>
            );
          })}

          {/* Pending */}
          {pending.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(148,163,184,.3),transparent)"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"var(--t3)",padding:"4px 14px",borderRadius:999,border:"1px solid var(--border)"}}>⏳ Aguardando Aprovação ({pending.length})</span>
                <div style={{height:1,width:40,background:"rgba(148,163,184,.1)"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
                {pending.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{height:1,flex:1,background:"linear-gradient(90deg,rgba(248,113,113,.2),transparent)"}}/>
                <span style={{fontSize:12,fontWeight:700,color:"#f87171",padding:"4px 14px",borderRadius:999,border:"1px solid rgba(239,68,68,.2)"}}>❌ Rejeitadas ({rejected.length})</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
                {rejected.map((d,i)=><TaskCard key={d.id} demand={d} index={i} overrides={overrides} onClick={()=>onOpen(d)}/>)}
              </div>
            </div>
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
  const stats = Object.fromEntries(Object.keys(STATUS).map(k=>[k,demands.filter(d=>d.status===k).length]));
  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease"}}>
      <div style={{marginBottom:24}}><h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Minhas Tasks</h1><p style={{fontSize:13,color:"var(--t3)"}}>{sorted.length} solicitação(ões)</p></div>
      {/* Stats row */}
      <div style={{display:"flex",gap:10,marginBottom:28,overflowX:"auto",paddingBottom:4}}>
        {Object.entries(STATUS).map(([k,v])=>(
          <div key={k} style={{padding:"14px 18px",background:"var(--s2)",border:`1px solid ${v.color}30`,borderRadius:12,flexShrink:0,minWidth:110,textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:4}}>{v.icon}</div>
            <div style={{fontSize:24,fontWeight:900,color:v.dot}}>{stats[k]||0}</div>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{v.label}</div>
          </div>
        ))}
      </div>
      {sorted.length===0
        ?<EmptySlate icon="📂" title="Nenhuma task enviada" sub="Clique em 'Nova Task' para começar"/>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:14}}>
          {sorted.map((d,i)=><TaskCard key={d.id} demand={d} index={i} onClick={()=>onOpen(d)}/>)}
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
function AdminView({demands,config,backlog,isAdmin,overrides,onApprove,onDelete,onUpdateStatus,onMoveSprint,onSaveConfig,onBacklog,onOpen}) {
  const [tab,setTab]           = useState("pending");
  const [users,setUsers]       = useState([]);
  const [confirmDel,setConfirm] = useState(null);

  const pending      = demands.filter(d=>d.status==="pendente");
  const approved     = demands.filter(d=>d.status==="aprovada");
  const inProgress   = demands.filter(d=>d.status==="em_andamento");
  const inReview     = demands.filter(d=>d.status==="em_aprovacao");
  const concluded    = demands.filter(d=>d.status==="concluida");
  const rejected     = demands.filter(d=>d.status==="rejeitada");

  useEffect(()=>{ if(isAdmin) dbProfiles().then(setUsers); },[isAdmin]);

  async function updateRole(userId,roles) {
    const profile = users.find(u=>u.id===userId)||{};
    const updated = {...profile,id:userId,roles,role:roles[0]||"user",updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated);
    setUsers(p=>p.map(u=>u.id===userId?updated:u));
  }

  const tabs = [
    {id:"pending",      label:"Pendentes",      count:pending.length,   color:"#94a3b8"},
    {id:"approved",     label:"Aprovadas",       count:approved.length,  color:"#22c55e"},
    {id:"em_andamento", label:"Em Andamento",    count:inProgress.length,color:"#3b82f6"},
    {id:"em_aprovacao", label:"Em Aprovação",    count:inReview.length,  color:"#f59e0b"},
    {id:"concluded",    label:"Concluídas",      count:concluded.length, color:"#8b5cf6"},
    {id:"rejected",     label:"Rejeitadas",      count:rejected.length,  color:"#ef4444"},
    ...(isAdmin?[
      {id:"users",    label:"Usuários",    count:null, color:"#a78bfa"},
      {id:"backlog",  label:"Backlog",     count:null, color:"#34d399"},
      {id:"sprints",  label:"Sprints",     count:null, color:"#fbbf24"},
      {id:"email",    label:"E-mail",      count:null, color:"#818cf8"},
    ]:[]),
  ];

  const listMap = {pending,approved,em_andamento:inProgress,em_aprovacao:inReview,concluded,rejected};
  const list = listMap[tab]||[];
  const isDemandTab = Object.keys(listMap).includes(tab);

  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease",display:"flex",flexDirection:"column",gap:0}}>
      {/* Confirm delete modal */}
      {confirmDel&&(
        <div className="modal-bg" onClick={()=>setConfirm(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"var(--s2)",border:"1px solid rgba(239,68,68,.4)",borderRadius:20,padding:32,width:380,textAlign:"center",animation:"scaleIn .2s ease"}}>
            <div style={{fontSize:36,marginBottom:12}}>🗑️</div>
            <h3 style={{fontWeight:800,marginBottom:8}}>Excluir task?</h3>
            <p style={{fontSize:13,color:"var(--t3)",marginBottom:24,lineHeight:1.6}}>"{confirmDel.title}" será excluída permanentemente.</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-danger" onClick={()=>{onDelete(confirmDel.id);setConfirm(null);}} style={{flex:1,justifyContent:"center",padding:"11px"}}>Excluir</button>
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)} style={{flex:1,justifyContent:"center",padding:"11px"}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{marginBottom:20}}><h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Painel Admin</h1><p style={{fontSize:13,color:"var(--t3)"}}>Gerencie tasks, usuários e configurações</p></div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:24,overflowX:"auto",paddingBottom:4,flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:10,border:`1px solid ${tab===t.id?t.color+"55":"var(--border)"}`,background:tab===t.id?`${t.color}10`:"var(--s1)",color:tab===t.id?t.color:"var(--t3)",fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {t.label}
            {t.count!==null&&<span style={{padding:"1px 7px",borderRadius:999,background:tab===t.id?`${t.color}22`:"rgba(255,255,255,.05)",fontSize:10,fontFamily:"var(--mono)"}}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab==="email"   && <EmailCfgPanel config={config.emailConfig||{}} onSave={c=>onSaveConfig({emailConfig:c})}/>}
      {tab==="sprints" && <SprintMgrPanel overrides={overrides} onSave={o=>onSaveConfig({sprintOverrides:o})}/>}
      {tab==="backlog" && <BacklogPanel items={backlog} onSave={onBacklog}/>}
      {tab==="users"   && <UserMgrPanel users={users} onUpdateRole={updateRole}/>}

      {isDemandTab&&(
        list.length===0
          ?<EmptySlate icon={STATUS[tab]?.icon||"📋"} title={`Nenhuma demanda ${tabs.find(t=>t.id===tab)?.label.toLowerCase()}`} sub=""/>
          :<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[...list].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map(d=>(
              <AdminTaskRow key={d.id} demand={d} overrides={overrides} canAct={tab==="pending"}
                canStatus={["approved","em_andamento","em_aprovacao"].includes(tab)}
                onApprove={onApprove} onDelete={()=>setConfirm(d)}
                onUpdateStatus={onUpdateStatus} onMoveSprint={onMoveSprint}
                onOpen={()=>onOpen(d)}/>
            ))}
          </div>
      )}
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
            <span>👤 {demand.user_name}</span>
            {demand.team&&<span>🏷️ {demand.team}</span>}
            <span style={{color:sq.h}}>● {SQUAD_LABEL[demand.squad]}</span>
            {demand.sprint&&<span style={{color:"#38bdf8",fontFamily:"var(--mono)"}}>Sprint {demand.sprint}</span>}
          </div>
        </div>
        <PrioBadge priority={demand.priority}/>
        <StatusBadge status={demand.status}/>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {canAct&&<button className="btn btn-ghost" onClick={()=>{setActOpen(p=>!p);setStatOpen(false);setSpOpen(false);}} style={{fontSize:11,padding:"5px 10px",background:actOpen?"rgba(99,102,241,.15)":"",borderColor:actOpen?"rgba(99,102,241,.4)":"",color:actOpen?"#818cf8":""}}>{actOpen?"✕":"Avaliar →"}</button>}
          {canStatus&&<button className="btn btn-ghost" onClick={()=>{setStatOpen(p=>!p);setActOpen(false);setSpOpen(false);}} style={{fontSize:11,padding:"5px 10px",background:statOpen?"rgba(56,189,248,.1)":"",borderColor:statOpen?"rgba(56,189,248,.3)":"",color:statOpen?"#38bdf8":""}}>🔄 Status</button>}
          {demand.sprint&&demand.status!=="concluida"&&<button className="btn btn-ghost" onClick={()=>{setSpOpen(p=>!p);setActOpen(false);setStatOpen(false);}} style={{fontSize:11,padding:"5px 10px",background:spOpen?"rgba(251,191,36,.1)":"",borderColor:spOpen?"rgba(251,191,36,.3)":"",color:spOpen?"#fbbf24":""}}>📅 Sprint</button>}
          <button className="btn btn-danger" onClick={onDelete} style={{padding:"5px 8px",fontSize:13}}>🗑️</button>
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

      {filtered.length===0?<EmptySlate icon="👥" title="Nenhum usuário" sub=""/>
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
                    {isProtected&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:999,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8"}}>🔒 protegido</span>}
                  </div>
                  <div style={{fontSize:12,color:"var(--t3)"}}>{u.email}</div>
                  {u.job_title&&<div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{u.job_title}</div>}
                </div>

                {/* Current roles */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",maxWidth:280}}>
                  {isProtected
                    ? <div style={{padding:"5px 12px",borderRadius:999,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#818cf8",fontSize:12,fontWeight:700}}>🛡️ Admin</div>
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
  const [form,setForm] = useState({resendKey:config.resendKey||"",fromEmail:config.fromEmail||""});
  const [testing,setTesting]  = useState(false);
  const [testResult,setTestResult] = useState(null);
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));

  async function testEmail() {
    setTesting(true); setTestResult(null);
    const r = await sendResend({apiKey:form.resendKey,from:form.fromEmail,to:form.fromEmail,subject:"[TaskHUB] Teste de e-mail",html:"<p>✅ E-mail de teste enviado com sucesso pelo TaskHUB!</p>"});
    setTestResult(r); setTesting(false);
  }

  return(
    <div style={{maxWidth:600}}>
      <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:17,fontWeight:800,marginBottom:6}}>📧 Configuração de E-mail</div>
        <p style={{fontSize:13,color:"var(--t3)",marginBottom:24,lineHeight:1.7}}>
          O TaskHUB usa <a href="https://resend.com" target="_blank" rel="noreferrer" style={{color:"var(--blue)"}}>Resend</a> para envio de e-mails. Crie uma conta gratuita (100 e-mails/dia), verifique seu domínio e cole as credenciais abaixo.
        </p>

        <div style={{padding:16,background:"rgba(59,130,246,.07)",border:"1px solid rgba(59,130,246,.2)",borderRadius:10,marginBottom:24,fontSize:12,color:"#93c5fd",lineHeight:1.7}}>
          <strong style={{color:"#60a5fa"}}>Passo a passo:</strong><br/>
          1. Acesse <a href="https://resend.com" target="_blank" rel="noreferrer">resend.com</a> → criar conta grátis<br/>
          2. Vá em <strong>API Keys</strong> → criar nova chave → copie<br/>
          3. Vá em <strong>Domains</strong> → adicione e verifique seu domínio (ou use <code>onboarding@resend.dev</code> para testes)<br/>
          4. Cole abaixo e clique em "Testar"
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:20}}>
          <div>
            <FieldLabel>Resend API Key</FieldLabel>
            <input className="input" value={form.resendKey} onChange={f("resendKey")} placeholder="re_xxxxxxxxxxxxxxxxxxxx" type="password"/>
          </div>
          <div>
            <FieldLabel>E-mail remetente (From)</FieldLabel>
            <input className="input" value={form.fromEmail} onChange={f("fromEmail")} placeholder="noreply@seudominio.com"/>
            <div style={{fontSize:11,color:"var(--t3)",marginTop:5}}>Para testes sem domínio verificado use: <code style={{color:"#60a5fa"}}>onboarding@resend.dev</code></div>
          </div>
        </div>

        {testResult&&(
          <div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,fontSize:12,background:testResult.ok?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${testResult.ok?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,color:testResult.ok?"#4ade80":"#f87171"}}>
            {testResult.ok?`✓ E-mail enviado com sucesso! ID: ${testResult.id}`:`✕ Erro: ${testResult.reason}`}
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-primary" onClick={()=>onSave(form)} style={{flex:1,justifyContent:"center",padding:"11px"}}>Salvar configurações</button>
          <button className="btn btn-ghost" onClick={testEmail} disabled={!form.resendKey||!form.fromEmail||testing} style={{padding:"11px 20px",opacity:!form.resendKey||!form.fromEmail||testing?.6:1}}>
            {testing?<><Spin/>Testando...</>:"Testar envio"}
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
  const nums = Array.from({length:10},(_,i)=>cur+i);
  function def(n) { const d=sprintDates(n,{}); return {start:toISO(d.start),end:toISO(d.end)}; }
  const [local,setLocal] = useState(()=>{ const o={}; nums.forEach(n=>{o[n]=overrides[n]?{start:overrides[n].start,end:overrides[n].end}:def(n);}); return o; });

  function save() {
    const r={}; nums.forEach(n=>{ const d=def(n); if(local[n].start!==d.start||local[n].end!==d.end) r[n]={start:local[n].start,end:local[n].end}; });
    onSave(r);
  }
  const hasChanges = nums.some(n=>{ const d=def(n); return local[n]?.start!==d.start||local[n]?.end!==d.end; });

  return(
    <div style={{maxWidth:720}}>
      <div style={{padding:28,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:17,fontWeight:800,marginBottom:6}}>📅 Gerenciar Sprints</div>
        <p style={{fontSize:13,color:"var(--t3)",marginBottom:6}}>Edite as datas para feriados e exceções. Sprints editadas aparecem com 📌.</p>
        <div style={{padding:"8px 12px",background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.2)",borderRadius:8,fontSize:11,color:"#fde68a",marginBottom:20}}>⚠ Alterar datas não move demandas já aprovadas.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr 80px 40px",gap:10,padding:"6px 10px",fontSize:10,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".5px"}}>
            <span>Sprint</span><span>Início</span><span>Fim</span><span>Status</span><span></span>
          </div>
          {nums.map(n=>{ const d=def(n); const edited=local[n]?.start!==d.start||local[n]?.end!==d.end; const isCur=n===cur; return(
            <div key={n} style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr 80px 40px",gap:10,padding:"12px 10px",background:isCur?"rgba(59,130,246,.04)":"var(--s1)",border:`1px solid ${edited?"rgba(251,191,36,.3)":isCur?"rgba(59,130,246,.2)":"var(--border)"}`,borderRadius:10,alignItems:"center"}}>
              <div style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:12,color:isCur?"#60a5fa":"var(--t2)"}}>#{n}{isCur&&<div style={{fontSize:8,color:"#4ade80"}}>atual</div>}</div>
              <input type="date" value={local[n]?.start||""} onChange={e=>setLocal(p=>({...p,[n]:{...p[n],start:e.target.value}}))} style={{padding:"7px 10px",background:"var(--s2)",border:`1px solid ${edited?"rgba(251,191,36,.4)":"var(--border)"}`,borderRadius:7,color:"var(--t1)",fontSize:12,outline:"none",width:"100%"}}/>
              <input type="date" value={local[n]?.end||""} onChange={e=>setLocal(p=>({...p,[n]:{...p[n],end:e.target.value}}))} style={{padding:"7px 10px",background:"var(--s2)",border:`1px solid ${edited?"rgba(251,191,36,.4)":"var(--border)"}`,borderRadius:7,color:"var(--t1)",fontSize:12,outline:"none",width:"100%"}}/>
              <div style={{fontSize:11,fontWeight:600,color:edited?"#fbbf24":"var(--t3)"}}>{edited?"📌 editada":"padrão"}</div>
              <button onClick={()=>setLocal(p=>({...p,[n]:def(n)}))} title="Resetar" style={{width:32,height:32,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}
                onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>↺</button>
            </div>
          );})}
        </div>
        <button className="btn btn-primary" onClick={save} disabled={!hasChanges} style={{marginTop:20,padding:"11px 24px",opacity:hasChanges?1:.5,justifyContent:"center"}}>
          {hasChanges?"💾 Salvar alterações":"Sem alterações"}
        </button>
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
          {[["all","Todos",list.length],["account","🔑 Contas",list.filter(i=>i.type==="account").length],["request","📋 Solicitações",list.filter(i=>i.type==="request").length]].map(([v,l,c])=>(
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
          <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:adding==="account"?"#34d399":"#38bdf8"}}>{editId?"✏️ Editar":"+"} {adding==="account"?"Conta / Senha":"Solicitação"}</div>
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

      {displayed.length===0?<EmptySlate icon="📦" title="Backlog vazio" sub='Clique em "+ Conta" ou "+ Solicitação"'/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {displayed.map((item,i)=>{
            const isAcc=item.type==="account"; const ac=isAcc?"#34d399":"#38bdf8"; const sc=REQ_STATUS_COLORS[item.status]||"#94a3b8";
            return(
              <div key={item.id} style={{padding:"14px 18px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,animation:`fadeUp .2s ease ${i*.03}s both`}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:34,height:34,borderRadius:9,background:`${ac}12`,border:`1px solid ${ac}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{isAcc?"🔑":"📋"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{item.title}</div>
                    <div style={{fontSize:11,color:"var(--t3)"}}>{isAcc&&item.login?`👤 ${item.login}`:!isAcc?<span style={{color:sc}}>● {item.status}</span>:""}</div>
                  </div>
                  {!isAcc&&<select value={item.status} onChange={e=>updStatus(item.id,e.target.value)} onClick={e=>e.stopPropagation()} style={{padding:"4px 8px",border:`1px solid ${sc}44`,borderRadius:7,background:`${sc}10`,color:sc,fontSize:11,fontWeight:700,outline:"none",cursor:"pointer"}}>
                    {["pendente","em andamento","concluído","cancelado"].map(s=><option key={s} value={s} style={{background:"var(--bg)",color:"var(--t1)"}}>{s}</option>)}
                  </select>}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>startEdit(item)} style={{width:30,height:30,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",fontSize:13}} onMouseOver={e=>e.currentTarget.style.color="#38bdf8"} onMouseOut={e=>e.currentTarget.style.color="var(--t3)"}>✏️</button>
                    {isAcc&&<button onClick={()=>setReveal(p=>({...p,[item.id]:!p[item.id]}))} style={{width:30,height:30,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--t3)",cursor:"pointer",fontSize:13}}>{reveal[item.id]?"🙈":"👁"}</button>}
                    <button onClick={()=>remove(item.id)} className="btn btn-danger" style={{width:30,height:30,padding:0,justifyContent:"center",fontSize:13}}>🗑</button>
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
  const fileRef = useRef();
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const sq = SQUAD_COLOR[form.squad]||{h:"#64748b"};

  async function submit() {
    const e={}; if(!form.title.trim()) e.title="Obrigatório"; if(!form.description.trim()) e.description="Obrigatório";
    setErrors(e); if(Object.keys(e).length) return;
    setLoading(true);
    await onSubmit({id:uid(),user_id:user.id||user.email,user_email:user.email,user_name:user.name,...form,files,created_at:new Date().toISOString(),status:"pendente",sprint:null});
    setLoading(false);
  }

  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease",maxWidth:900,width:"100%",margin:"0 auto"}}>
      <div style={{marginBottom:28}}><h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px",marginBottom:4}}>Nova Task</h1><p style={{fontSize:13,color:"var(--t3)"}}>Preencha as informações da sua solicitação</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:24}}>
        {/* Left */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:18}}>Informações da Task</div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <FieldLabel>Título *</FieldLabel>
                <input className="input" value={form.title} onChange={f("title")} placeholder="Ex.: Ajuste no processo de triagem" style={{borderColor:errors.title?"#ef4444":""}}/>
                {errors.title&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ {errors.title}</div>}
              </div>
              <div>
                <FieldLabel>Time solicitante</FieldLabel>
                <input className="input" value={form.team} onChange={f("team")} placeholder="Ex.: Operações, TI, Comercial..."/>
              </div>
              <div>
                <FieldLabel>Descrição *</FieldLabel>
                <textarea className="input" value={form.description} onChange={f("description")} rows={6} placeholder="Descreva detalhadamente o que precisa ser feito..." style={{resize:"vertical",lineHeight:1.7,borderColor:errors.description?"#ef4444":""}}/>
                {errors.description&&<div style={{fontSize:11,color:"#f87171",marginTop:4}}>⚠ {errors.description}</div>}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Anexos</div>
            <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed var(--border)",borderRadius:12,padding:24,textAlign:"center",cursor:"pointer",transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=sq.h;e.currentTarget.style.background=`rgba(${SQUAD_COLOR[form.squad]?.rgb||"100,116,139"},.05)`;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="transparent";}}>
              <div style={{fontSize:28,marginBottom:8}}>📎</div>
              <div style={{fontSize:13,color:"var(--t3)"}}>Clique para selecionar arquivos</div>
              <input ref={fileRef} type="file" multiple onChange={e=>setFiles(p=>[...p,...Array.from(e.target.files).map(x=>({name:x.name,size:x.size}))])} style={{display:"none"}}/>
            </div>
            {files.length>0&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>{files.map((fl,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--s1)",borderRadius:8,fontSize:12}}>
                <span>📄 {fl.name}</span><span style={{color:"var(--t3)",marginLeft:"auto"}}>{(fl.size/1024).toFixed(0)}KB</span>
                <button onClick={()=>setFiles(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}</div>}
          </div>
        </div>

        {/* Right */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Squad */}
          <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Squad *</FieldLabel>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {SQUADS.map(s=>{ const c=SQUAD_COLOR[s]; const sel=form.squad===s; return(
                <button key={s} onClick={()=>setForm(p=>({...p,squad:s}))} style={{padding:"12px 14px",border:`1.5px solid ${sel?c.h+"55":"var(--border)"}`,borderRadius:10,background:sel?`rgba(${c.rgb},.08)`:"var(--s1)",color:sel?c.h:"var(--t2)",fontSize:13,fontWeight:sel?700:400,textAlign:"left",cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>{SQUAD_ICON[s]}</span>{SQUAD_LABEL[s]}
                  {sel&&<span style={{marginLeft:"auto",fontSize:10,fontFamily:"var(--mono)",opacity:.7}}>✓</span>}
                </button>
              );})}
            </div>
          </div>

          {/* Priority */}
          <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Prioridade</FieldLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.entries(PRIO_LABEL).map(([k,v])=>{ const sel=form.priority===k; const c=PRIO_COLOR[k]; return(
                <button key={k} onClick={()=>setForm(p=>({...p,priority:k}))} style={{padding:"9px 8px",border:`1px solid ${sel?c:"var(--border)"}`,borderRadius:9,background:sel?`${c}12`:"var(--s1)",color:sel?c:"var(--t3)",fontSize:12,fontWeight:sel?700:400,cursor:"pointer",transition:"all .15s"}}>
                  {k==="critica"?"🔴":k==="alta"?"🟠":k==="media"?"🟡":"🟢"} {v}
                </button>
              );})}
            </div>
          </div>

          {/* Type */}
          <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Tipo</FieldLabel>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(TAG_LABEL).map(([k,v])=>{ const sel=form.tag===k; const c=TAG_COLOR[k]; return(
                <button key={k} onClick={()=>setForm(p=>({...p,tag:k}))} style={{padding:"11px 14px",border:`1px solid ${sel?c+"55":"var(--border)"}`,borderRadius:10,background:sel?`${c}10`:"var(--s1)",color:sel?c:"var(--t2)",fontSize:13,fontWeight:sel?700:400,textAlign:"left",cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:8}}>
                  <span>{TAG_ICON[k]}</span>{v}
                  {sel&&<span style={{marginLeft:"auto",fontSize:10}}>✓</span>}
                </button>
              );})}
            </div>
          </div>

          {/* Submit */}
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{padding:"14px",fontSize:14,borderRadius:12,justifyContent:"center",width:"100%",background:`linear-gradient(135deg,${sq.h},${sq.h}99)`,boxShadow:`0 4px 20px rgba(${SQUAD_COLOR[form.squad]?.rgb||"0,0,0"},.25)`}}>
            {loading?<><Spin/>Enviando...</>:"Enviar Task →"}
          </button>
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
  const [form,setForm]       = useState({name:"",job_title:"",team:"",phone:"",bio:""});
  const [prefs,setPrefs]     = useState({emailNotify:true});
  const [saving,setSaving]   = useState(false);
  const [saved,setSaved]     = useState(false);
  const [uploading,setUploading] = useState(false);
  const [pwForm,setPwForm]   = useState({current:"",newPw:"",confirm:""});
  const [pwMsg,setPwMsg]     = useState(null);
  const [pwSaving,setPwSaving] = useState(false);
  const fileRef = useRef();
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const fp = k => e => setPwForm(p=>({...p,[k]:e.target.value}));
  const myDemands = demands.filter(d=>d.user_id===user.id||d.user_email===user.email);
  const roles = profile?.roles||[profile?.role||user?.role||"user"];
  const stats = Object.fromEntries(Object.keys(STATUS).map(k=>[k,myDemands.filter(d=>d.status===k).length]));

  useEffect(()=>{
    dbProfile(user.id||user.email).then(p=>{ if(p){ setProfile(p); setForm({name:p.name||"",job_title:p.job_title||"",team:p.team||"",phone:p.phone||"",bio:p.bio||""}); setPrefs(p.prefs||{emailNotify:true}); } else { setForm({name:user.name||"",job_title:"",team:"",phone:"",bio:""}); } });
  },[user]);

  async function save() {
    setSaving(true);
    const updated={id:user.id||user.email,email:user.email,name:form.name,role:user.role,job_title:form.job_title,team:form.team,phone:form.phone,bio:form.bio,prefs,avatar_url:profile?.avatar_url||null,updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated); setProfile(updated); setSaving(false); setSaved(true);
    onUpdate({...user,name:form.name}); setTimeout(()=>setSaved(false),2000);
  }

  async function changePassword() {
    setPwMsg(null); setPwSaving(true);
    if (!pwForm.current||!pwForm.newPw||!pwForm.confirm) { setPwMsg({ok:false,text:"Preencha todos os campos."}); setPwSaving(false); return; }
    if (pwForm.newPw!==pwForm.confirm) { setPwMsg({ok:false,text:"Nova senha e confirmação não coincidem."}); setPwSaving(false); return; }
    if (pwForm.newPw.length<6) { setPwMsg({ok:false,text:"A senha deve ter pelo menos 6 caracteres."}); setPwSaving(false); return; }
    // Verify current password
    const u = await dbLogin(user.email, pwForm.current);
    if (!u) { setPwMsg({ok:false,text:"Senha atual incorreta."}); setPwSaving(false); return; }
    // Update password
    const s = sb();
    if (s) { await s.from("profiles").update({password:pwForm.newPw,updated_at:new Date().toISOString()}).eq("email",user.email); }
    else { const d=ls.get()||{users:[]}; const u2=d.users?.find(x=>x.email===user.email); if(u2){u2.password=pwForm.newPw;ls.set(d);} }
    setPwMsg({ok:true,text:"Senha alterada com sucesso!"}); setPwForm({current:"",newPw:"",confirm:""}); setPwSaving(false);
  }

  async function handleAvatar(e) {
    const file=e.target.files?.[0]; if(!file) return; setUploading(true);
    const url=await dbAvatar(user.id||user.email,file);
    const updated={...(profile||{}),id:user.id||user.email,email:user.email,avatar_url:url,updated_at:new Date().toISOString()};
    await dbUpsertProfile(updated); setProfile(updated); setUploading(false);
  }

  return(
    <div style={{flex:1,padding:"28px 0",animation:"fadeUp .35s ease"}}>
      <div style={{marginBottom:28}}><h1 style={{fontSize:26,fontWeight:900,letterSpacing:"-1px"}}>Meu Perfil</h1></div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:24}}>
        {/* Left */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Avatar card */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16,textAlign:"center"}}>
            <div style={{position:"relative",display:"inline-block",marginBottom:16}}>
              <div style={{width:88,height:88,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",border:"3px solid var(--border)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:700,cursor:"pointer",margin:"0 auto"}} onClick={()=>fileRef.current.click()}>
                {profile?.avatar_url?<img src={profile.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(form.name||user.name||"?").charAt(0).toUpperCase()}
              </div>
              <div onClick={()=>fileRef.current.click()} style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,border:"2px solid var(--bg)"}}>
                {uploading?<Spin/>:"📷"}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:"none"}}/>
            </div>
            <div style={{fontWeight:800,fontSize:16,marginBottom:3}}>{form.name||user.name}</div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:10}}>{user.email}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
              {roles.map(r=>{ const rm=ROLES[r]||ROLES.user; return <span key={r} style={{padding:"3px 10px",borderRadius:999,background:`${rm.color}12`,border:`1px solid ${rm.color}30`,fontSize:11,fontWeight:700,color:rm.color}}>{rm.icon} {rm.label}</span>; })}
            </div>
            {form.job_title&&<div style={{fontSize:12,color:"var(--t3)",marginTop:8}}>{form.job_title}</div>}
          </div>

          {/* Stats */}
          <div style={{padding:20,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <FieldLabel>Atividade</FieldLabel>
            {Object.entries(STATUS).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:12,color:"var(--t3)"}}>{v.icon} {v.label}</span>
                <span style={{fontWeight:800,fontSize:15,color:v.dot}}>{stats[k]||0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Personal info */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:20}}>Informações Pessoais</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div><FieldLabel>Nome completo</FieldLabel><input className="input" value={form.name} onChange={f("name")} placeholder="Seu nome"/></div>
              <div><FieldLabel>Cargo / Função</FieldLabel><input className="input" value={form.job_title} onChange={f("job_title")} placeholder="Ex.: Analista de TI"/></div>
              <div><FieldLabel>Time / Departamento</FieldLabel><input className="input" value={form.team} onChange={f("team")} placeholder="Ex.: Operações"/></div>
              <div><FieldLabel>Telefone</FieldLabel><input className="input" value={form.phone} onChange={f("phone")} placeholder="+55 11 9xxxx-xxxx"/></div>
              <div style={{gridColumn:"1/-1"}}><FieldLabel>Bio</FieldLabel><textarea className="input" value={form.bio} onChange={f("bio")} rows={3} placeholder="Breve descrição sobre você..." style={{resize:"vertical"}}/></div>
            </div>
          </div>

          {/* Preferences */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Preferências</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"var(--s1)",borderRadius:10}}>
              <span style={{fontSize:13}}>📧 Receber notificações por e-mail</span>
              <button onClick={()=>setPrefs(p=>({...p,emailNotify:!p.emailNotify}))} style={{width:44,height:24,borderRadius:999,border:"none",background:prefs.emailNotify?"var(--blue)":"var(--border)",transition:"background .2s",position:"relative",cursor:"pointer"}}>
                <div style={{position:"absolute",top:3,left:prefs.emailNotify?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
              </button>
            </div>
          </div>

          {/* Save */}
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{padding:"13px",fontSize:14,borderRadius:12,justifyContent:"center",width:"100%"}}>
            {saving?<><Spin/>Salvando...</>:saved?"✓ Salvo!":"Salvar alterações"}
          </button>

          {/* Change password */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>🔑 Alterar Senha</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><FieldLabel>Senha atual</FieldLabel><input className="input" type="password" value={pwForm.current} onChange={fp("current")} placeholder="••••••••"/></div>
              <div><FieldLabel>Nova senha</FieldLabel><input className="input" type="password" value={pwForm.newPw} onChange={fp("newPw")} placeholder="Mínimo 6 caracteres"/></div>
              <div><FieldLabel>Confirmar nova senha</FieldLabel><input className="input" type="password" value={pwForm.confirm} onChange={fp("confirm")} placeholder="Repita a nova senha"/></div>
            </div>
            {pwMsg&&<div style={{marginTop:12,padding:"9px 14px",borderRadius:8,fontSize:12,background:pwMsg.ok?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",border:`1px solid ${pwMsg.ok?"rgba(34,197,94,.3)":"rgba(239,68,68,.3)"}`,color:pwMsg.ok?"#4ade80":"#f87171"}}>{pwMsg.text}</div>}
            <button className="btn btn-ghost" onClick={changePassword} disabled={pwSaving} style={{marginTop:14,width:"100%",justifyContent:"center",padding:"11px"}}>
              {pwSaving?<><Spin/>Alterando...</>:"Alterar senha"}
            </button>
          </div>

          {/* My demands */}
          <div style={{padding:24,background:"var(--s2)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16,display:"flex",justifyContent:"space-between"}}>
              <span>Minhas Tasks</span><span style={{fontSize:12,color:"var(--t3)",fontWeight:400}}>{myDemands.length} no total</span>
            </div>
            {myDemands.length===0?<div style={{fontSize:13,color:"var(--t3)"}}>Nenhuma task enviada ainda.</div>
              :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...myDemands].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map(d=>{
                  const sm=STATUS[d.status]||STATUS.pendente; const sq2=SQUAD_COLOR[d.squad]||{h:"#64748b"};
                  return(
                    <div key={d.id} style={{padding:"11px 14px",background:"var(--s1)",borderRadius:10,border:"1px solid var(--border)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:15}}>{SQUAD_ICON[d.squad]}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.title}</div>
                          <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{SQUAD_LABEL[d.squad]}{d.sprint&&` · Sprint ${d.sprint}`}</div>
                        </div>
                        <span className="pill" style={{background:sm.color+"15",color:sm.dot,border:`1px solid ${sm.color}30`,fontSize:10}}>{sm.icon} {sm.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY SLATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptySlate({icon,title,sub}) {
  return(
    <div style={{textAlign:"center",padding:"64px 0",color:"var(--t3)"}}>
      <div style={{fontSize:48,marginBottom:14}}>{icon}</div>
      <div style={{fontSize:17,fontWeight:700,color:"var(--t2)",marginBottom:6}}>{title}</div>
      {sub&&<div style={{fontSize:13}}>{sub}</div>}
    </div>
  );
}
