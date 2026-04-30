import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ══════════════════════════════════════════════════════════════════════════════
let _supabase = null;

function getSupabase() { return _supabase; }

async function initSupabase(url, anonKey) {
  if (_supabase) return _supabase;
  // Dynamically load the Supabase CDN bundle
  await new Promise((res, rej) => {
    if (window.supabase) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  _supabase = window.supabase.createClient(url, anonKey);
  return _supabase;
}

// ── Supabase auto-connect ─────────────────────────────────────────────────
const SUPABASE_URL = "https://azoabvqhwoctdrfrkjhg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6b2FidnFod29jdGRyZnJramhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDg4MTIsImV4cCI6MjA5MzEyNDgxMn0.Ju9xLLVrATyes_WKrDKj2E1rv5EV5Rnc82kxk2UlKds";

// Auto-save config so it persists
setSBConfig({ url: SUPABASE_URL, key: SUPABASE_KEY });
const LSK = "taskhub_v4";
const SBCFG = "taskhub_supabase";
function lsGet()  { try { return JSON.parse(localStorage.getItem(LSK)||"null"); } catch { return null; } }
function lsSet(d) { try { localStorage.setItem(LSK, JSON.stringify(d)); } catch {} }
function getSBConfig() { try { return JSON.parse(localStorage.getItem(SBCFG)||"null"); } catch { return null; } }
function setSBConfig(c) { try { localStorage.setItem(SBCFG, JSON.stringify(c)); } catch {} }

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const SQUADS       = ["industria","reparadores","inovacao"];
const SQUAD_LABELS = { industria:"Indústria", reparadores:"Reparadores", inovacao:"Inovação" };
const SQUAD_ICONS  = { industria:"🏭", reparadores:"🔧", inovacao:"💡" };
const SQUAD_COLORS = {
  industria:   { accent:"#00c9a7", light:"rgba(0,201,167,.12)",   glow:"rgba(0,201,167,.25)" },
  reparadores: { accent:"#f7971e", light:"rgba(247,151,30,.12)",  glow:"rgba(247,151,30,.25)" },
  inovacao:    { accent:"#a78bfa", light:"rgba(167,139,250,.12)", glow:"rgba(167,139,250,.25)" },
};
const PRIO_LABELS  = { critica:"Crítica", alta:"Alta", media:"Média", baixa:"Baixa" };
const PRIO_COLORS  = { critica:"#ef4444", alta:"#f97316", media:"#eab308", baixa:"#22c55e" };
const TAG_LABELS   = { nova_demanda:"Nova Demanda", bug:"Correção de Bug" };
const TAG_COLORS   = {
  nova_demanda:{ color:"#38bdf8", bg:"rgba(56,189,248,.12)",  border:"rgba(56,189,248,.3)" },
  bug:         { color:"#f472b6", bg:"rgba(244,114,182,.12)", border:"rgba(244,114,182,.3)" },
};
const TAG_ICONS    = { nova_demanda:"✦", bug:"🐛" };
const STATUS_META  = {
  pendente:  { label:"Pendente",  color:"#94a3b8", bg:"rgba(148,163,184,.1)", icon:"⏳" },
  aprovada:  { label:"Aprovada",  color:"#4ade80", bg:"rgba(74,222,128,.1)",  icon:"✅" },
  rejeitada: { label:"Rejeitada", color:"#f87171", bg:"rgba(248,113,113,.1)", icon:"❌" },
};
const REQ_STATUS       = ["pendente","em andamento","concluído","cancelado"];
const REQ_STATUS_COLOR = { pendente:"#f97316","em andamento":"#38bdf8",concluído:"#4ade80",cancelado:"#94a3b8" };

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const SPRINT_ANCHOR = new Date("2025-01-06");
function getSprintNumber(date=new Date()){
  return Math.max(1, Math.floor((new Date(date)-SPRINT_ANCHOR)/(1000*60*60*24*14))+1);
}
function sprintDates(n,overrides={}){
  if(overrides[n]) return { start:new Date(overrides[n].start+"T00:00:00"), end:new Date(overrides[n].end+"T00:00:00"), custom:true };
  const start=new Date(SPRINT_ANCHOR.getTime()+(n-1)*14*86400000);
  return { start, end:new Date(start.getTime()+13*86400000), custom:false };
}
function toISODate(d){ return d.toISOString().slice(0,10); }
function fmtSprintRange(n,overrides={}){
  const {start,end,custom}=sprintDates(n,overrides);
  const o={day:"2-digit",month:"short"};
  return `${start.toLocaleDateString("pt-BR",o)} – ${end.toLocaleDateString("pt-BR",o)}${custom?" 📌":""}`;
}
function currentSprint(){ return getSprintNumber(new Date()); }
function buildSprintOptions(count=8){ const c=currentSprint(); return Array.from({length:count},(_,i)=>c+i); }
function PRIO_ORDER(p){ return {critica:0,alta:1,media:2,baixa:3}[p]??4; }

const _cur=currentSprint();
const DEFAULT_SPRINT_OVERRIDES={
  [_cur]:{ start:toISODate(new Date(SPRINT_ANCHOR.getTime()+(_cur-1)*14*86400000)), end:"2026-05-04" },
  [_cur+1]:{ start:"2026-05-05", end:"2026-05-15" },
};

// ══════════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════════
function genId(){ return Math.random().toString(36).slice(2,10); }
function fmt(iso){
  if(!iso) return "—";
  const d=new Date(iso);
  return d.toLocaleDateString("pt-BR")+" "+d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE DATA LAYER
// ══════════════════════════════════════════════════════════════════════════════
// All DB operations go through this layer — uses Supabase if configured, else localStorage

async function db_getDemands(){
  const sb=getSupabase();
  if(sb){ const {data,error}=await sb.from("demands").select("*").order("created_at",{ascending:false}); if(!error) return data||[]; }
  return (lsGet()?.demands)||[];
}
async function db_insertDemand(demand){
  const sb=getSupabase();
  if(sb){ const {error}=await sb.from("demands").insert([demand]); return !error; }
  const d=lsGet()||{demands:[]};
  d.demands=[...d.demands, demand]; lsSet(d); return true;
}
async function db_updateDemand(id,patch){
  const sb=getSupabase();
  if(sb){ const {error}=await sb.from("demands").update(patch).eq("id",id); return !error; }
  const d=lsGet()||{demands:[]};
  d.demands=d.demands.map(x=>x.id===id?{...x,...patch}:x); lsSet(d); return true;
}
async function db_getConfig(){
  const sb=getSupabase();
  if(sb){ const {data}=await sb.from("config").select("*").eq("id","main").single(); return data||{}; }
  return lsGet()?.config||{};
}
async function db_setConfig(patch){
  const sb=getSupabase();
  if(sb){ await sb.from("config").upsert({id:"main",...patch}); return; }
  const d=lsGet()||{};
  d.config={...(d.config||{}),...patch}; lsSet(d);
}
async function db_getBacklog(){
  const sb=getSupabase();
  if(sb){ const {data}=await sb.from("backlog").select("*").order("created_at",{ascending:false}); return data||[]; }
  return lsGet()?.backlog||[];
}
async function db_upsertBacklogItem(item){
  const sb=getSupabase();
  if(sb){ await sb.from("backlog").upsert([item]); return; }
  const d=lsGet()||{backlog:[]};
  const exists=d.backlog.find(x=>x.id===item.id);
  d.backlog=exists?d.backlog.map(x=>x.id===item.id?item:x):[...d.backlog,item]; lsSet(d);
}
async function db_deleteBacklogItem(id){
  const sb=getSupabase();
  if(sb){ await sb.from("backlog").delete().eq("id",id); return; }
  const d=lsGet()||{backlog:[]};
  d.backlog=d.backlog.filter(x=>x.id!==id); lsSet(d);
}
async function db_getProfile(userId){
  const sb=getSupabase();
  if(sb){ const {data}=await sb.from("profiles").select("*").eq("id",userId).single(); return data||null; }
  return lsGet()?.profiles?.[userId]||null;
}
async function db_getAllProfiles(){
  const sb=getSupabase();
  if(sb){ const {data}=await sb.from("profiles").select("*").order("created_at",{ascending:false}); return data||[]; }
  const d=lsGet(); return Object.values(d?.profiles||{});
}
async function db_upsertProfile(profile){
  const sb=getSupabase();
  if(sb){ await sb.from("profiles").upsert([profile]); return; }
  const d=lsGet()||{profiles:{}};
  d.profiles={...(d.profiles||{}), [profile.id]:profile}; lsSet(d);
}
async function db_uploadAvatar(userId, file){
  const sb=getSupabase();
  if(sb){
    const ext=file.name.split(".").pop();
    const path=`avatars/${userId}.${ext}`;
    await sb.storage.from("avatars").upload(path,file,{upsert:true});
    const {data}=sb.storage.from("avatars").getPublicUrl(path);
    return data?.publicUrl||null;
  }
  // Fallback: convert to base64 and store in localStorage
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=e=>res(e.target.result);
    r.readAsDataURL(file);
  });
}

// Emails that are always admins regardless of stored role
const ADMIN_EMAILS = ["daniel.cunha@oficinabrasil.com.br"];
function resolveRole(email, storedRole) {
  return ADMIN_EMAILS.includes(email) ? "admin" : (storedRole || "user");
}
const ROLE_META = {
  admin:     { label:"Admin",      color:"#818cf8", bg:"rgba(99,102,241,.15)",  border:"rgba(99,102,241,.4)",  icon:"🛡️" },
  moderador: { label:"Moderador",  color:"#f472b6", bg:"rgba(244,114,182,.15)", border:"rgba(244,114,182,.4)", icon:"⚖️" },
  user:      { label:"Usuário",    color:"#38bdf8", bg:"rgba(56,189,248,.12)",  border:"rgba(56,189,248,.3)",  icon:"👤" },
};
async function sendEmail(params){
  const {serviceId,templateId,publicKey,...tp}=params;
  if(!serviceId||!templateId||!publicKey) return {ok:false,reason:"EmailJS não configurado"};
  try{
    const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({service_id:serviceId,template_id:templateId,user_id:publicKey,template_params:tp}),
    });
    return r.ok?{ok:true}:{ok:false,reason:`HTTP ${r.status}`};
  }catch(e){return {ok:false,reason:e.message};}
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────
function buildGoogleOAuthUrl(clientId,redirectUri){
  return "https://accounts.google.com/o/oauth2/v2/auth?"+new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"token",scope:"openid email profile",prompt:"select_account"});
}
function buildMicrosoftOAuthUrl(clientId,redirectUri){
  return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"+new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"token",scope:"openid email profile User.Read",prompt:"select_account"});
}
function parseOAuthHash(){
  const hash=window.location.hash.slice(1); if(!hash) return null;
  return Object.fromEntries(hash.split("&").map(p=>p.split("=")))?.access_token||null;
}
async function fetchGoogleUser(token){
  const r=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) return null; const d=await r.json(); return {name:d.name,email:d.email,avatar:d.picture};
}
async function fetchMicrosoftUser(token){
  const r=await fetch("https://graph.microsoft.com/v1.0/me",{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok) return null; const d=await r.json(); return {name:d.displayName,email:d.mail||d.userPrincipalName,avatar:null};
}

// ══════════════════════════════════════════════════════════════════════════════
// SEED (local fallback only)
// ══════════════════════════════════════════════════════════════════════════════
const SEED_DEMANDS=[
  {id:"d1",user_id:"joao@empresa.com",user_email:"joao@empresa.com",user_name:"João Silva",team:"Operações",squad:"industria",priority:"alta",tag:"nova_demanda",title:"Ajuste no fluxo de produção",description:"Revisar pipeline de fabricação para reduzir gargalos na linha 3.",files:[],created_at:new Date(Date.now()-86400000*3).toISOString(),status:"pendente",sprint:null},
  {id:"d2",user_id:"joao@empresa.com",user_email:"joao@empresa.com",user_name:"João Silva",team:"TI",squad:"reparadores",priority:"critica",tag:"bug",title:"Sistema de ordens caindo",description:"Erros críticos em produção no sistema de OS.",files:[],created_at:new Date(Date.now()-3600000*8).toISOString(),status:"aprovada",sprint:currentSprint(),approved_at:new Date(Date.now()-3600000*2).toISOString(),admin_note:"Prioridade máxima."},
];
const SEED_CONFIG={
  emailConfig:{serviceId:"",templateId:"",publicKey:""},
  authConfig:{googleClientId:"",microsoftClientId:""},
  sprintOverrides:DEFAULT_SPRINT_OVERRIDES,
};
const SEED_BACKLOG=[
  {id:"b1",type:"account",title:"Acesso Jenkins",login:"deploy@empresa.com",password:"J3nk!ns#2024",notes:"Deploy de produção.",created_at:new Date(Date.now()-86400000*5).toISOString()},
  {id:"b2",type:"request",title:"Renovar certificado SSL",notes:"Vence em 15/06/2026.",created_at:new Date(Date.now()-3600000*3).toISOString(),status:"em andamento"},
];

// ══════════════════════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════════════════════
const css=`
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#080d14;--surface:#0d1520;--card:#111c2d;--border:#1e3050;--text:#e2eaf8;--muted:#5a7ca0;--font:'Sora',sans-serif;--mono:'JetBrains Mono',monospace;}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
  input,textarea,select{font-family:var(--font)}button{cursor:pointer;font-family:var(--font)}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .nav-btn:hover{background:rgba(255,255,255,.06)!important}
  .squad-tab:hover{opacity:.85}
  .card-hover:hover{border-color:rgba(255,255,255,.12)!important;transform:translateY(-1px)}
`;

// ══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════
function Spinner(){ return <div style={{width:18,height:18,border:"2px solid var(--border)",borderTopColor:"#0ea5e9",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>; }
function Field({label,type="text",value,onChange,placeholder,onKeyDown,accent="#0ea5e9",error,disabled}){
  return(
    <div>
      {label&&<div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:6,letterSpacing:".5px",textTransform:"uppercase"}}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown} disabled={disabled}
        style={{width:"100%",padding:"11px 14px",background:"var(--surface)",border:`1px solid ${error?"#ef4444":"var(--border)"}`,borderRadius:8,color:"var(--text)",fontSize:14,outline:"none",transition:"border-color .15s",opacity:disabled?.5:1}}
        onFocus={e=>!disabled&&(e.target.style.borderColor=accent)} onBlur={e=>e.target.style.borderColor=error?"#ef4444":"var(--border)"}/>
      {error&&<div style={{fontSize:11,color:"#ef4444",marginTop:4}}>⚠ {error}</div>}
    </div>
  );
}
function FormCard({label,children,error}){
  return(
    <div>
      <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8,letterSpacing:".5px",textTransform:"uppercase"}}>{label}</div>
      {children}
      {error&&<div style={{fontSize:11,color:"#ef4444",marginTop:4}}>⚠ {error}</div>}
    </div>
  );
}
function Badge({label,color,bg,border,icon}){
  return(
    <div style={{padding:"3px 10px",borderRadius:999,background:bg||`${color}18`,border:`1px solid ${border||color+"44"}`,fontSize:11,fontWeight:700,color,flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
      {icon&&<span>{icon}</span>}{label}
    </div>
  );
}
function SummaryRow({icon,label,value,color}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
      <span style={{color:"var(--muted)"}}>{icon} {label}</span>
      <span style={{fontWeight:600,color:color||"var(--text)"}}>{value}</span>
    </div>
  );
}
function EmptyState({icon,title,sub}){
  return(
    <div style={{textAlign:"center",padding:"60px 0",color:"var(--muted)"}}>
      <div style={{fontSize:44,marginBottom:12}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:500,color:"var(--text)"}}>{title}</div>
      {sub&&<div style={{fontSize:13,marginTop:4}}>{sub}</div>}
    </div>
  );
}
function Divider({label}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{flex:1,height:1,background:"var(--border)"}}/>
      <span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"var(--border)"}}/>
    </div>
  );
}
function GoogleIcon(){
  return(<svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>);
}
function MicrosoftIcon(){
  return(<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M13 1h10v10H13z"/><path fill="#7fba00" d="M1 13h10v10H1z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE SETUP WIZARD
// ══════════════════════════════════════════════════════════════════════════════
function SetupWizard({onDone}){
  const [url,setUrl]=useState("");
  const [key,setKey]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  async function connect(){
    setErr(""); setLoading(true);
    try{
      const sb=await initSupabase(url.trim(),key.trim());
      // Test connection
      const {error}=await sb.from("profiles").select("id").limit(1);
      if(error&&error.code!=="PGRST116"){ setErr("Erro ao conectar: "+error.message); setLoading(false); return; }
      setSBConfig({url:url.trim(),key:key.trim()});
      onDone(sb);
    }catch(e){ setErr("Erro: "+e.message); setLoading(false); }
  }

  function skipToLocal(){
    // Initialize with pre-loaded local data
    if(!lsGet()) lsSet({demands:SEED_DEMANDS,config:SEED_CONFIG,backlog:SEED_BACKLOG,profiles:{},
      users:[
        {id:"daniel.cunha@oficinabrasil.com.br",email:"daniel.cunha@oficinabrasil.com.br",password:"123123",name:"Daniel Cunha",role:"admin"},
        {id:"joao@empresa.com",email:"joao@empresa.com",password:"demo123",name:"João Silva",role:"user"},
      ]});
    onDone(null);
  }

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,60,120,.35) 0%,transparent 70%),var(--bg)"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(0,80,160,.06) 1px, transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none"}}/>
      <div style={{width:520,background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:40,position:"relative",zIndex:1,boxShadow:"0 24px 80px rgba(0,0,0,.6)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>🗄️</div>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.5px"}}>Configurar Banco de Dados</div>
          <div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>Conecte um projeto Supabase ao <strong style={{color:"var(--text)"}}>TaskHUB</strong></div>
        </div>

        {/* Steps */}
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:28}}>
          {[
            ["1","Acesse","supabase.com","https://supabase.com","e crie um projeto gratuito"],
            ["2","No painel","Settings → API","","copie a Project URL e a anon public key"],
            ["3","Em","SQL Editor","","execute o script abaixo para criar as tabelas"],
          ].map(([n,a,link,href,b])=>(
            <div key={n} style={{display:"flex",gap:12,padding:"10px 14px",background:"var(--surface)",borderRadius:10,alignItems:"flex-start"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,marginTop:1}}>{n}</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.5}}>
                {a} {href?<a href={href} target="_blank" rel="noreferrer" style={{color:"#38bdf8"}}>{link}</a>:<strong style={{color:"var(--text)"}}>{link}</strong>} {b}
              </div>
            </div>
          ))}
        </div>

        {/* SQL Script */}
        <details style={{marginBottom:24}}>
          <summary style={{cursor:"pointer",fontSize:12,fontWeight:600,color:"#818cf8",padding:"8px 0",userSelect:"none"}}>📋 Ver script SQL para criar as tabelas</summary>
          <pre style={{marginTop:10,padding:14,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,fontSize:10,color:"#a5b4fc",overflow:"auto",maxHeight:260,lineHeight:1.6,fontFamily:"var(--mono)"}}>{SQL_SCRIPT}</pre>
        </details>

        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:20}}>
          <Field label="Project URL" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xxxxxxxxxxx.supabase.co" accent="#0ea5e9"/>
          <Field label="Anon Public Key" value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIs..." accent="#0ea5e9"/>
        </div>

        {err&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#f87171"}}>{err}</div>}

        <button onClick={connect} disabled={!url||!key||loading}
          style={{width:"100%",padding:"13px 0",border:"none",borderRadius:10,fontSize:14,fontWeight:600,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",transition:"opacity .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:!url||!key||loading?.6:1}}>
          {loading?<><Spinner/> Conectando...</>:"Conectar ao Supabase →"}
        </button>

        <button onClick={skipToLocal} style={{width:"100%",marginTop:10,padding:"11px 0",border:"1px solid var(--border)",borderRadius:10,fontSize:13,background:"transparent",color:"var(--muted)",transition:"color .15s"}}
          onMouseOver={e=>e.currentTarget.style.color="var(--text)"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>
          Usar modo local (localStorage) →
        </button>
      </div>
      <style>{css}</style>
    </div>
  );
}

const SQL_SCRIPT=`-- Run this in your Supabase SQL Editor

create table if not exists profiles (
  id text primary key,
  email text,
  name text,
  role text default 'user',
  avatar_url text,
  job_title text,
  team text,
  phone text,
  bio text,
  prefs jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists demands (
  id text primary key,
  user_id text,
  user_email text,
  user_name text,
  team text,
  squad text,
  priority text,
  tag text,
  title text,
  description text,
  files jsonb default '[]',
  status text default 'pendente',
  sprint int,
  admin_note text,
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists backlog (
  id text primary key,
  type text,
  title text,
  login text,
  password text,
  notes text,
  status text default 'pendente',
  created_at timestamptz default now()
);

create table if not exists config (
  id text primary key default 'main',
  email_config jsonb default '{}',
  auth_config jsonb default '{}',
  sprint_overrides jsonb default '{}'
);

-- Storage bucket for avatars (run separately in Storage tab or via API)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Enable RLS (adjust policies to your needs)
alter table profiles enable row level security;
alter table demands enable row level security;
alter table backlog enable row level security;
alter table config enable row level security;

create policy "Public read" on profiles for select using (true);
create policy "Self write" on profiles for all using (true);
create policy "Public demands" on demands for all using (true);
create policy "Public backlog" on backlog for all using (true);
create policy "Public config" on config for all using (true);`;

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AuthScreen({onLogin}){
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({name:"",email:"",password:""});
  const [err,setErr]=useState(""); const [info,setInfo]=useState("");
  const [shake,setShake]=useState(false); const [loading,setLoading]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const sbCfg=getSBConfig();
  const lsData=lsGet();
  const cfgData=lsData?.config||SEED_CONFIG;
  const emailCfg=cfgData?.emailConfig||{};
  const authCfg=cfgData?.authConfig||{};
  const redirectUri=window.location.origin+window.location.pathname;

  useEffect(()=>{
    const token=parseOAuthHash(); if(!token) return;
    const provider=sessionStorage.getItem("oauth_provider"); if(!provider) return;
    sessionStorage.removeItem("oauth_provider"); window.location.hash="";
    setLoading(true);
    const fetcher=provider==="google"?fetchGoogleUser:fetchMicrosoftUser;
    fetcher(token).then(async info=>{
      if(!info?.email){setErr("Não foi possível obter dados do provedor.");setLoading(false);return;}
      const d=lsGet()||{users:[]};
      let u=d.users?.find(u=>u.email===info.email);
      if(!u){ u={id:info.email,email:info.email,name:info.name||info.email,password:"",role:"user",provider,avatar_url:info.avatar||null}; d.users=[...(d.users||[]),u]; lsSet(d); }
      await db_upsertProfile({id:u.id,email:u.email,name:u.name,role:u.role,avatar_url:info.avatar||null,updated_at:new Date().toISOString()});
      onLogin(u);
      setLoading(false);
    });
  },[]);

  function goOAuth(provider){
    const clientId=provider==="google"?authCfg.googleClientId:authCfg.microsoftClientId;
    if(!clientId){setErr(`Client ID do ${provider==="google"?"Google":"Microsoft"} não configurado. Configure em Painel Admin → 🔐 Auth.`);return;}
    sessionStorage.setItem("oauth_provider",provider);
    window.location.href=provider==="google"?buildGoogleOAuthUrl(clientId,redirectUri):buildMicrosoftOAuthUrl(clientId,redirectUri);
  }

  async function submitLogin(){
    setErr(""); setLoading(true);
    const d=lsGet()||{users:[]};
    const u=d.users?.find(u=>u.email===form.email&&u.password===form.password);
    if(!u){setErr("E-mail ou senha incorretos.");setShake(true);setTimeout(()=>setShake(false),500);setLoading(false);return;}
    const role=resolveRole(u.email, u.role);
    // Persist correct role if it changed
    if(role!==u.role){ u.role=role; lsSet(d); }
    const resolved={...u,role};
    await db_upsertProfile({id:resolved.id||resolved.email,email:resolved.email,name:resolved.name,role,updated_at:new Date().toISOString()});
    onLogin(resolved); setLoading(false);
  }

  async function submitRegister(){
    setErr(""); setLoading(true);
    if(!form.name||!form.email||!form.password){setErr("Preencha todos os campos.");setLoading(false);return;}
    const d=lsGet()||{users:[]};
    if(d.users?.find(u=>u.email===form.email)){setErr("E-mail já cadastrado.");setLoading(false);return;}
    const nu={id:form.email,email:form.email,password:form.password,name:form.name,role:"user"};
    d.users=[...(d.users||[]),nu]; lsSet(d);
    await db_upsertProfile({id:nu.id,email:nu.email,name:nu.name,role:"user",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
    onLogin(nu); setLoading(false);
  }

  async function submitForgot(){
    setErr(""); setInfo(""); setLoading(true);
    if(!form.email){setErr("Informe seu e-mail.");setLoading(false);return;}
    const d=lsGet()||{users:[]};
    const u=d.users?.find(u=>u.email===form.email);
    if(!u){setErr("Nenhuma conta encontrada com este e-mail.");setLoading(false);return;}
    const tmp=Math.random().toString(36).slice(2,10).toUpperCase();
    u.password=tmp; lsSet(d);
    const r=await sendEmail({...emailCfg,to_email:u.email,to_name:u.name,temp_password:tmp});
    if(r.ok) setInfo("E-mail enviado! Use a senha temporária para entrar.");
    else setInfo(`Senha temporária: ${tmp}  (EmailJS: ${r.reason})`);
    setLoading(false);
  }

  function submit(){ if(mode==="login") submitLogin(); else if(mode==="register") submitRegister(); else submitForgot(); }

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,60,120,.35) 0%,transparent 70%),var(--bg)"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, rgba(0,80,160,.06) 1px, transparent 1px)",backgroundSize:"32px 32px",pointerEvents:"none"}}/>
      <div style={{width:440,background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,padding:40,position:"relative",zIndex:1,animation:shake?"shake .4s ease":"fadeIn .3s ease",boxShadow:"0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:12,boxShadow:"0 0 32px rgba(99,102,241,.4)"}}>⚡</div>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.5px"}}>TaskHUB</div>
          <div style={{fontSize:13,color:"var(--muted)",marginTop:4}}>{mode==="login"?"Acesse sua conta":mode==="register"?"Crie sua conta":"Recuperar senha"}</div>
          {sbCfg&&<div style={{marginTop:6,fontSize:10,color:"#4ade80",fontFamily:"var(--mono)"}}>● Supabase conectado</div>}
        </div>

        {mode!=="forgot"&&(
          <div style={{display:"flex",background:"var(--surface)",borderRadius:10,padding:4,marginBottom:24}}>
            {["login","register"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");setInfo("");}} style={{flex:1,padding:"8px 0",border:"none",borderRadius:8,fontSize:13,fontWeight:600,transition:"all .2s",background:mode===m?"var(--card)":"transparent",color:mode===m?"var(--text)":"var(--muted)",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.4)":"none"}}>
                {m==="login"?"Entrar":"Criar conta"}
              </button>
            ))}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="register"&&<Field label="Nome completo" value={form.name} onChange={f("name")} placeholder="Seu nome"/>}
          <Field label="E-mail" type="email" value={form.email} onChange={f("email")} placeholder="voce@empresa.com" onKeyDown={e=>e.key==="Enter"&&submit()}/>
          {mode!=="forgot"&&<Field label="Senha" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}/>}
        </div>

        {mode==="login"&&<div style={{textAlign:"right",marginTop:8}}><button onClick={()=>{setMode("forgot");setErr("");setInfo("");}} style={{background:"none",border:"none",color:"#38bdf8",fontSize:12,cursor:"pointer",padding:0}}>Esqueci minha senha</button></div>}
        {mode==="forgot"&&<div style={{textAlign:"right",marginTop:8}}><button onClick={()=>{setMode("login");setErr("");setInfo("");}} style={{background:"none",border:"none",color:"var(--muted)",fontSize:12,cursor:"pointer",padding:0}}>← Voltar ao login</button></div>}
        {mode==="forgot"&&!info&&<div style={{marginTop:12,padding:"10px 14px",background:"rgba(56,189,248,.07)",border:"1px solid rgba(56,189,248,.2)",borderRadius:8,fontSize:12,color:"#7dd3fc",lineHeight:1.6}}>Uma senha temporária será enviada para o seu e-mail.</div>}

        {err&&<div style={{marginTop:14,padding:"10px 14px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#f87171"}}>{err}</div>}
        {info&&<div style={{marginTop:14,padding:"10px 14px",background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",borderRadius:8,fontSize:12,color:"#4ade80",lineHeight:1.6}}>{info}</div>}

        <button onClick={submit} disabled={loading} style={{width:"100%",marginTop:20,padding:"13px 0",border:"none",borderRadius:10,fontSize:14,fontWeight:600,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",transition:"opacity .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:loading?.7:1}}>
          {loading?<><Spinner/>Aguarde...</>:mode==="login"?"Entrar →":mode==="register"?"Criar conta →":"Enviar instruções →"}
        </button>

        {mode!=="forgot"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
            <Divider label="ou entre com"/>
            <button onClick={()=>goOAuth("google")} disabled={loading} style={{width:"100%",padding:"11px 0",border:"1px solid var(--border)",borderRadius:10,background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor="#4285f4"} onMouseOut={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <GoogleIcon/><span>Continuar com Google</span>
            </button>
            <button onClick={()=>goOAuth("microsoft")} disabled={loading} style={{width:"100%",padding:"11px 0",border:"1px solid var(--border)",borderRadius:10,background:"var(--surface)",color:"var(--text)",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .15s"}}
              onMouseOver={e=>e.currentTarget.style.borderColor="#00a4ef"} onMouseOut={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <MicrosoftIcon/><span>Continuar com Outlook</span>
            </button>
          </div>
        )}

        {mode==="login"&&(
          <div style={{marginTop:16,padding:"10px 14px",background:"rgba(14,165,233,.07)",border:"1px solid rgba(14,165,233,.2)",borderRadius:8,fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)"}}>
            Demo user: joao@empresa.com / demo123<br/>Admin: daniel.cunha@oficinabrasil.com.br / 123123
          </div>
        )}

        {mode==="login"&&(
          <button onClick={()=>{localStorage.removeItem('taskhub_supabase');localStorage.removeItem('taskhub_v4');location.reload();}}
            style={{width:"100%",marginTop:12,padding:"10px 0",border:"1px solid rgba(52,211,153,.3)",borderRadius:10,background:"rgba(52,211,153,.07)",color:"#34d399",fontSize:12,fontWeight:600,transition:"all .15s"}}
            onMouseOver={e=>e.currentTarget.style.background="rgba(52,211,153,.15)"} onMouseOut={e=>e.currentTarget.style.background="rgba(52,211,153,.07)"}>
            🗄️ Configurar banco de dados (Supabase)
          </button>
        )}
      </div>
      <style>{css}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ProfilePage({user,onUpdate,onBack,demands=[]}){
  const [profile,setProfile]=useState(null);
  const [form,setForm]=useState({name:"",job_title:"",team:"",phone:"",bio:""});
  const [prefs,setPrefs]=useState({emailNotify:true,theme:"dark"});
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef();
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  useEffect(()=>{
    db_getProfile(user.id||user.email).then(p=>{
      if(p){ setProfile(p); setForm({name:p.name||"",job_title:p.job_title||"",team:p.team||"",phone:p.phone||"",bio:p.bio||""}); setPrefs(p.prefs||{emailNotify:true}); }
      else{ setForm({name:user.name||"",job_title:"",team:"",phone:"",bio:""}); }
    });
  },[user]);

  async function save(){
    setSaving(true);
    const updated={id:user.id||user.email,email:user.email,name:form.name,role:user.role,job_title:form.job_title,team:form.team,phone:form.phone,bio:form.bio,prefs,avatar_url:profile?.avatar_url||null,updated_at:new Date().toISOString()};
    await db_upsertProfile(updated);
    setProfile(updated); setSaving(false); setSaved(true);
    onUpdate({...user,name:form.name});
    setTimeout(()=>setSaved(false),2000);
  }

  async function handleAvatar(e){
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    const url=await db_uploadAvatar(user.id||user.email,file);
    const updated={...(profile||{}),id:user.id||user.email,email:user.email,avatar_url:url,updated_at:new Date().toISOString()};
    await db_upsertProfile(updated); setProfile(updated); setUploading(false);
  }

  const myDemands=demands.filter(d=>d.user_id===user.id||d.user_email===user.email);
  const stats={ total:myDemands.length, aprovada:myDemands.filter(d=>d.status==="aprovada").length, pendente:myDemands.filter(d=>d.status==="pendente").length, rejeitada:myDemands.filter(d=>d.status==="rejeitada").length };
  const avatar=profile?.avatar_url;

  return(
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
        <button onClick={onBack} style={{padding:"7px 14px",border:"1px solid var(--border)",borderRadius:8,background:"transparent",color:"var(--muted)",fontSize:13,transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="var(--text)"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>← Voltar</button>
        <h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-.5px"}}>Meu Perfil</h1>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:24}}>
        {/* Left: avatar + stats */}
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Avatar */}
          <div style={{padding:24,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,textAlign:"center"}}>
            <div style={{position:"relative",display:"inline-block",marginBottom:16}}>
              <div style={{width:90,height:90,borderRadius:"50%",background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",border:"3px solid var(--border)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:700,cursor:"pointer"}}
                onClick={()=>fileRef.current.click()}>
                {avatar?<img src={avatar} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(form.name||user.name||"?").charAt(0).toUpperCase()}
              </div>
              <div onClick={()=>fileRef.current.click()} style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:"#0ea5e9",border:"2px solid var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12}}>
                {uploading?<Spinner/>:"📷"}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:"none"}}/>
            </div>
            <div style={{fontWeight:700,fontSize:16}}>{form.name||user.name}</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>{user.email}</div>
            <div style={{marginTop:8,display:"inline-flex",padding:"3px 10px",borderRadius:999,background:user.role==="admin"?"rgba(99,102,241,.15)":"rgba(14,165,233,.12)",border:`1px solid ${user.role==="admin"?"rgba(99,102,241,.4)":"rgba(14,165,233,.3)"}`,fontSize:11,fontWeight:700,color:user.role==="admin"?"#818cf8":"#38bdf8"}}>
              {user.role==="admin"?"🛡️ Admin":"👤 Usuário"}
            </div>
            {form.job_title&&<div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>{form.job_title}</div>}
            {form.team&&<div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>🏷️ {form.team}</div>}
          </div>

          {/* Stats */}
          <div style={{padding:20,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>Atividade</div>
            {[["📋","Total de demandas",stats.total,"var(--text)"],["✅","Aprovadas",stats.aprovada,"#4ade80"],["⏳","Pendentes",stats.pendente,"#f97316"],["❌","Rejeitadas",stats.rejeitada,"#f87171"]].map(([ic,lb,vl,cl])=>(
              <div key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:13,color:"var(--muted)"}}>{ic} {lb}</span>
                <span style={{fontWeight:700,fontSize:16,color:cl}}>{vl}</span>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{padding:20,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:14,textTransform:"uppercase",letterSpacing:".5px"}}>Últimas demandas</div>
            {myDemands.slice(0,4).length===0?<div style={{fontSize:12,color:"var(--muted)"}}>Nenhuma demanda ainda.</div>:
              myDemands.slice(0,4).map(d=>{
                const sm=STATUS_META[d.status]||STATUS_META.pendente;
                const ac=SQUAD_COLORS[d.squad]?.accent||"#94a3b8";
                return(
                  <div key={d.id} style={{padding:"8px 0",borderBottom:"1px solid var(--border)"}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.title}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:10,color:ac}}>●{SQUAD_LABELS[d.squad]}</span>
                      <span style={{fontSize:10,color:sm.color}}>{sm.icon}{sm.label}</span>
                      <span style={{fontSize:10,color:"var(--muted)",marginLeft:"auto"}}>{fmt(d.created_at||d.createdAt).split(" ")[0]}</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Right: edit form */}
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Personal info */}
          <div style={{padding:24,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:20}}>Informações Pessoais</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <Field label="Nome completo" value={form.name} onChange={f("name")} placeholder="Seu nome"/>
              <Field label="Cargo / Função" value={form.job_title} onChange={f("job_title")} placeholder="Ex.: Analista de TI"/>
              <Field label="Time / Departamento" value={form.team} onChange={f("team")} placeholder="Ex.: Operações"/>
              <Field label="Telefone" value={form.phone} onChange={f("phone")} placeholder="+55 11 9xxxx-xxxx"/>
              <div style={{gridColumn:"1/-1"}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--muted)",marginBottom:8,letterSpacing:".5px",textTransform:"uppercase"}}>Bio</div>
                <textarea value={form.bio} onChange={f("bio")} rows={3} placeholder="Breve descrição sobre você..."
                  style={{width:"100%",padding:"11px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:13,outline:"none",resize:"vertical",lineHeight:1.6}}
                  onFocus={e=>e.target.style.borderColor="#0ea5e9"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div style={{padding:24,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:20}}>Preferências</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[
                ["emailNotify","📧 Receber notificações por e-mail quando demanda for aprovada/rejeitada"],
              ].map(([key,label])=>(
                <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"var(--surface)",borderRadius:10}}>
                  <span style={{fontSize:13,color:"var(--text)"}}>{label}</span>
                  <button onClick={()=>setPrefs(p=>({...p,[key]:!p[key]}))}
                    style={{width:44,height:24,borderRadius:999,border:"none",background:prefs[key]?"#0ea5e9":"var(--border)",transition:"background .2s",position:"relative",flexShrink:0}}>
                    <div style={{position:"absolute",top:3,left:prefs[key]?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.4)"}}/>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={save} disabled={saving} style={{padding:"14px",border:"none",borderRadius:12,fontSize:14,fontWeight:700,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",transition:"opacity .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:10,opacity:saving?.7:1}}>
            {saving?<><Spinner/>Salvando...</>:saved?"✓ Salvo!":"Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [phase,setPhase]=useState("loading"); // "loading"|"auth"|"app"
  const [user,setUser]=useState(null);
  const [demands,setDemands]=useState([]);
  const [config,setConfig]=useState(SEED_CONFIG);
  const [backlog,setBacklog]=useState([]);
  const [view,setView]=useState("queue");
  const [toast,setToast]=useState(null);

  // Auto-connect Supabase on startup
  useEffect(()=>{
    // Migration: ensure ADMIN_EMAILS always have role="admin" in localStorage
    const d=lsGet();
    if(d?.users){
      let changed=false;
      d.users=d.users.map(u=>{ const r=resolveRole(u.email,u.role); if(r!==u.role){changed=true;return {...u,role:r};} return u; });
      if(changed) lsSet(d);
    }
    initSupabase(SUPABASE_URL, SUPABASE_KEY)
      .then(()=>setPhase("auth"))
      .catch(()=>setPhase("auth"));
  },[]);

  function showToast(msg,type="success"){ setToast({msg,type}); setTimeout(()=>setToast(null),3500); }

  async function loadAppData(){
    const [d,c,b]=await Promise.all([db_getDemands(),db_getConfig(),db_getBacklog()]);
    setDemands(d.length?d:SEED_DEMANDS);
    setConfig(c&&Object.keys(c).length?{emailConfig:c.email_config||{},authConfig:c.auth_config||{},sprintOverrides:c.sprint_overrides||DEFAULT_SPRINT_OVERRIDES}:SEED_CONFIG);
    setBacklog(b.length?b:SEED_BACKLOG);
  }

  function handleSetupDone(){ setPhase("auth"); }

  async function handleLogin(u){
    setUser(u);
    await loadAppData();
    setView(u.role==="admin"?"admin":"queue");
    setPhase("app");
  }

  function handleLogout(){ setUser(null); setPhase("auth"); }
  function handleUserUpdate(u){ setUser(u); }

  async function handleNewDemand(demand){
    await db_insertDemand(demand);
    setDemands(p=>[demand,...p]);
    showToast("Demanda enviada! Aguarde a aprovação do gestor.");
    setView("my");
  }

  async function handleApprove({demandId,status,sprint,adminNote}){
    const demand=demands.find(d=>d.id===demandId);
    const patch={status,sprint:status==="aprovada"?sprint:null,approved_at:new Date().toISOString(),admin_note:adminNote};
    await db_updateDemand(demandId,patch);
    setDemands(p=>p.map(d=>d.id===demandId?{...d,...patch}:d));
    const cfg=config.emailConfig||{};
    const overrides=config.sprintOverrides||{};
    const spRange=status==="aprovada"?fmtSprintRange(sprint,overrides):"";
    const r=await sendEmail({...cfg,to_email:demand.user_email,to_name:demand.user_name,demand_title:demand.title,squad:SQUAD_LABELS[demand.squad],sprint_label:`Sprint ${sprint}`,sprint_range:spRange,status_label:STATUS_META[status]?.label||status,admin_note:adminNote||"—"});
    if(r.ok) showToast(`Demanda ${STATUS_META[status].label.toLowerCase()} · e-mail enviado!`);
    else showToast(`Demanda atualizada · e-mail não enviado: ${r.reason}`,"warn");
  }

  async function handleSaveConfig(patch){
    const next={...config,...patch};
    setConfig(next);
    await db_setConfig({email_config:next.emailConfig,auth_config:next.authConfig,sprint_overrides:next.sprintOverrides});
    showToast("Configurações salvas!");
  }

  async function handleSaveBacklog(items){
    setBacklog(items); // items already upserted/deleted by BacklogPanel
    showToast("Backlog salvo!");
  }

  if(phase==="loading") return <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center"}}><style>{css}</style><div style={{textAlign:"center"}}><div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:22,marginBottom:16,boxShadow:"0 0 32px rgba(99,102,241,.4)"}}>⚡</div><div style={{color:"var(--muted)",fontSize:14}}>Carregando TaskHUB...</div></div></div>;
  if(phase==="auth")  return <AuthScreen onLogin={handleLogin}/>;

  const isAdmin=user?.role==="admin";
  const isModerator=user?.role==="moderador"||isAdmin;
  const pendingCount=demands.filter(d=>d.status==="pendente").length;
  const overrides=config.sprintOverrides||{};
  const cur=currentSprint();

  const navItems=isAdmin
    ?[{id:"admin",label:"Painel Admin",icon:"🛡️"},{id:"queue",label:"Filas / Sprints",icon:"📋"}]
    :isModerator
    ?[{id:"admin",label:"Painel",icon:"⚖️"},{id:"queue",label:"Filas / Sprints",icon:"📋"}]
    :[{id:"queue",label:"Filas / Sprints",icon:"📋"},{id:"new",label:"+ Nova Demanda",icon:""},{id:"my",label:"Minhas Demandas",icon:"📂"}];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      <style>{css}</style>

      {toast&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 20px",borderRadius:10,fontSize:13,fontWeight:600,animation:"slideIn .3s ease",
          background:toast.type==="warn"?"rgba(234,179,8,.15)":"rgba(74,222,128,.15)",
          border:`1px solid ${toast.type==="warn"?"rgba(234,179,8,.4)":"rgba(74,222,128,.4)"}`,
          color:toast.type==="warn"?"#fde047":"#4ade80",boxShadow:"0 8px 32px rgba(0,0,0,.4)"}}>
          {toast.type==="warn"?"⚠️":"✓"} {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",height:60,background:"rgba(13,21,32,.95)",borderBottom:"1px solid var(--border)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>⚡</div>
          <span style={{fontWeight:700,fontSize:15,letterSpacing:"-.3px"}}>TaskHUB</span>
          {isAdmin&&<span style={{padding:"2px 8px",borderRadius:6,background:"rgba(99,102,241,.2)",border:"1px solid rgba(99,102,241,.4)",fontSize:10,fontWeight:700,color:"#818cf8",letterSpacing:".5px"}}>ADMIN</span>}
          {!isAdmin&&isModerator&&<span style={{padding:"2px 8px",borderRadius:6,background:"rgba(244,114,182,.2)",border:"1px solid rgba(244,114,182,.4)",fontSize:10,fontWeight:700,color:"#f472b6",letterSpacing:".5px"}}>MOD</span>}
          {getSBConfig()&&<span style={{padding:"2px 8px",borderRadius:6,background:"rgba(74,222,128,.1)",border:"1px solid rgba(74,222,128,.3)",fontSize:9,fontWeight:700,color:"#4ade80",letterSpacing:".5px"}}>● SUPABASE</span>}
        </div>
        <div style={{display:"flex",gap:4}}>
          {navItems.map(v=>(
            <button key={v.id} className="nav-btn" onClick={()=>setView(v.id)} style={{padding:"7px 16px",border:"none",borderRadius:8,fontSize:13,fontWeight:500,transition:"all .15s",background:view===v.id?"rgba(14,165,233,.15)":"transparent",color:view===v.id?"#0ea5e9":"var(--muted)",position:"relative"}}>
              {v.icon&&<span style={{marginRight:5}}>{v.icon}</span>}{v.label}
              {v.id==="admin"&&pendingCount>0&&<span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:"50%",background:"#ef4444",fontSize:9,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingCount}</span>}
            </button>
          ))}
        </div>
        {/* User avatar + menu */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setView("profile")} style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,border:view==="profile"?"2px solid #0ea5e9":"2px solid transparent",overflow:"hidden",padding:0,transition:"border-color .15s"}}>
            {user?.avatar_url?<img src={user.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(user?.name||"?").charAt(0).toUpperCase()}
          </button>
          <span style={{fontSize:13,color:"var(--muted)"}}>{user?.name}</span>
          <button onClick={handleLogout} style={{padding:"6px 12px",border:"1px solid var(--border)",borderRadius:7,fontSize:12,background:"transparent",color:"var(--muted)",transition:"color .15s"}} onMouseOver={e=>e.currentTarget.style.color="var(--text)"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>Sair</button>
        </div>
      </nav>

      <main style={{flex:1,padding:32,maxWidth:1200,margin:"0 auto",width:"100%"}}>
        {view==="profile" && <ProfilePage user={user} onUpdate={handleUserUpdate} onBack={()=>setView(isAdmin?"admin":"queue")} demands={demands}/>}
        {view==="new"     && <NewDemandForm user={user} onSubmit={handleNewDemand} sprintOverrides={overrides}/>}
        {view==="queue"   && <SprintQueueView demands={demands} sprintOverrides={overrides}/>}
        {view==="my"      && <MyDemandsView demands={demands.filter(d=>(d.user_id===user?.id||d.user_email===user?.email))} sprintOverrides={overrides}/>}
        {view==="admin"   && isModerator && <AdminPanel demands={demands} config={config} backlog={backlog} isAdmin={isAdmin} onApprove={handleApprove} onSaveConfig={handleSaveConfig} onSaveBacklog={handleSaveBacklog}/>}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW DEMAND FORM
// ══════════════════════════════════════════════════════════════════════════════
function NewDemandForm({user,onSubmit,sprintOverrides={}}){
  const [form,setForm]=useState({squad:"industria",priority:"media",tag:"nova_demanda",title:"",team:"",description:""});
  const [files,setFiles]=useState([]); const [errors,setErrors]=useState({});
  const fileRef=useRef();
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const accent=SQUAD_COLORS[form.squad].accent;

  function submit(){
    const e={}; if(!form.title.trim()) e.title="Título obrigatório"; if(!form.description.trim()) e.description="Descrição obrigatória";
    setErrors(e); if(Object.keys(e).length) return;
    onSubmit({id:genId(),user_id:user.id||user.email,user_email:user.email,user_name:user.name,...form,files,created_at:new Date().toISOString(),status:"pendente",sprint:null});
  }

  return(
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-.5px"}}>Nova Demanda</h1>
        <p style={{color:"var(--muted)",fontSize:14,marginTop:4}}>Preencha os campos abaixo. Após o envio, um gestor irá avaliar e definir a sprint.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <FormCard label="Título da demanda" error={errors.title}>
            <input value={form.title} onChange={f("title")} placeholder="Ex.: Ajuste no processo de triagem"
              style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:`1px solid ${errors.title?"#ef4444":"var(--border)"}`,borderRadius:10,color:"var(--text)",fontSize:15,outline:"none"}}
              onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=errors.title?"#ef4444":"var(--border)"}/>
          </FormCard>
          <FormCard label="Time solicitante">
            <input value={form.team} onChange={f("team")} placeholder="Ex.: Operações, Comercial, TI..."
              style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,color:"var(--text)",fontSize:14,outline:"none"}}
              onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
          </FormCard>
          <FormCard label="Descrição da demanda" error={errors.description}>
            <textarea value={form.description} onChange={f("description")} rows={6} placeholder="Descreva detalhadamente o que precisa ser feito..."
              style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:`1px solid ${errors.description?"#ef4444":"var(--border)"}`,borderRadius:10,color:"var(--text)",fontSize:14,outline:"none",resize:"vertical",lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor=accent} onBlur={e=>e.target.style.borderColor=errors.description?"#ef4444":"var(--border)"}/>
          </FormCard>
          <FormCard label="Anexos (opcional)">
            <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed var(--border)",borderRadius:10,padding:24,textAlign:"center",cursor:"pointer",transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.background=SQUAD_COLORS[form.squad].light;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="transparent";}}>
              <div style={{fontSize:28,marginBottom:8}}>📎</div>
              <div style={{fontSize:13,color:"var(--muted)"}}>Clique para selecionar arquivos</div>
              <input ref={fileRef} type="file" multiple onChange={e=>setFiles(p=>[...p,...Array.from(e.target.files).map(f=>({name:f.name,size:f.size}))])} style={{display:"none"}}/>
            </div>
            {files.length>0&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>{files.map((fl,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"var(--surface)",borderRadius:8,fontSize:12}}>
                <span>📄 {fl.name}</span><span style={{color:"var(--muted)"}}>{(fl.size/1024).toFixed(0)}KB</span>
                <button onClick={()=>setFiles(p=>p.filter((_,idx)=>idx!==i))} style={{background:"none",border:"none",color:"#ef4444",fontSize:14}}>×</button>
              </div>
            ))}</div>}
          </FormCard>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <FormCard label="Squad responsável">
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {SQUADS.map(s=>{ const c=SQUAD_COLORS[s]; const sel=form.squad===s; return(
                <button key={s} onClick={()=>setForm(p=>({...p,squad:s}))} style={{padding:"12px 16px",border:`1px solid ${sel?c.accent:"var(--border)"}`,borderRadius:10,background:sel?c.light:"var(--surface)",color:sel?c.accent:"var(--muted)",fontSize:13,fontWeight:sel?600:400,textAlign:"left",transition:"all .15s",display:"flex",alignItems:"center",gap:8}}>
                  <span>{SQUAD_ICONS[s]}</span>{SQUAD_LABELS[s]}{sel&&<span style={{marginLeft:"auto",fontSize:10,fontFamily:"var(--mono)"}}>● selecionado</span>}
                </button>
              );})}
            </div>
          </FormCard>
          <FormCard label="Prioridade">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {Object.entries(PRIO_LABELS).map(([k,v])=>{ const sel=form.priority===k; const col=PRIO_COLORS[k]; return(
                <button key={k} onClick={()=>setForm(p=>({...p,priority:k}))} style={{padding:"10px 8px",border:`1px solid ${sel?col:"var(--border)"}`,borderRadius:10,background:sel?`${col}18`:"var(--surface)",color:sel?col:"var(--muted)",fontSize:12,fontWeight:sel?600:400,transition:"all .15s"}}>
                  {k==="critica"?"🔴":k==="alta"?"🟠":k==="media"?"🟡":"🟢"} {v}
                </button>
              );})}
            </div>
          </FormCard>
          <FormCard label="Tipo de demanda">
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {Object.entries(TAG_LABELS).map(([k,v])=>{ const sel=form.tag===k; const {color,bg,border}=TAG_COLORS[k]; return(
                <button key={k} onClick={()=>setForm(p=>({...p,tag:k}))} style={{padding:"11px 16px",border:`1px solid ${sel?border:"var(--border)"}`,borderRadius:10,background:sel?bg:"var(--surface)",color:sel?color:"var(--muted)",fontSize:13,fontWeight:sel?600:400,textAlign:"left",transition:"all .15s",display:"flex",alignItems:"center",gap:8}}>
                  <span>{TAG_ICONS[k]}</span>{v}{sel&&<span style={{marginLeft:"auto",fontSize:10,fontFamily:"var(--mono)",opacity:.7}}>● selecionado</span>}
                </button>
              );})}
            </div>
          </FormCard>
          <div style={{padding:16,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,fontSize:12}}>
            <div style={{color:"var(--muted)",marginBottom:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",fontSize:11}}>Resumo</div>
            <SummaryRow icon="👤" label="Solicitante" value={user.name}/>
            <SummaryRow icon="🏷️" label="Time" value={form.team||"—"} color={form.team?"var(--text)":"var(--muted)"}/>
            <SummaryRow icon={SQUAD_ICONS[form.squad]} label="Squad" value={SQUAD_LABELS[form.squad]} color={SQUAD_COLORS[form.squad].accent}/>
            <SummaryRow icon="⚡" label="Prioridade" value={PRIO_LABELS[form.priority]} color={PRIO_COLORS[form.priority]}/>
            <SummaryRow icon={TAG_ICONS[form.tag]} label="Tipo" value={TAG_LABELS[form.tag]} color={TAG_COLORS[form.tag].color}/>
          </div>
          <button onClick={submit} style={{padding:"14px",border:"none",borderRadius:12,fontSize:14,fontWeight:700,background:`linear-gradient(135deg,${accent},${accent}88)`,color:"#fff",transition:"opacity .15s",boxShadow:`0 4px 20px ${SQUAD_COLORS[form.squad].glow}`}}
            onMouseOver={e=>e.currentTarget.style.opacity=".88"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>
            Enviar Demanda →
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT QUEUE VIEW
// ══════════════════════════════════════════════════════════════════════════════
function SprintQueueView({demands,sprintOverrides={}}){
  const [activeSquad,setActiveSquad]=useState("industria");
  const {accent}=SQUAD_COLORS[activeSquad];
  const sq=demands.filter(d=>d.squad===activeSquad);
  const approved=sq.filter(d=>d.status==="aprovada"&&d.sprint);
  const backlog=sq.filter(d=>d.status==="pendente");
  const rejected=sq.filter(d=>d.status==="rejeitada");
  const sprints=[...new Set(approved.map(d=>d.sprint))].sort((a,b)=>a-b);
  const cur=currentSprint();

  return(
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-.5px"}}>Filas por Sprint</h1>
        <p style={{color:"var(--muted)",fontSize:14,marginTop:4}}>Sprint atual: <span style={{color:accent,fontWeight:600}}>Sprint {cur}</span> <span style={{fontFamily:"var(--mono)",fontSize:12}}>({fmtSprintRange(cur,sprintOverrides)})</span></p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:28}}>
        {SQUADS.map(s=>{ const {accent:a,light:l}=SQUAD_COLORS[s]; const active=s===activeSquad; const cnt=demands.filter(d=>d.squad===s).length; return(
          <button key={s} className="squad-tab" onClick={()=>setActiveSquad(s)} style={{padding:"10px 20px",border:`1px solid ${active?a:"var(--border)"}`,borderRadius:10,background:active?l:"var(--card)",color:active?a:"var(--muted)",fontSize:13,fontWeight:active?700:400,transition:"all .2s",display:"flex",alignItems:"center",gap:8}}>
            <span>{SQUAD_ICONS[s]}</span>{SQUAD_LABELS[s]}<span style={{padding:"2px 8px",borderRadius:999,background:active?`${a}22`:"rgba(255,255,255,.05)",fontSize:11,fontFamily:"var(--mono)",color:active?a:"var(--muted)"}}>{cnt}</span>
          </button>
        );})}
      </div>
      {sprints.length===0&&backlog.length===0&&rejected.length===0
        ?<EmptyState icon="📭" title="Nenhuma demanda nesta squad" sub="Envie uma nova demanda para começar"/>
        :<div style={{display:"flex",flexDirection:"column",gap:32}}>
          {sprints.map(sp=>(
            <SprintSection key={sp} sprint={sp} cur={cur} demands={approved.filter(d=>d.sprint===sp)} accent={accent} sprintOverrides={sprintOverrides}/>
          ))}
          {backlog.length>0&&<div><SectionHeader color="#94a3b8" label="⏳ Aguardando Aprovação" count={backlog.length}/><div style={{display:"flex",flexDirection:"column",gap:10}}>{backlog.sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map((d,i)=><DemandCard key={d.id} demand={d} index={i} accent="#94a3b8" sprintOverrides={sprintOverrides}/>)}</div></div>}
          {rejected.length>0&&<div><SectionHeader color="#f87171" label="❌ Rejeitadas" count={rejected.length}/><div style={{display:"flex",flexDirection:"column",gap:10}}>{rejected.map((d,i)=><DemandCard key={d.id} demand={d} index={i} accent="#f87171" sprintOverrides={sprintOverrides}/>)}</div></div>}
        </div>
      }
    </div>
  );
}
function SectionHeader({color,label,count}){
  return(<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><div style={{padding:"4px 14px",borderRadius:999,background:`${color}10`,border:`1px solid ${color}33`,fontSize:12,fontWeight:700,color}}>{label}</div><span style={{fontSize:12,color:"var(--muted)"}}>· {count} demanda(s)</span></div>);
}
function SprintSection({sprint,cur,demands,accent,sprintOverrides={}}){
  const isCurrent=sprint===cur,isPast=sprint<cur;
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{padding:"5px 16px",borderRadius:999,border:`1px solid ${isCurrent?`${accent}66`:"var(--border)"}`,background:isCurrent?`${accent}14`:"var(--surface)",fontSize:13,fontWeight:700,color:isCurrent?accent:"var(--muted)",display:"flex",alignItems:"center",gap:8}}>
          {isCurrent&&<span style={{width:7,height:7,borderRadius:"50%",background:accent,display:"inline-block",animation:"pulse 2s infinite"}}/>}
          Sprint {sprint} · {isCurrent?"Em andamento":isPast?"Concluída":"Futura"}
          {sprintOverrides[sprint]&&<span style={{fontSize:10,color:"#fbbf24",marginLeft:4}}>📌 editada</span>}
        </div>
        <span style={{fontSize:12,color:"var(--muted)",fontFamily:"var(--mono)"}}>{fmtSprintRange(sprint,sprintOverrides)}</span>
        <span style={{fontSize:12,color:"var(--muted)"}}>· {demands.length} demanda(s)</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[...demands].sort((a,b)=>PRIO_ORDER(a.priority)-PRIO_ORDER(b.priority)).map((d,i)=><DemandCard key={d.id} demand={d} index={i} accent={accent} sprintOverrides={sprintOverrides}/>)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEMAND CARD
// ══════════════════════════════════════════════════════════════════════════════
function DemandCard({demand,index,accent,sprintOverrides={}}){
  const [open,setOpen]=useState(false);
  const pColor=PRIO_COLORS[demand.priority]; const sm=STATUS_META[demand.status]||STATUS_META.pendente; const tc=demand.tag?TAG_COLORS[demand.tag]:null;
  const createdAt=demand.created_at||demand.createdAt;
  return(
    <div className="card-hover" onClick={()=>setOpen(p=>!p)} style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",transition:"all .2s",animation:`fadeIn .3s ease ${index*.04}s both`,cursor:"pointer"}}>
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:34,height:34,borderRadius:9,background:`${accent}18`,border:`1px solid ${accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:11,fontWeight:700,color:accent,flexShrink:0}}>#{String(index+1).padStart(2,"00")}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{demand.title}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--muted)",flexWrap:"wrap"}}>
            <span>👤 {demand.user_name||demand.userName}</span>
            {demand.team&&<span>🏷️ {demand.team}</span>}
            <span>🕐 {fmt(createdAt)}</span>
          </div>
        </div>
        <Badge label={PRIO_LABELS[demand.priority]} color={pColor}/>
        {tc&&<Badge label={TAG_LABELS[demand.tag]} color={tc.color} bg={tc.bg} border={tc.border} icon={TAG_ICONS[demand.tag]}/>}
        <Badge label={sm.label} color={sm.color} bg={sm.bg} icon={sm.icon}/>
        <div style={{color:"var(--muted)",fontSize:11,transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}>▼</div>
      </div>
      {open&&(
        <div style={{padding:"0 18px 18px",borderTop:`1px solid ${accent}22`}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:14,background:"var(--surface)",borderRadius:10,marginTop:12}}>
            <div style={{fontSize:11,color:"var(--muted)",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Descrição</div>
            <p style={{fontSize:13,lineHeight:1.7}}>{demand.description}</p>
          </div>
          {(demand.admin_note||demand.adminNote)&&(
            <div style={{padding:14,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,marginTop:10}}>
              <div style={{fontSize:11,color:"#818cf8",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>📝 Nota do Gestor</div>
              <p style={{fontSize:13,lineHeight:1.7,color:"#c7d2fe"}}>{demand.admin_note||demand.adminNote}</p>
            </div>
          )}
          <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
            <div style={{padding:"4px 10px",background:`${accent}12`,border:`1px solid ${accent}33`,borderRadius:6,fontSize:11,color:accent,fontFamily:"var(--mono)"}}>ID: {demand.id}</div>
            {demand.sprint&&<div style={{padding:"4px 10px",background:"rgba(14,165,233,.1)",border:"1px solid rgba(14,165,233,.3)",borderRadius:6,fontSize:11,color:"#38bdf8",fontFamily:"var(--mono)"}}>Sprint {demand.sprint} · {fmtSprintRange(demand.sprint,sprintOverrides)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MY DEMANDS VIEW
// ══════════════════════════════════════════════════════════════════════════════
function MyDemandsView({demands,sprintOverrides={}}){
  const sorted=[...demands].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt));
  return(
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{marginBottom:24}}><h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-.5px"}}>Minhas Demandas</h1><p style={{color:"var(--muted)",fontSize:14,marginTop:4}}>{sorted.length} solicitação(ões)</p></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:28}}>
        {["pendente","aprovada","rejeitada"].map(s=>{ const sm=STATUS_META[s]; const cnt=demands.filter(d=>d.status===s).length; return(
          <div key={s} style={{padding:20,background:"var(--card)",border:`1px solid ${sm.color}33`,borderRadius:14}}>
            <div style={{fontSize:24,marginBottom:6}}>{sm.icon}</div>
            <div style={{fontSize:28,fontWeight:700,color:sm.color}}>{cnt}</div>
            <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{sm.label}</div>
          </div>
        );})}
      </div>
      {sorted.length===0?<EmptyState icon="📂" title="Nenhuma demanda enviada" sub="Clique em + Nova Demanda para começar"/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>{sorted.map((d,i)=><DemandCard key={d.id} demand={d} index={i} accent={SQUAD_COLORS[d.squad]?.accent||"#94a3b8"} sprintOverrides={sprintOverrides}/>)}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════════════════════════════════════════════
function AdminPanel({demands,config={},backlog=[],isAdmin=false,onApprove,onSaveConfig,onSaveBacklog}){
  const [tab,setTab]=useState("pending");
  const [users,setUsers]=useState([]);
  const pending=demands.filter(d=>d.status==="pendente");
  const approved=demands.filter(d=>d.status==="aprovada");
  const rejected=demands.filter(d=>d.status==="rejeitada");

  useEffect(()=>{
    if(isAdmin) db_getAllProfiles().then(setUsers);
  },[isAdmin]);

  async function handleRoleChange(userId, newRole){
    await db_upsertProfile({...(users.find(u=>u.id===userId)||{}), id:userId, role:newRole, updated_at:new Date().toISOString()});
    setUsers(p=>p.map(u=>u.id===userId?{...u,role:newRole}:u));
  }

  const tabs=[
    {id:"pending", label:"Pendentes",  count:pending.length,  color:"#f97316", adminOnly:false},
    {id:"approved",label:"Aprovadas",  count:approved.length, color:"#4ade80", adminOnly:false},
    {id:"rejected",label:"Rejeitadas", count:rejected.length, color:"#f87171", adminOnly:false},
    {id:"users",   label:"👥 Usuários", count:null,            color:"#a78bfa", adminOnly:true},
    {id:"backlog", label:"📦 Backlog",  count:null,            color:"#34d399", adminOnly:true},
    {id:"sprints", label:"📅 Sprints",  count:null,            color:"#fbbf24", adminOnly:true},
    {id:"config",  label:"⚙ E-mail",   count:null,            color:"#818cf8", adminOnly:true},
    {id:"auth",    label:"🔐 Auth",     count:null,            color:"#f472b6", adminOnly:true},
  ].filter(t=>!t.adminOnly||isAdmin);

  const list=tab==="pending"?pending:tab==="approved"?approved:tab==="rejected"?rejected:[];
  const overrides=config.sprintOverrides||{};

  return(
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{marginBottom:24}}><h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-.5px"}}>Painel de Aprovação</h1><p style={{color:"var(--muted)",fontSize:14,marginTop:4}}>Gerencie demandas, sprints, backlog e configurações.</p></div>
      <div style={{display:"flex",gap:8,marginBottom:28,flexWrap:"wrap"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"9px 18px",border:`1px solid ${tab===t.id?t.color+"55":"var(--border)"}`,borderRadius:10,background:tab===t.id?`${t.color}12`:"var(--card)",color:tab===t.id?t.color:"var(--muted)",fontSize:13,fontWeight:tab===t.id?700:400,transition:"all .2s",display:"flex",alignItems:"center",gap:8}}>
            {t.label}{t.count!==null&&<span style={{padding:"1px 7px",borderRadius:999,background:tab===t.id?`${t.color}22`:"rgba(255,255,255,.05)",fontSize:11,fontFamily:"var(--mono)"}}>{t.count}</span>}
          </button>
        ))}
      </div>
      {tab==="config"  && <EmailConfigPanel config={config.emailConfig||{}} onSave={c=>onSaveConfig({emailConfig:c})}/>}
      {tab==="auth"    && <AuthConfigPanel config={config.authConfig||{}} onSave={c=>onSaveConfig({authConfig:c})}/>}
      {tab==="sprints" && <SprintManagerPanel overrides={overrides} onSave={o=>onSaveConfig({sprintOverrides:o})}/>}
      {tab==="backlog" && <BacklogPanel items={backlog} onSave={onSaveBacklog}/>}
      {tab==="users"   && <UserManagementPanel users={users} onRoleChange={handleRoleChange}/>}
      {(tab==="pending"||tab==="approved"||tab==="rejected")&&(
        list.length===0?<EmptyState icon={tab==="pending"?"⏳":tab==="approved"?"✅":"❌"} title={`Nenhuma demanda ${tabs.find(t=>t.id===tab)?.label.toLowerCase()}`} sub=""/>
        :<div style={{display:"flex",flexDirection:"column",gap:14}}>{[...list].sort((a,b)=>new Date(b.created_at||b.createdAt)-new Date(a.created_at||a.createdAt)).map(d=>(
          <AdminDemandCard key={d.id} demand={d} sprintOverrides={overrides} onApprove={onApprove} canAct={tab==="pending"}/>
        ))}</div>
      )}
    </div>
  );
}

function AdminDemandCard({demand,onApprove,canAct,sprintOverrides={}}){
  const [open,setOpen]=useState(false); const [actionOpen,setActionOpen]=useState(false);
  const [sprint,setSprint]=useState(currentSprint()); const [note,setNote]=useState(""); const [loading,setLoading]=useState(false);
  const {accent}=SQUAD_COLORS[demand.squad]; const pColor=PRIO_COLORS[demand.priority];
  const cur=currentSprint(); const next=cur+1;

  async function act(status){ setLoading(true); await onApprove({demandId:demand.id,status,sprint,adminNote:note}); setLoading(false); setActionOpen(false); }

  return(
    <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
      <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setOpen(p=>!p)}>
        <div style={{width:36,height:36,borderRadius:10,background:`${accent}18`,border:`1px solid ${accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{SQUAD_ICONS[demand.squad]}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{demand.title}</div>
          <div style={{display:"flex",gap:10,fontSize:11,color:"var(--muted)",flexWrap:"wrap"}}>
            <span>👤 {demand.user_name||demand.userName}</span>
            {demand.team&&<span>🏷️ {demand.team}</span>}
            <span style={{color:accent}}>● {SQUAD_LABELS[demand.squad]}</span>
            <span>🕐 {fmt(demand.created_at||demand.createdAt)}</span>
          </div>
        </div>
        <Badge label={PRIO_LABELS[demand.priority]} color={pColor}/>
        {demand.tag&&<Badge label={TAG_LABELS[demand.tag]} color={TAG_COLORS[demand.tag].color} bg={TAG_COLORS[demand.tag].bg} border={TAG_COLORS[demand.tag].border} icon={TAG_ICONS[demand.tag]}/>}
        {canAct&&<button onClick={e=>{e.stopPropagation();setActionOpen(p=>!p);}} style={{padding:"7px 16px",border:`1px solid ${actionOpen?"#6366f1":"var(--border)"}`,borderRadius:9,background:actionOpen?"rgba(99,102,241,.15)":"var(--surface)",color:actionOpen?"#818cf8":"var(--muted)",fontSize:12,fontWeight:600,transition:"all .15s"}}>{actionOpen?"Fechar ✕":"Avaliar →"}</button>}
        <div style={{color:"var(--muted)",fontSize:11,transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}>▼</div>
      </div>
      {open&&<div style={{padding:"0 20px 16px",borderTop:"1px solid var(--border)"}} onClick={e=>e.stopPropagation()}><div style={{padding:14,background:"var(--surface)",borderRadius:10,marginTop:12}}><div style={{fontSize:11,color:"var(--muted)",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:".5px"}}>Descrição</div><p style={{fontSize:13,lineHeight:1.7}}>{demand.description}</p></div></div>}
      {actionOpen&&(
        <div style={{padding:"18px 20px",borderTop:"1px solid rgba(99,102,241,.2)",background:"rgba(99,102,241,.04)",animation:"fadeIn .2s ease"}} onClick={e=>e.stopPropagation()}>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--muted)",marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>Alocar na sprint</div>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <button onClick={()=>setSprint(cur)} style={{flex:1,padding:"13px 10px",border:`2px solid ${sprint===cur?"#00c9a7":"var(--border)"}`,borderRadius:10,background:sprint===cur?"rgba(0,201,167,.12)":"var(--surface)",color:sprint===cur?"#00c9a7":"var(--muted)",fontSize:13,fontWeight:700,transition:"all .15s"}}>
                <div style={{fontSize:16,marginBottom:3}}>⚡</div><div>Sprint Atual</div>
                <div style={{fontSize:10,fontFamily:"var(--mono)",opacity:.8,marginTop:2}}>#{cur} · {fmtSprintRange(cur,sprintOverrides)}</div>
              </button>
              <button onClick={()=>setSprint(next)} style={{flex:1,padding:"13px 10px",border:`2px solid ${sprint===next?"#6366f1":"var(--border)"}`,borderRadius:10,background:sprint===next?"rgba(99,102,241,.12)":"var(--surface)",color:sprint===next?"#818cf8":"var(--muted)",fontSize:13,fontWeight:700,transition:"all .15s"}}>
                <div style={{fontSize:16,marginBottom:3}}>📅</div><div>Próxima Sprint</div>
                <div style={{fontSize:10,fontFamily:"var(--mono)",opacity:.8,marginTop:2}}>#{next} · {fmtSprintRange(next,sprintOverrides)}</div>
              </button>
            </div>
            <details style={{fontSize:12,color:"var(--muted)"}}>
              <summary style={{cursor:"pointer",padding:"6px 0",userSelect:"none"}}>Outra sprint →</summary>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8,maxHeight:180,overflowY:"auto"}}>
                {buildSprintOptions(8).filter(sp=>sp!==cur&&sp!==next).map(sp=>(
                  <button key={sp} onClick={()=>setSprint(sp)} style={{padding:"8px 12px",border:`1px solid ${sprint===sp?"#6366f1":"var(--border)"}`,borderRadius:8,background:sprint===sp?"rgba(99,102,241,.15)":"var(--surface)",color:sprint===sp?"#818cf8":"var(--muted)",fontSize:12,fontWeight:sprint===sp?700:400,textAlign:"left",transition:"all .15s",display:"flex",justifyContent:"space-between"}}>
                    <span>Sprint {sp}{sprintOverrides[sp]&&<span style={{fontSize:9,color:"#fbbf24",marginLeft:4}}>📌</span>}</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:10,opacity:.65}}>{fmtSprintRange(sp,sprintOverrides)}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:600,color:"var(--muted)",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Nota para o solicitante</div>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={4} placeholder="Ex.: Demanda aceita! Entrará na sprint atual."
              style={{width:"100%",padding:"10px 12px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:13,outline:"none",resize:"none",lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>act("aprovada")} disabled={loading} style={{flex:1,padding:"12px",border:"1px solid rgba(74,222,128,.4)",borderRadius:10,background:"rgba(74,222,128,.12)",color:"#4ade80",fontSize:13,fontWeight:700,opacity:loading?.6:1}}>
              {loading?<Spinner/>:"✅ Aprovar → Sprint "+sprint}
            </button>
            <button onClick={()=>act("rejeitada")} disabled={loading} style={{flex:1,padding:"12px",border:"1px solid rgba(248,113,113,.35)",borderRadius:10,background:"rgba(248,113,113,.08)",color:"#f87171",fontSize:13,fontWeight:700,opacity:loading?.6:1}}>
              {loading?<Spinner/>:"❌ Rejeitar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT PANEL  (admin only)
// ══════════════════════════════════════════════════════════════════════════════
function UserManagementPanel({ users=[], onRoleChange }) {
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState({});

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function changeRole(userId, newRole) {
    setSaving(p=>({...p,[userId]:true}));
    await onRoleChange(userId, newRole);
    setSaving(p=>({...p,[userId]:false}));
  }

  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>Gerenciar Usuários</div>
          <div style={{fontSize:13,color:"var(--muted)"}}>{users.length} usuário(s) cadastrado(s)</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..."
          style={{padding:"9px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:9,color:"var(--text)",fontSize:13,outline:"none",width:280}}
          onFocus={e=>e.target.style.borderColor="#a78bfa"} onBlur={e=>e.target.style.borderColor="var(--border)"}/>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        {Object.entries(ROLE_META).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,background:v.bg,border:`1px solid ${v.border}`,fontSize:12,fontWeight:600,color:v.color}}>
            <span>{v.icon}</span>{v.label}
            {k==="moderador"&&<span style={{fontSize:10,opacity:.7}}>· pode aprovar/rejeitar</span>}
            {k==="admin"&&<span style={{fontSize:10,opacity:.7}}>· acesso total</span>}
          </div>
        ))}
      </div>

      {filtered.length===0
        ? <EmptyState icon="👥" title="Nenhum usuário encontrado" sub=""/>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map((u,i)=>{
              const rm=ROLE_META[u.role]||ROLE_META.user;
              const isProtected=ADMIN_EMAILS.includes(u.email);
              return(
                <div key={u.id} className="card-hover" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",gap:14,animation:`fadeIn .25s ease ${i*.03}s both`,transition:"all .2s"}}>
                  {/* Avatar */}
                  <div style={{width:42,height:42,borderRadius:11,background:"linear-gradient(135deg,#1e3a5f,#2d5a8e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0,overflow:"hidden"}}>
                    {u.avatar_url?<img src={u.avatar_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(u.name||u.email||"?").charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:2,display:"flex",alignItems:"center",gap:8}}>
                      {u.name||"Sem nome"}
                      {isProtected&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:999,background:"rgba(99,102,241,.2)",border:"1px solid rgba(99,102,241,.4)",color:"#818cf8",fontWeight:700}}>🔒 protegido</span>}
                    </div>
                    <div style={{fontSize:12,color:"var(--muted)",display:"flex",gap:10,flexWrap:"wrap"}}>
                      <span>✉️ {u.email}</span>
                      {u.job_title&&<span>💼 {u.job_title}</span>}
                      {u.team&&<span>🏷️ {u.team}</span>}
                    </div>
                  </div>

                  {/* Current role badge */}
                  <div style={{padding:"4px 12px",borderRadius:999,background:rm.bg,border:`1px solid ${rm.border}`,fontSize:12,fontWeight:700,color:rm.color,flexShrink:0}}>
                    {rm.icon} {rm.label}
                  </div>

                  {/* Role selector — disabled for protected accounts */}
                  {!isProtected && (
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      {Object.entries(ROLE_META).map(([role,meta])=>{
                        const isCurrent=u.role===role||(!u.role&&role==="user");
                        return(
                          <button key={role} onClick={()=>!isCurrent&&changeRole(u.id,role)}
                            disabled={isCurrent||saving[u.id]}
                            style={{padding:"6px 12px",border:`1px solid ${isCurrent?meta.border:"var(--border)"}`,borderRadius:8,background:isCurrent?meta.bg:"var(--surface)",color:isCurrent?meta.color:"var(--muted)",fontSize:11,fontWeight:isCurrent?700:400,transition:"all .15s",cursor:isCurrent?"default":"pointer",opacity:saving[u.id]?.6:1}}>
                            {saving[u.id]&&!isCurrent?<Spinner/>:<>{meta.icon} {meta.label}</>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BACKLOG PANEL
// ══════════════════════════════════════════════════════════════════════════════
function BacklogPanel({items=[],onSave}){
  const [list,setList]=useState(items); const [adding,setAdding]=useState(null); const [editId,setEditId]=useState(null);
  const [reveal,setReveal]=useState({}); const [filter,setFilter]=useState("all");
  const blank=t=>({id:genId(),type:t,title:"",login:"",password:"",notes:"",status:"pendente",created_at:new Date().toISOString()});
  const [form,setForm]=useState(blank("account"));
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));

  function startAdd(t){ setForm(blank(t)); setAdding(t); setEditId(null); }
  function startEdit(item){ setForm({...item}); setEditId(item.id); setAdding(item.type); }

  async function save(){
    if(!form.title.trim()) return;
    await db_upsertBacklogItem(form);
    let next; if(editId) next=list.map(i=>i.id===editId?{...form}:i); else next=[...list,{...form}];
    setList(next); onSave(next); setAdding(null); setEditId(null);
  }
  async function remove(id){ await db_deleteBacklogItem(id); const next=list.filter(i=>i.id!==id); setList(next); onSave(next); }
  async function updateStatus(id,status){ await db_upsertBacklogItem({...list.find(i=>i.id===id),status}); const next=list.map(i=>i.id===id?{...i,status}:i); setList(next); onSave(next); }

  const displayed=filter==="all"?list:list.filter(i=>i.type===filter);
  const acC=list.filter(i=>i.type==="account").length, rqC=list.filter(i=>i.type==="request").length;

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",gap:8}}>
          {[["all","Todos",acC+rqC],["account","🔑 Contas",acC],["request","📋 Solicitações",rqC]].map(([v,l,c])=>(
            <button key={v} onClick={()=>setFilter(v)} style={{padding:"7px 14px",border:`1px solid ${filter===v?"#34d399":"var(--border)"}`,borderRadius:9,background:filter===v?"rgba(52,211,153,.12)":"var(--card)",color:filter===v?"#34d399":"var(--muted)",fontSize:12,fontWeight:filter===v?700:400,transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>
              {l}<span style={{fontFamily:"var(--mono)",fontSize:10,opacity:.8}}>{c}</span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>startAdd("account")} style={{padding:"8px 16px",border:"1px solid rgba(52,211,153,.4)",borderRadius:9,background:"rgba(52,211,153,.1)",color:"#34d399",fontSize:12,fontWeight:600}}>+ Conta / Senha</button>
          <button onClick={()=>startAdd("request")} style={{padding:"8px 16px",border:"1px solid rgba(56,189,248,.4)",borderRadius:9,background:"rgba(56,189,248,.1)",color:"#38bdf8",fontSize:12,fontWeight:600}}>+ Solicitação</button>
        </div>
      </div>
      {adding&&(
        <div style={{padding:22,background:"var(--card)",border:`1px solid ${adding==="account"?"rgba(52,211,153,.3)":"rgba(56,189,248,.3)"}`,borderRadius:14,marginBottom:20,animation:"fadeIn .2s ease"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:16,color:adding==="account"?"#34d399":"#38bdf8"}}>{editId?"✏️ Editar":"+"} {adding==="account"?"Conta / Senha":"Solicitação Interna"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{gridColumn:"1/-1"}}><FormCard label="Título"><input value={form.title} onChange={f("title")} placeholder={adding==="account"?"Ex.: AWS Console":"Ex.: Renovar certificado SSL"} style={{width:"100%",padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:14,outline:"none"}} onFocus={e=>e.target.style.borderColor=adding==="account"?"#34d399":"#38bdf8"} onBlur={e=>e.target.style.borderColor="var(--border)"}/></FormCard></div>
            {adding==="account"&&<><FormCard label="Login / E-mail"><input value={form.login} onChange={f("login")} placeholder="usuario@empresa.com" style={{width:"100%",padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:13,outline:"none"}} onFocus={e=>e.target.style.borderColor="#34d399"} onBlur={e=>e.target.style.borderColor="var(--border)"}/></FormCard><FormCard label="Senha"><input value={form.password} onChange={f("password")} type="text" placeholder="••••••••••••" style={{width:"100%",padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:13,outline:"none",fontFamily:"var(--mono)"}} onFocus={e=>e.target.style.borderColor="#34d399"} onBlur={e=>e.target.style.borderColor="var(--border)"}/></FormCard></>}
            {adding==="request"&&<FormCard label="Status"><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{REQ_STATUS.map(s=><button key={s} onClick={()=>setForm(p=>({...p,status:s}))} style={{padding:"6px 12px",border:`1px solid ${form.status===s?REQ_STATUS_COLOR[s]:"var(--border)"}`,borderRadius:8,background:form.status===s?`${REQ_STATUS_COLOR[s]}18`:"var(--surface)",color:form.status===s?REQ_STATUS_COLOR[s]:"var(--muted)",fontSize:12,fontWeight:form.status===s?700:400,transition:"all .15s"}}>{s}</button>)}</div></FormCard>}
            <div style={{gridColumn:"1/-1"}}><FormCard label="Observações"><textarea value={form.notes} onChange={f("notes")} rows={3} placeholder="Informações adicionais..." style={{width:"100%",padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontSize:13,outline:"none",resize:"none",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=adding==="account"?"#34d399":"#38bdf8"} onBlur={e=>e.target.style.borderColor="var(--border)"}/></FormCard></div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button onClick={save} style={{padding:"10px 24px",border:"none",borderRadius:9,background:adding==="account"?"linear-gradient(135deg,#34d399,#10b981)":"linear-gradient(135deg,#38bdf8,#0ea5e9)",color:"#fff",fontSize:13,fontWeight:700}}>{editId?"Salvar":"Adicionar"}</button>
            <button onClick={()=>{setAdding(null);setEditId(null);}} style={{padding:"10px 18px",border:"1px solid var(--border)",borderRadius:9,background:"transparent",color:"var(--muted)",fontSize:13}}>Cancelar</button>
          </div>
        </div>
      )}
      {displayed.length===0?<EmptyState icon="📦" title="Backlog vazio" sub='Clique em "+ Conta / Senha" ou "+ Solicitação"'/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>{displayed.map((item,i)=>(
          <BacklogCard key={item.id} item={item} index={i} revealed={!!reveal[item.id]} onReveal={()=>setReveal(p=>({...p,[item.id]:!p[item.id]}))} onEdit={()=>startEdit(item)} onDelete={()=>remove(item.id)} onStatus={s=>updateStatus(item.id,s)}/>
        ))}</div>
      }
    </div>
  );
}
function BacklogCard({item,index,revealed,onReveal,onEdit,onDelete,onStatus}){
  const [open,setOpen]=useState(false);
  const isAccount=item.type==="account"; const accent=isAccount?"#34d399":"#38bdf8"; const statusColor=REQ_STATUS_COLOR[item.status]||"#94a3b8";
  return(
    <div className="card-hover" style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden",transition:"all .2s",animation:`fadeIn .25s ease ${index*.03}s both`}}>
      <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setOpen(p=>!p)}>
        <div style={{width:34,height:34,borderRadius:9,background:`${accent}18`,border:`1px solid ${accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{isAccount?"🔑":"📋"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{item.title}</div>
          <div style={{fontSize:11,color:"var(--muted)",display:"flex",gap:10}}>
            {isAccount&&item.login&&<span>👤 {item.login}</span>}
            {!isAccount&&<span style={{color:statusColor,fontWeight:600}}>● {item.status}</span>}
            <span>🕐 {fmt(item.created_at||item.createdAt)}</span>
          </div>
        </div>
        {!isAccount&&<select value={item.status} onChange={e=>{e.stopPropagation();onStatus(e.target.value);}} onClick={e=>e.stopPropagation()} style={{padding:"5px 10px",border:`1px solid ${statusColor}44`,borderRadius:7,background:`${statusColor}12`,color:statusColor,fontSize:11,fontWeight:700,outline:"none",cursor:"pointer"}}>{REQ_STATUS.map(s=><option key={s} value={s} style={{background:"var(--bg)",color:"var(--text)"}}>{s}</option>)}</select>}
        <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
          <button onClick={onEdit} style={{padding:"5px 10px",border:"1px solid var(--border)",borderRadius:7,background:"transparent",color:"var(--muted)",fontSize:11}} onMouseOver={e=>e.currentTarget.style.color="#38bdf8"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>✏️</button>
          <button onClick={onDelete} style={{padding:"5px 10px",border:"1px solid rgba(248,113,113,.2)",borderRadius:7,background:"transparent",color:"#f87171",fontSize:11}}>🗑</button>
        </div>
        <div style={{color:"var(--muted)",fontSize:11,transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}>▼</div>
      </div>
      {open&&(
        <div style={{padding:"0 18px 16px",borderTop:`1px solid ${accent}22`}} onClick={e=>e.stopPropagation()}>
          {isAccount&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
            <div style={{padding:12,background:"var(--surface)",borderRadius:9}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Login</div><div style={{fontFamily:"var(--mono)",fontSize:13}}>{item.login||"—"}</div></div>
            <div style={{padding:12,background:"var(--surface)",borderRadius:9}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,display:"flex",justifyContent:"space-between"}}><span>Senha</span><button onClick={onReveal} style={{background:"none",border:"none",color:"#38bdf8",fontSize:10,cursor:"pointer",fontWeight:600}}>{revealed?"🙈 Ocultar":"👁 Revelar"}</button></div><div style={{fontFamily:"var(--mono)",fontSize:13,color:revealed?"#4ade80":"var(--muted)",letterSpacing:revealed?".05em":"2px"}}>{revealed?item.password||"—":"••••••••••••"}</div></div>
          </div>}
          {item.notes&&<div style={{padding:12,background:"var(--surface)",borderRadius:9,marginTop:12}}><div style={{fontSize:10,color:"var(--muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginBottom:6}}>Observações</div><p style={{fontSize:13,lineHeight:1.7}}>{item.notes}</p></div>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SPRINT MANAGER
// ══════════════════════════════════════════════════════════════════════════════
function SprintManagerPanel({overrides={},onSave}){
  const cur=currentSprint(); const sprintNums=buildSprintOptions(10);
  function def(n){ const d=sprintDates(n,{}); return {start:toISODate(d.start),end:toISODate(d.end)}; }
  const [local,setLocal]=useState(()=>{ const i={}; sprintNums.forEach(n=>{ i[n]=overrides[n]?{start:overrides[n].start,end:overrides[n].end}:def(n); }); return i; });
  const [dirty,setDirty]=useState({});
  function change(n,field,val){ setLocal(p=>({...p,[n]:{...p[n],[field]:val}})); setDirty(p=>({...p,[n]:true})); }
  function reset(n){ setLocal(p=>({...p,[n]:def(n)})); setDirty(p=>({...p,[n]:true})); }
  function save(){ const r={}; sprintNums.forEach(n=>{ const d=def(n); if(local[n].start!==d.start||local[n].end!==d.end) r[n]={start:local[n].start,end:local[n].end}; }); onSave(r); }
  const hasChanges=Object.keys(dirty).some(n=>{ const d=def(Number(n)); return local[n]?.start!==d.start||local[n]?.end!==d.end; });
  return(
    <div style={{maxWidth:720}}>
      <div style={{padding:28,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>Gerenciar Datas das Sprints</div>
        <div style={{padding:"10px 14px",background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.2)",borderRadius:8,fontSize:12,color:"#fde68a",marginBottom:22}}>⚠ Alterar as datas não move demandas já aprovadas — apenas como são exibidas.</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 80px 60px",gap:12,padding:"6px 12px",fontSize:11,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".5px"}}><span>Sprint</span><span>Início</span><span>Fim</span><span>Status</span><span></span></div>
          {sprintNums.map(n=>{ const d=def(n); const isEdited=local[n]?.start!==d.start||local[n]?.end!==d.end; const isCur=n===cur; return(
            <div key={n} style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 80px 60px",gap:12,padding:"12px 14px",background:isCur?"rgba(0,201,167,.05)":"var(--surface)",border:`1px solid ${isEdited?"rgba(251,191,36,.3)":isCur?"rgba(0,201,167,.2)":"var(--border)"}`,borderRadius:10,alignItems:"center"}}>
              <div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13,color:isCur?"#00c9a7":"var(--text)"}}>Sprint {n}{isCur&&<div style={{fontSize:9,color:"#4ade80"}}>● atual</div>}</div>
              <input type="date" value={local[n]?.start||""} onChange={e=>change(n,"start",e.target.value)} style={{padding:"8px 10px",background:"var(--card)",border:`1px solid ${isEdited?"rgba(251,191,36,.4)":"var(--border)"}`,borderRadius:7,color:"var(--text)",fontSize:13,outline:"none",width:"100%"}} onFocus={e=>e.target.style.borderColor="#fbbf24"} onBlur={e=>e.target.style.borderColor=isEdited?"rgba(251,191,36,.4)":"var(--border)"}/>
              <input type="date" value={local[n]?.end||""} onChange={e=>change(n,"end",e.target.value)} style={{padding:"8px 10px",background:"var(--card)",border:`1px solid ${isEdited?"rgba(251,191,36,.4)":"var(--border)"}`,borderRadius:7,color:"var(--text)",fontSize:13,outline:"none",width:"100%"}} onFocus={e=>e.target.style.borderColor="#fbbf24"} onBlur={e=>e.target.style.borderColor=isEdited?"rgba(251,191,36,.4)":"var(--border)"}/>
              <div style={{fontSize:11,fontWeight:600,color:isEdited?"#fbbf24":"var(--muted)"}}>{isEdited?"📌 editada":"padrão"}</div>
              <button onClick={()=>reset(n)} title="Restaurar padrão" style={{padding:"6px 8px",border:"1px solid var(--border)",borderRadius:7,background:"transparent",color:"var(--muted)",fontSize:11,transition:"all .15s"}} onMouseOver={e=>e.currentTarget.style.color="#f87171"} onMouseOut={e=>e.currentTarget.style.color="var(--muted)"}>↺</button>
            </div>
          );})}
        </div>
        <button onClick={save} style={{marginTop:22,padding:"11px 28px",border:"none",borderRadius:10,background:hasChanges?"linear-gradient(135deg,#f59e0b,#fbbf24)":"rgba(255,255,255,.06)",color:hasChanges?"#1c1917":"var(--muted)",fontSize:13,fontWeight:700,transition:"all .15s",cursor:hasChanges?"pointer":"default"}}>
          {hasChanges?"💾 Salvar alterações":"Sem alterações pendentes"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL CONFIG
// ══════════════════════════════════════════════════════════════════════════════
function EmailConfigPanel({config,onSave}){
  const [form,setForm]=useState({serviceId:config.serviceId||"",templateId:config.templateId||"",publicKey:config.publicKey||""});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  return(
    <div style={{maxWidth:600}}>
      <div style={{padding:28,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>Configuração de E-mail via EmailJS</div>
        <p style={{fontSize:13,color:"var(--muted)",marginBottom:20,lineHeight:1.7}}>Crie uma conta gratuita em <a href="https://emailjs.com" target="_blank" rel="noreferrer" style={{color:"#38bdf8"}}>emailjs.com</a>, configure um serviço e um template, e cole as credenciais abaixo.</p>
        <div style={{padding:14,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,fontSize:12,color:"#c7d2fe",marginBottom:22,lineHeight:1.8}}>
          <strong style={{color:"#a5b4fc"}}>Variáveis do template:</strong><br/>
          {["to_name","to_email","demand_title","squad","sprint_label","sprint_range","status_label","admin_note","temp_password"].map(v=>(
            <code key={v} style={{fontFamily:"var(--mono)",color:"#818cf8",marginRight:8}}>{`{{${v}}}`}</code>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Field label="Service ID" value={form.serviceId} onChange={f("serviceId")} placeholder="service_xxxxxxx" accent="#818cf8"/>
          <Field label="Template ID" value={form.templateId} onChange={f("templateId")} placeholder="template_xxxxxxx" accent="#818cf8"/>
          <Field label="Public Key" value={form.publicKey} onChange={f("publicKey")} placeholder="xxxxxxxxxxxxxxxxxxxx" accent="#818cf8"/>
        </div>
        <button onClick={()=>onSave(form)} style={{marginTop:22,padding:"11px 28px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",fontSize:13,fontWeight:700,transition:"opacity .15s"}} onMouseOver={e=>e.currentTarget.style.opacity=".85"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>Salvar</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH CONFIG
// ══════════════════════════════════════════════════════════════════════════════
function AuthConfigPanel({config={},onSave}){
  const [form,setForm]=useState({googleClientId:config.googleClientId||"",microsoftClientId:config.microsoftClientId||""});
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const redirectUri=window.location.origin+window.location.pathname;
  return(
    <div style={{maxWidth:640}}>
      <div style={{padding:28,background:"var(--card)",border:"1px solid var(--border)",borderRadius:16}}>
        <div style={{fontSize:17,fontWeight:700,marginBottom:16}}>Login Social — Google & Outlook</div>
        <div style={{padding:14,background:"rgba(244,114,182,.07)",border:"1px solid rgba(244,114,182,.2)",borderRadius:10,fontSize:12,color:"#fbcfe8",marginBottom:24,lineHeight:1.8}}>
          <strong style={{color:"#f472b6"}}>URI de Redirecionamento:</strong><br/>
          <code style={{fontFamily:"var(--mono)",color:"#e879f9",fontSize:13,wordBreak:"break-all"}}>{redirectUri}</code>
        </div>
        <div style={{padding:20,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><GoogleIcon/><div><div style={{fontWeight:700,fontSize:14}}>Google OAuth</div><div style={{fontSize:11,color:"var(--muted)"}}><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{color:"#4285f4"}}>console.cloud.google.com</a> → Credenciais → ID do cliente OAuth</div></div></div>
          <Field label="Google Client ID" value={form.googleClientId} onChange={f("googleClientId")} placeholder="xxxx.apps.googleusercontent.com" accent="#4285f4"/>
        </div>
        <div style={{padding:20,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><MicrosoftIcon/><div><div style={{fontWeight:700,fontSize:14}}>Microsoft (Outlook)</div><div style={{fontSize:11,color:"var(--muted)"}}><a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps" target="_blank" rel="noreferrer" style={{color:"#00a4ef"}}>portal.azure.com</a> → Registros de app → Plataforma Web</div></div></div>
          <Field label="Microsoft Client ID" value={form.microsoftClientId} onChange={f("microsoftClientId")} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" accent="#00a4ef"/>
        </div>
        <button onClick={()=>onSave(form)} style={{padding:"11px 28px",border:"none",borderRadius:10,background:"linear-gradient(135deg,#ec4899,#f472b6)",color:"#fff",fontSize:13,fontWeight:700,transition:"opacity .15s"}} onMouseOver={e=>e.currentTarget.style.opacity=".85"} onMouseOut={e=>e.currentTarget.style.opacity="1"}>Salvar configurações de Auth</button>
      </div>
    </div>
  );
}
