"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Image from "next/image";
import { useAuth } from "../lib/auth-context";
import { addComment, assignWorkItem, changeWorkItemStatus, createBug, createWorkItem, deleteWorkItem, getBugs, getComments, getDeveloperUsers, getMyAssignedWorkItems, getProjectMembers, getProjects, getWorkItemAttachments, getWorkItems, publishWorkItem, submitClientReview, updateWorkItem, uploadWorkItemAttachment } from "../lib/api/services";
import type { Priority, Project, ProjectMember, Role, User, WorkItem, WorkItemType } from "../types";
import type { AttachmentDto, Comment as ProcessComment } from "../lib/api/services";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/* ─── Styles ─────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

    :root {
      --bg:      #020509;
      --surface: #060b11;
      --card:    #080f1a;
      --teal:    #00d4c8;
      --cyan:    #22d3ee;
      --rose:    #fb7185;
      --amber:   #fbbf24;
      --violet:  #a78bfa;
      --green:   #34d399;
      --border:  rgba(0,212,200,0.14);
      --borderg: rgba(0,212,200,0.45);
      --t1:      #e2e8f0;
      --t2:      #7aa0b8;
      --t3:      #3d5a6e;
      --f-d:     'Outfit', sans-serif;
      --f-m:     'DM Mono', monospace;
    }

    /* ── mesh ── */
    .bp-mesh {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 70% 55% at 5%  15%,  rgba(0,212,200,0.11) 0%, transparent 60%),
        radial-gradient(ellipse 55% 45% at 95% 85%,  rgba(251,113,133,0.09) 0%, transparent 55%),
        radial-gradient(ellipse 45% 60% at 55% 50%,  rgba(167,139,250,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 35% 35% at 85% 8%,   rgba(34,211,238,0.08) 0%, transparent 50%),
        #020509;
      animation: bp-meshPulse 14s ease-in-out infinite alternate;
    }
    @keyframes bp-meshPulse {
      0%   { filter: hue-rotate(0deg) brightness(1); }
      50%  { filter: hue-rotate(12deg) brightness(1.04); }
      100% { filter: hue-rotate(-8deg) brightness(0.97); }
    }

    /* ── scanlines ── */
    .bp-scan {
      position: fixed; inset: 0; z-index: 1; pointer-events: none;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px);
    }

    /* ── grain ── */
    .bp-noise {
      position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 200px 200px;
      animation: bp-grain 0.4s steps(1) infinite;
    }
    @keyframes bp-grain {
      0%{background-position:0 0;} 25%{background-position:-30px 15px;} 50%{background-position:20px -10px;} 75%{background-position:-10px -25px;}
    }

    /* ── aurora streaks ── */
    .bp-streak { position:fixed; pointer-events:none; z-index:1; border-radius:100px; filter:blur(40px); animation:bp-streakDrift ease-in-out infinite alternate; }
    .bp-streak-1 { width:600px; height:3px; top:12%; left:-100px; background:linear-gradient(90deg,transparent,var(--teal),transparent); animation-duration:11s; animation-delay:0s; }
    .bp-streak-2 { width:450px; height:2px; top:55%; right:-80px; background:linear-gradient(90deg,transparent,var(--rose),transparent); animation-duration:14s; animation-delay:4s; }
    .bp-streak-3 { width:380px; height:2px; top:80%; left:20%; background:linear-gradient(90deg,transparent,var(--violet),transparent); animation-duration:9s; animation-delay:8s; }
    @keyframes bp-streakDrift { from{transform:translateX(-50px) scaleX(.75);opacity:.3;} to{transform:translateX(50px) scaleX(1.15);opacity:.8;} }

    /* ── floating dots ── */
    .bp-dot { position:fixed; border-radius:50%; pointer-events:none; z-index:1; animation:bp-dotFloat linear infinite; }
    @keyframes bp-dotFloat { 0%{transform:translateY(105vh) scale(0);opacity:0;} 6%{opacity:1;} 94%{opacity:.5;} 100%{transform:translateY(-8vh) scale(1.3);opacity:0;} }

    /* ── main content area font ── */
    .bp-main { font-family: var(--f-d); color: var(--t1); position:relative; z-index:3; }

    /* ── page title ── */
    .bp-page-title {
      font-size:26px; font-weight:900; letter-spacing:-0.5px; line-height:1;
      background: linear-gradient(135deg, #ffffff 0%, var(--teal) 55%, var(--cyan) 100%);
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      background-clip:text; background-size:200% 100%;
      animation: bp-titleShimmer 6s linear infinite;
    }
    @keyframes bp-titleShimmer { 0%,100%{background-position:0% 50%;} 50%{background-position:100% 50%;} }
    .bp-page-sub { font-size:12px; color:rgba(0,212,200,0.5); margin-top:4px; font-family:var(--f-m); letter-spacing:1px; }

    /* ── logo ring ── */
    .bp-logo-ring {
      border-radius:16px !important;
      border: 1px solid rgba(0,212,200,0.4) !important;
      background: linear-gradient(135deg, rgba(0,212,200,0.18), rgba(34,211,238,0.08)) !important;
      box-shadow: 0 0 28px rgba(0,212,200,0.25), inset 0 1px 0 rgba(255,255,255,0.07) !important;
      animation: bp-logoPulse 4s ease-in-out infinite !important;
      padding: 10px !important;
    }
    @keyframes bp-logoPulse {
      0%,100%{box-shadow:0 0 28px rgba(0,212,200,0.25),inset 0 1px 0 rgba(255,255,255,0.07);}
      50%{box-shadow:0 0 50px rgba(0,212,200,0.55),inset 0 1px 0 rgba(255,255,255,0.13);}
    }

    /* ── alerts ── */
    .bp-alert {
      padding:12px 16px; border-radius:13px; font-size:12px;
      display:flex; align-items:flex-start; gap:10px; margin-bottom:16px;
      animation:bp-alertIn .35s cubic-bezier(.22,1,.36,1);
      font-family:var(--f-m);
    }
    @keyframes bp-alertIn{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
    .bp-alert-error   { background:rgba(251,113,133,0.08); border:1px solid rgba(251,113,133,0.28); color:#fda4af; }
    .bp-alert-success { background:rgba(52,211,153,0.08);  border:1px solid rgba(52,211,153,0.28);  color:#6ee7b7; }

    /* ── glass card ── */
    .bp-card {
      background: linear-gradient(145deg, rgba(8,15,26,0.95), rgba(6,11,17,0.98));
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,200,0.03);
      position: relative; overflow: hidden;
      transition: border-color .3s;
    }
    .bp-card::before {
      content:''; position:absolute; top:0; left:15%; right:15%; height:1px;
      background:linear-gradient(90deg,transparent,var(--teal),var(--cyan),var(--teal),transparent);
      animation:bp-topBar 3.5s ease-in-out infinite alternate;
    }
    @keyframes bp-topBar { from{opacity:.5;filter:blur(0);} to{opacity:1;filter:blur(.5px);} }
    .bp-card:hover { border-color: rgba(0,212,200,0.26); }

    /* ── filter card (no top bar, simpler) ── */
    .bp-filter-card {
      background: linear-gradient(145deg, rgba(8,15,26,0.92), rgba(6,11,17,0.95));
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      position: relative;
    }

    /* ── labels ── */
    .bp-label {
      font-size:10px; font-weight:500; letter-spacing:1.5px;
      text-transform:uppercase; color:rgba(0,212,200,0.5);
      display:block; margin-bottom:8px; font-family:var(--f-m);
    }

    /* ── inputs / selects / textareas ── */
    .bp-input, .bp-select, .bp-textarea {
      width:100%; padding:11px 14px; border-radius:11px; font-size:13px;
      background:rgba(0,8,16,0.7); border:1px solid rgba(0,212,200,0.15);
      color:var(--t1); outline:none; transition:all .25s;
      font-family:var(--f-d);
    }
    .bp-input:focus, .bp-select:focus, .bp-textarea:focus {
      border-color:var(--teal);
      box-shadow:0 0 0 3px rgba(0,212,200,0.12), 0 0 20px rgba(0,212,200,0.07);
      background:rgba(0,212,200,0.04);
    }
    .bp-input::placeholder, .bp-textarea::placeholder { color:var(--t3); }
    .bp-select option { background:#080f1a; }
    .bp-textarea { resize:vertical; }
    .bp-input:disabled, .bp-select:disabled { opacity:.45; }

    /* ── inline select (table) ── */
    .bp-inline-select {
      padding:6px 10px; border-radius:9px; font-size:11px;
      background:rgba(0,8,16,0.8); border:1px solid rgba(0,212,200,0.15);
      color:var(--t1); outline:none; transition:all .2s;
      font-family:var(--f-d); min-width:140px;
    }
    .bp-inline-select:focus { border-color:var(--teal); box-shadow:0 0 0 2px rgba(0,212,200,0.1); }
    .bp-inline-select option { background:#080f1a; }
    .bp-inline-select:disabled { opacity:.45; }

    /* ── section title ── */
    .bp-section-title { font-size:16px; font-weight:700; color:var(--t1); }
    .bp-section-sub   { font-size:11px; color:var(--t3); font-family:var(--f-m); margin-top:2px; }

    /* ── buttons ── */
    .bp-btn {
      padding:10px 20px; border-radius:11px; font-size:13px; font-weight:700;
      border:none; cursor:pointer; transition:all .25s;
      font-family:var(--f-d); position:relative; overflow:hidden; white-space:nowrap;
    }
    .bp-btn::before {
      content:''; position:absolute; top:0; left:-100%; width:60%; height:100%;
      background:linear-gradient(110deg,transparent,rgba(255,255,255,0.12),transparent);
      transform:skewX(-20deg); transition:left .5s; pointer-events:none;
    }
    .bp-btn:hover::before { left:140%; }
    .bp-btn:disabled { opacity:.4; cursor:not-allowed; transform:none !important; }
    .bp-btn:not(:disabled):hover { transform:translateY(-1px); }

    .bp-btn-teal    { background:linear-gradient(135deg,#00b8ad,#00d4c8); color:#020509; box-shadow:0 4px 16px rgba(0,212,200,0.38); }
    .bp-btn-teal:not(:disabled):hover { box-shadow:0 6px 24px rgba(0,212,200,0.6); }
    .bp-btn-violet  { background:linear-gradient(135deg,#6d28d9,#a78bfa); color:#fff; box-shadow:0 4px 14px rgba(167,139,250,0.35); }
    .bp-btn-violet:not(:disabled):hover { box-shadow:0 6px 22px rgba(167,139,250,0.55); }
    .bp-btn-rose    { background:linear-gradient(135deg,#e11d48,#fb7185); color:#fff; box-shadow:0 4px 14px rgba(251,113,133,0.35); }
    .bp-btn-rose:not(:disabled):hover { box-shadow:0 6px 22px rgba(251,113,133,0.55); }
    .bp-btn-indigo  { background:linear-gradient(135deg,#4338ca,#6366f1); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,0.35); }
    .bp-btn-indigo:not(:disabled):hover { box-shadow:0 6px 22px rgba(99,102,241,0.55); }
    .bp-btn-orange  { background:linear-gradient(135deg,#c2410c,#f97316); color:#fff; box-shadow:0 4px 14px rgba(249,115,22,0.35); }
    .bp-btn-orange:not(:disabled):hover { box-shadow:0 6px 22px rgba(249,115,22,0.55); }
    .bp-btn-blue    { background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#fff; box-shadow:0 4px 14px rgba(59,130,246,0.35); }
    .bp-btn-blue:not(:disabled):hover { box-shadow:0 6px 22px rgba(59,130,246,0.55); }
    .bp-btn-sky     { background:linear-gradient(135deg,#0369a1,#0ea5e9); color:#fff; box-shadow:0 4px 14px rgba(14,165,233,0.35); }
    .bp-btn-sky:not(:disabled):hover { box-shadow:0 6px 22px rgba(14,165,233,0.55); }
    .bp-btn-green   { background:linear-gradient(135deg,#15803d,#22c55e); color:#020509; box-shadow:0 4px 14px rgba(34,197,94,0.35); }
    .bp-btn-green:not(:disabled):hover { box-shadow:0 6px 22px rgba(34,197,94,0.55); }
    .bp-btn-red     { background:linear-gradient(135deg,#b91c1c,#ef4444); color:#fff; box-shadow:0 4px 14px rgba(239,68,68,0.35); }
    .bp-btn-red:not(:disabled):hover { box-shadow:0 6px 22px rgba(239,68,68,0.55); }
    .bp-btn-sm      { padding:6px 12px; border-radius:8px; font-size:11px; }
    .bp-btn-full    { width:100%; padding:12px; }

    /* ── ghost outline button ── */
    .bp-btn-ghost {
      background:rgba(0,212,200,0.07); border:1px solid rgba(0,212,200,0.2);
      color:rgba(0,212,200,0.8); padding:10px 20px; border-radius:11px;
      font-size:13px; font-weight:700; cursor:pointer; transition:all .25s;
      font-family:var(--f-d);
    }
    .bp-btn-ghost:not(:disabled):hover {
      background:rgba(0,212,200,0.14); border-color:rgba(0,212,200,0.5); color:var(--teal);
      transform:translateY(-1px);
    }
    .bp-btn-ghost:disabled { opacity:.35; cursor:not-allowed; }

    /* ── publish banner ── */
    .bp-publish-banner {
      padding:14px 20px; border-radius:16px; margin-bottom:20px;
      display:flex; align-items:center; justify-content:space-between; gap:16px;
      background: linear-gradient(135deg, rgba(109,40,217,0.2), rgba(167,139,250,0.12));
      border: 1px solid rgba(167,139,250,0.3);
      box-shadow: 0 8px 30px rgba(109,40,217,0.18);
      animation: bp-fadeUp .5s cubic-bezier(.22,1,.36,1) both;
    }

    /* ── table wrapper ── */
    .bp-table-wrap {
      overflow-x: auto;
      /* custom scrollbar */
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.4) rgba(0,8,16,0.4);
    }
    .bp-table-wrap::-webkit-scrollbar { height: 6px; width: 6px; }
    .bp-table-wrap::-webkit-scrollbar-track { background: rgba(0,8,16,0.4); border-radius:4px; }
    .bp-table-wrap::-webkit-scrollbar-thumb { background: rgba(0,212,200,0.4); border-radius:4px; }
    .bp-table-wrap::-webkit-scrollbar-thumb:hover { background: rgba(0,212,200,0.65); }

    /* ── process steps scrollbox ── */
    .bp-process-scroll {
      max-height: 240px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.4) rgba(0,8,16,0.4);
    }
    .bp-process-scroll::-webkit-scrollbar { width:4px; }
    .bp-process-scroll::-webkit-scrollbar-track { background:rgba(0,8,16,0.4); border-radius:4px; }
    .bp-process-scroll::-webkit-scrollbar-thumb { background:rgba(0,212,200,0.4); border-radius:4px; }

    /* ── attachment table scroll ── */
    .bp-attach-scroll {
      overflow: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.4) rgba(0,8,16,0.4);
    }
    .bp-attach-scroll::-webkit-scrollbar { height:5px; width:5px; }
    .bp-attach-scroll::-webkit-scrollbar-track { background:rgba(0,8,16,0.4); border-radius:4px; }
    .bp-attach-scroll::-webkit-scrollbar-thumb { background:rgba(0,212,200,0.4); border-radius:4px; }

    /* ── table styles ── */
    .bp-table { width:100%; border-collapse:collapse; }
    .bp-table thead tr {
      background:rgba(0,212,200,0.05);
      border-bottom:1px solid rgba(0,212,200,0.12);
      position:sticky; top:0; z-index:10;
    }
    .bp-table th {
      padding:12px 16px; text-align:left; font-size:9px; font-weight:500;
      letter-spacing:1.5px; text-transform:uppercase;
      color:rgba(0,212,200,0.5); font-family:var(--f-m); white-space:nowrap;
    }
    .bp-table tbody tr { border-bottom:1px solid rgba(0,212,200,0.05); transition:background .15s; }
    .bp-table tbody tr:last-child { border-bottom:none; }
    .bp-table tbody tr:hover { background:rgba(0,212,200,0.03) !important; }
    .bp-table td { padding:13px 16px; font-size:13px; color:var(--t2); white-space:nowrap; }
    .bp-table-selected { background:rgba(0,212,200,0.08) !important; }
    .bp-table-alt     { background:rgba(255,255,255,0.015); }
    .bp-table-empty   { padding:50px 16px; text-align:center; color:var(--t3); }

    /* ── fade-up ── */
    @keyframes bp-fadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }

    /* ── loading ── */
    .bp-loading { display:flex; align-items:center; justify-content:center; height:100vh; background:#020509; font-family:var(--f-d); }
    .bp-spinner {
      width:28px; height:28px; border-radius:50%;
      border:2px solid rgba(0,212,200,0.15); border-top-color:var(--teal);
      animation:bp-spin .7s linear infinite; margin-right:14px;
    }
    @keyframes bp-spin { to{transform:rotate(360deg);} }

    /* ── process step entry ── */
    .bp-step {
      padding:10px 14px; border-radius:11px; margin-bottom:8px;
      background:rgba(0,212,200,0.05); border:1px solid rgba(0,212,200,0.15);
    }
    .bp-step:last-child { margin-bottom:0; }

    /* ── step number badge ── */
    .bp-step-num {
      width:22px; height:22px; border-radius:50%;
      background:rgba(0,212,200,0.2); color:var(--teal);
      display:flex; align-items:center; justify-content:center;
      font-size:10px; font-weight:800; font-family:var(--f-m); flex-shrink:0;
    }

    /* ── modal backdrop ── */
    .bp-modal {
      position:fixed; inset:0; z-index:50;
      display:flex; align-items:center; justify-content:center;
      padding:16px;
      background:rgba(0,0,0,0.85);
      backdrop-filter:blur(20px);
      animation:bp-modalIn .3s ease;
    }
    @keyframes bp-modalIn { from{opacity:0;} to{opacity:1;} }
    .bp-modal-inner {
      max-width:900px; width:100%; border-radius:22px; overflow:hidden;
      background:linear-gradient(145deg,rgba(8,15,26,0.98),rgba(6,11,17,0.99));
      border:1px solid rgba(0,212,200,0.25);
      box-shadow:0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,212,200,0.08);
    }
    .bp-modal-header {
      padding:16px 20px; display:flex; align-items:center; justify-content:space-between;
      background:rgba(0,212,200,0.06);
      border-bottom:1px solid rgba(0,212,200,0.12);
    }

    /* ── grid helpers ── */
    .bp-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
    .bp-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    @media(max-width:900px) {
      .bp-grid-3 { grid-template-columns:1fr; }
      .bp-grid-2 { grid-template-columns:1fr; }
    }
  `}</style>
);

/* ── Background layers ── */
const BgLayers = () => (
  <>
    <div className="bp-mesh" />
    <div className="bp-scan" />
    <div className="bp-noise" />
    <div className="bp-streak bp-streak-1" />
    <div className="bp-streak bp-streak-2" />
    <div className="bp-streak bp-streak-3" />
    {[
      {s:4,l:"7%", c:"#00d4c8",dur:"22s",delay:"0s"},
      {s:3,l:"22%",c:"#fb7185",dur:"17s",delay:"5s"},
      {s:5,l:"40%",c:"#a78bfa",dur:"26s",delay:"9s"},
      {s:3,l:"57%",c:"#22d3ee",dur:"19s",delay:"2s"},
      {s:4,l:"72%",c:"#fbbf24",dur:"23s",delay:"13s"},
      {s:2,l:"86%",c:"#00d4c8",dur:"15s",delay:"7s"},
      {s:3,l:"94%",c:"#fb7185",dur:"28s",delay:"16s"},
    ].map((d,i)=>(
      <div key={i} className="bp-dot" style={{
        width:d.s,height:d.s,left:d.l,bottom:"-8px",background:d.c,
        boxShadow:`0 0 ${d.s*3}px ${d.c}`,animationDuration:d.dur,animationDelay:d.delay,
      }}/>
    ))}
  </>
);

/* ── Priority badge ── */
function getPriorityBadge(priority: Priority) {
  const configs = {
    CRITICAL: { bg:"rgba(127,29,29,0.6)",  border:"rgba(239,68,68,0.5)",   text:"#fca5a5", label:"🔴 CRITICAL" },
    HIGH:     { bg:"rgba(124,45,18,0.6)",  border:"rgba(249,115,22,0.5)",  text:"#fdba74", label:"🟠 HIGH" },
    MEDIUM:   { bg:"rgba(113,63,18,0.6)",  border:"rgba(234,179,8,0.5)",   text:"#fde047", label:"🟡 MEDIUM" },
    LOW:      { bg:"rgba(20,83,45,0.6)",   border:"rgba(34,197,94,0.5)",   text:"#86efac", label:"🟢 LOW" },
  };
  const c = configs[priority];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, background:c.bg, border:`1px solid ${c.border}`, color:c.text, fontFamily:"var(--f-m)", whiteSpace:"nowrap" }}>
      {c.label}
    </span>
  );
}

/* ── Status badge ── */
function getStatusBadge(status: string) {
  const configs: Record<string, { bg:string; border:string; text:string; label:string }> = {
    BUG_LIST:    { bg:"rgba(30,41,59,0.7)",   border:"rgba(71,85,105,0.6)",   text:"#cbd5e1", label:"📋 Bug List" },
    IN_PROGRESS: { bg:"rgba(124,45,18,0.6)",  border:"rgba(234,88,12,0.5)",   text:"#fdba74", label:"⚙️ In Progress" },
    QA_FIX:      { bg:"rgba(22,78,99,0.6)",   border:"rgba(8,145,178,0.5)",   text:"#67e8f9", label:"🔍 QA Fix" },
    DONE:        { bg:"rgba(20,83,45,0.6)",   border:"rgba(22,163,74,0.5)",   text:"#86efac", label:"✅ Done" },
    PUBLISHED:   { bg:"rgba(88,28,135,0.6)",  border:"rgba(168,85,247,0.5)",  text:"#e9d5ff", label:"🚀 Published" },
  };
  const c = configs[status] || configs.BUG_LIST;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, background:c.bg, border:`1px solid ${c.border}`, color:c.text, fontFamily:"var(--f-m)", whiteSpace:"nowrap" }}>
      {c.label}
    </span>
  );
}

function toLocalDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function BugsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuth, isLoading: authLoading } = useAuth();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [allDevelopers, setAllDevelopers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<WorkItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<number | "">("");
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [markingDoneItemId, setMarkingDoneItemId] = useState<number | null>(null);
  const [publishingItemId, setPublishingItemId] = useState<number | null>(null);
  const [inlineAssigningItemId, setInlineAssigningItemId] = useState<number | null>(null);
  const [publishingAllDone, setPublishingAllDone] = useState(false);
  const [projectRole, setProjectRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [itemType, setItemType] = useState<WorkItemType>("BUG");
  const [typeFilter, setTypeFilter] = useState<"ALL" | WorkItemType>("BUG");
  const [assignedToFilter, setAssignedToFilter] = useState<number | "ALL" | "UNASSIGNED">("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [qaFeedback, setQaFeedback] = useState("");
  const [processStepInput, setProcessStepInput] = useState("");
  const [processComments, setProcessComments] = useState<ProcessComment[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<AttachmentDto[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentDto | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [processSubmitting, setProcessSubmitting] = useState(false);
  const [statusUpdatingItemId, setStatusUpdatingItemId] = useState<number | null>(null);
  const [clientReviewingItemId, setClientReviewingItemId] = useState<number | null>(null);

  const currentRole = (user?.role || "DEVELOPER") as Role;
  const isDeveloperRole = currentRole === "DEVELOPER";
  const isClientRole = currentRole === "CLIENT";
  const activeRole = projectRole || currentRole;
  const canManage = currentRole === "QA_PM" || currentRole === "ADMIN" || activeRole === "QA_PM" || activeRole === "ADMIN";
  const canClientCreateBug = isClientRole || activeRole === "CLIENT";
  const canCreateBug = canManage || canClientCreateBug;
  const canReassign = currentRole === "QA_PM" || activeRole === "QA_PM";
  const canView = true;
  const canShowActionsColumn = canManage || isDeveloperRole || isClientRole;

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err !== null) {
      const maybeResponse = err as { response?: { data?: { message?: string; errors?: string[] } }; message?: string; };
      const backendErrors = maybeResponse.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) return backendErrors[0];
      if (maybeResponse.response?.data?.message) return maybeResponse.response.data.message;
      if (maybeResponse.message) return maybeResponse.message;
    }
    return "Request failed";
  };

  useEffect(() => { if (!authLoading && !isAuth) router.push("/login"); }, [authLoading, isAuth, router]);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "FEATURE" || typeParam === "BUG") setTypeFilter(typeParam);
    else if (typeParam === "ALL") setTypeFilter("ALL");
  }, [searchParams]);

  useEffect(() => {
    if (!isAuth || !user || !canView) return;
    const fetchProjects = async () => {
      try {
        setIsLoading(true); setError(null);
        const projectsData = await getProjects();
        setProjects(projectsData);
        setActiveProjectId((prev) => {
          if (projectsData.length === 0) return null;
          if (prev && projectsData.some((p) => p.id === prev)) return prev;
          return projectsData[0].id;
        });
      } catch (err: unknown) { setError(getErrorMessage(err)); }
      finally { setIsLoading(false); }
    };
    fetchProjects();
  }, [isAuth, user, canView]);

  useEffect(() => {
    if (!isAuth || !user || !canView || !activeProjectId) return;
    const canLoadProjectMembers = !isClientRole;
    const canLoadDevelopers = currentRole === "ADMIN" || currentRole === "QA_PM";
    const loadItemsPromise = isDeveloperRole
      ? getMyAssignedWorkItems(activeProjectId).then((items) => typeFilter === "ALL" ? items : items.filter((item) => item.type === typeFilter))
      : isClientRole
      ? getBugs(activeProjectId)
      : getWorkItems(activeProjectId, typeFilter === "ALL" ? undefined : { type: typeFilter });
    Promise.all([
      loadItemsPromise,
      canLoadProjectMembers ? getProjectMembers(activeProjectId).catch(() => []) : Promise.resolve([]),
      canLoadDevelopers ? getDeveloperUsers().catch(() => []) : Promise.resolve([]),
    ]).then(([bugsData, members, developersData]) => {
      setBugs(bugsData); setProjectMembers(members); setAllDevelopers(developersData);
      const me = members.find((member) => member.user?.id === user.id);
      setProjectRole(me?.role || null);
    }).catch((err: unknown) => setError(getErrorMessage(err)));
  }, [activeProjectId, isAuth, user, canView, typeFilter, isDeveloperRole, isClientRole]);

  useEffect(() => {
    if (!user) return;
    if (isDeveloperRole) setAssignedToFilter(user.id);
    if (isClientRole) setTypeFilter("BUG");
  }, [isDeveloperRole, isClientRole, user]);

  const orderedBugs = useMemo(() => [...bugs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [bugs]);

  const filteredBugs = useMemo(() => {
    if (isDeveloperRole && user?.id) return orderedBugs.filter((item) => item.assignedTo?.id === user.id);
    if (assignedToFilter === "ALL") return orderedBugs;
    if (assignedToFilter === "UNASSIGNED") return orderedBugs.filter((item) => !item.assignedTo?.id);
    return orderedBugs.filter((item) => item.assignedTo?.id === assignedToFilter);
  }, [orderedBugs, assignedToFilter, isDeveloperRole, user]);

  const selectedItem = useMemo(() => bugs.find((item) => item.id === selectedBugId), [bugs, selectedBugId]);
  const isDeveloperAssignedSelected = !!(selectedItem && user && selectedItem.assignedTo?.id === user.id);
  const processEntries = useMemo(() => processComments.filter((comment) => comment.message?.startsWith("[PROCESS] ")), [processComments]);
  const doneItems = useMemo(() => bugs.filter((item) => item.status === "DONE"), [bugs]);

  const developers = useMemo(() => {
    const map = new Map<number, User>();
    allDevelopers.filter((d) => d.role === "DEVELOPER" && d.isActive !== false).forEach((d) => map.set(d.id, d));
    projectMembers.filter((m) => m.user && m.role === "DEVELOPER" && m.user.isActive !== false).forEach((m) => { if (m.user?.id != null) map.set(m.user.id, m.user); });
    return Array.from(map.values()).sort((a, b) => a.username.localeCompare(b.username));
  }, [allDevelopers, projectMembers]);

  const loadBugIntoFields = (bug: WorkItem) => {
    setSelectedBugId(bug.id); setSelectedDeveloperId(bug.assignedTo?.id ?? ""); setItemType(bug.type);
    setTitle(bug.title || ""); setDescription(bug.description || ""); setPriority(bug.priority);
    setDueAt(toLocalDateTimeInput(bug.dueAt)); setDurationHours(""); setQaFeedback(""); setProcessStepInput("");
    setSuccess(`Loaded ${bug.type === "FEATURE" ? "feature" : "bug"} #${bug.id} into fields.`); setError(null);
  };

  useEffect(() => {
    if (!selectedItem) { setProcessComments([]); setSelectedAttachments([]); setAttachmentFile(null); return; }
    Promise.all([getComments(selectedItem.id).catch(() => []), getWorkItemAttachments(selectedItem.id).catch(() => [])]).then(([comments, attachments]) => { setProcessComments(comments); setSelectedAttachments(attachments); });
  }, [selectedItem?.id]);

  const uploadClientAttachment = async () => {
    if (!isClientRole) { setError("Only CLIENT can upload bug attachments from this section."); return; }
    if (!selectedItem) { setError("Select a bug first from the table."); return; }
    if (!attachmentFile) { setError("Select an image file first."); return; }
    try {
      setUploadingAttachment(true); setError(null); setSuccess(null);
      const uploaded = await uploadWorkItemAttachment(selectedItem.id, attachmentFile);
      setSelectedAttachments((prev) => [uploaded, ...prev]); setAttachmentFile(null);
      setSuccess("Attachment uploaded and saved successfully.");
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setUploadingAttachment(false); }
  };

  const isImageAttachment = (fileType?: string) => !!fileType && fileType.startsWith("image/");

  const addProcessStep = async () => {
    if (!selectedItem) { setError("Select a bug first."); return; }
    if (!isDeveloperRole || !isDeveloperAssignedSelected) { setError("Only the assigned developer can update process steps."); return; }
    if (selectedItem.status !== "IN_PROGRESS") { setError("Process steps can be added only while status is IN_PROGRESS."); return; }
    if (!processStepInput.trim()) { setError("Enter a process step first."); return; }
    try {
      setProcessSubmitting(true); setError(null); setSuccess(null);
      const created = await addComment(selectedItem.id, `[PROCESS] ${processStepInput.trim()}`);
      setProcessComments((prev) => [...prev, created]); setProcessStepInput(""); setSuccess("Process step added.");
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setProcessSubmitting(false); }
  };

  const moveBugStatus = async (item: WorkItem, toStatus: "IN_PROGRESS" | "QA_FIX") => {
    if (toStatus === "IN_PROGRESS") {
      const canStartProgress = canManage || (isDeveloperRole && !!user && item.assignedTo?.id === user.id);
      if (!canStartProgress) { setError("Only QA/PM, ADMIN, or the assigned developer can start progress."); return; }
      if (item.status !== "BUG_LIST") { setError("Start Progress is available only for BUG_LIST items."); return; }
    }
    if (toStatus === "QA_FIX") {
      if (!isDeveloperRole || !user || item.assignedTo?.id !== user.id) { setError("Only the assigned developer can move item to QA_FIX."); return; }
      if (item.status !== "IN_PROGRESS") { setError("QA Fix is available only for IN_PROGRESS items."); return; }
    }
    try {
      setStatusUpdatingItemId(item.id); setError(null); setSuccess(null);
      const updated = await changeWorkItemStatus(item.id, toStatus);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      if (toStatus === "IN_PROGRESS") setSuccess(`Bug ${updated.id} moved to IN_PROGRESS.`);
      else setSuccess(`Bug ${updated.id} moved to QA_FIX and sent for QA review.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setStatusUpdatingItemId(null); }
  };

  const submitClientReviewForBug = async (item: WorkItem, reviewStatus: "ACCEPTED" | "REJECTED") => {
    if (!isClientRole) { setError("Only CLIENT can submit published item review."); return; }
    if (item.status !== "PUBLISHED") { setError("Client review is only allowed for PUBLISHED items."); return; }
    try {
      setClientReviewingItemId(item.id); setError(null); setSuccess(null);
      const updated = await submitClientReview(item.id, reviewStatus);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      if (reviewStatus === "REJECTED") setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} moved back to BUG_LIST for rework.`);
      else setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} accepted successfully.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setClientReviewingItemId(null); }
  };

  const sendBackToProgress = async () => {
    if (!selectedItem) { setError("Select a bug first."); return; }
    if (selectedItem.status !== "QA_FIX" && selectedItem.status !== "BUG_LIST") { setError("Progress action is allowed only for BUG_LIST or QA_FIX items."); return; }
    if (!qaFeedback.trim()) { setError("Please add description before moving to progress."); return; }
    try {
      setSubmitting(true); setError(null); setSuccess(null);
      const feedbackText = qaFeedback.trim();
      const feedbackPrefix = "[QA/PM Feedback] "; const progressNotePrefix = "[QA/PM Progress Note] ";
      const notePrefix = selectedItem.status === "BUG_LIST" ? progressNotePrefix : feedbackPrefix;
      const cleanedDescription = (selectedItem.description || "").split("\n").filter((line) => !line.startsWith(feedbackPrefix) && !line.startsWith(progressNotePrefix)).join("\n").trim();
      const nextDescription = cleanedDescription ? `${notePrefix}${feedbackText}\n${cleanedDescription}` : `${notePrefix}${feedbackText}`;
      await updateWorkItem(selectedItem.id, { description: nextDescription });
      await addComment(selectedItem.id, selectedItem.status === "BUG_LIST" ? `QA/PM moved to progress: ${feedbackText}` : `QA feedback: ${feedbackText}`);
      const updated = await changeWorkItemStatus(selectedItem.id, "IN_PROGRESS");
      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setQaFeedback(""); setSuccess(selectedItem.status === "BUG_LIST" ? "Bug moved to In Progress with QA/PM description." : "Bug sent back to In Progress with QA description.");
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  const applyAssignment = async (mode: "assign" | "reassign") => {
    if (!canReassign) { setError("Only QA/PM can reassign work items."); return; }
    if (!selectedItem) { setError("Select an item first."); return; }
    if (!selectedDeveloperId) { setError("Select a developer first."); return; }
    const alreadyAssigned = !!selectedItem.assignedTo;
    const selectedDeveloper = Number(selectedDeveloperId);
    if (mode === "reassign" && selectedItem.assignedTo?.id === selectedDeveloper) { setError("Select a different developer to reassign."); return; }
    try {
      setSubmitting(true); setError(null); setSuccess(null);
      const updated = await assignWorkItem(selectedItem.id, selectedDeveloper);
      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      const verb = alreadyAssigned ? "Reassigned" : "Assigned";
      setSuccess(`${verb} ${updated.type === "FEATURE" ? "feature" : "bug"} to ${updated.assignedTo?.username || "developer"}.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  const assignToDeveloper = async () => applyAssignment("assign");
  const reassignDeveloper = async () => applyAssignment("reassign");

  const onDeleteItem = async (item: WorkItem) => {
    const confirmed = window.confirm(`Delete ${item.type === "FEATURE" ? "feature" : "bug"} ${item.type === "FEATURE" ? `FEATURE-${item.id}` : `BUG-${item.id}`}?`);
    if (!confirmed) return;
    try {
      setDeletingItemId(item.id); setError(null); setSuccess(null);
      await deleteWorkItem(item.id, item.projectId);
      setBugs((prev) => prev.filter((current) => current.id !== item.id));
      if (selectedBugId === item.id) { setSelectedBugId(null); setSelectedDeveloperId(""); }
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} deleted successfully.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setDeletingItemId(null); }
  };

  const onApproveAndDone = async (item: WorkItem) => {
    if (item.status === "DONE" || item.status === "PUBLISHED") return;
    if (item.status !== "IN_PROGRESS" && item.status !== "QA_FIX") { setError("Approve & Done is only allowed for IN_PROGRESS or QA_FIX items."); return; }
    try {
      setMarkingDoneItemId(item.id); setError(null); setSuccess(null);
      const updated = await changeWorkItemStatus(item.id, "DONE");
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} approved by QA and moved to DONE.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setMarkingDoneItemId(null); }
  };

  const onPublishItem = async (item: WorkItem) => {
    if (item.status === "PUBLISHED") return;
    if (item.status !== "DONE") { setError("Only DONE items can be published."); return; }
    try {
      setPublishingItemId(item.id); setError(null); setSuccess(null);
      const updated = await publishWorkItem(item.id);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} published successfully.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setPublishingItemId(null); }
  };

  const onPublishAllDone = async () => {
    if (!activeProjectId) { setError("Please select a project first."); return; }
    if (doneItems.length === 0) { setError("No DONE items available to publish in this project."); return; }
    try {
      setPublishingAllDone(true); setError(null); setSuccess(null);
      const results = await Promise.allSettled(doneItems.map((item) => publishWorkItem(item.id)));
      const publishedItems = results.filter((r): r is PromiseFulfilledResult<WorkItem> => r.status === "fulfilled").map((r) => r.value);
      if (publishedItems.length > 0) {
        const updatedMap = new Map<number, WorkItem>(publishedItems.map((item) => [item.id, item]));
        setBugs((prev) => prev.map((item) => updatedMap.get(item.id) || item));
      }
      const successCount = publishedItems.length, failCount = results.length - successCount;
      if (failCount === 0) setSuccess(`Published ${successCount} DONE item(s) successfully.`);
      else setSuccess(`Published ${successCount} item(s). ${failCount} item(s) failed to publish.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setPublishingAllDone(false); }
  };

  const onInlineAssignDeveloper = async (item: WorkItem, developerId: number | "") => {
    if (!canReassign) return;
    if (!developerId) return;
    if (item.assignedTo?.id === developerId) return;
    try {
      setInlineAssigningItemId(item.id); setError(null); setSuccess(null);
      const updated = await assignWorkItem(item.id, developerId);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${updated.type === "FEATURE" ? "Feature" : "Bug"} assigned to ${updated.assignedTo?.username || "developer"}.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setInlineAssigningItemId(null); }
  };

  const onCreateBug = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreateBug) return;
    if (!activeProjectId) { setError("Please select a project first."); return; }
    if (!title.trim()) { setError("Bug title is required"); return; }
    try {
      setSubmitting(true); setError(null); setSuccess(null);
      const created = canManage
        ? await createWorkItem(activeProjectId, { type: itemType, title: title.trim(), description: description.trim() || undefined, priority, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined })
        : await createBug(activeProjectId, { title: title.trim(), description: description.trim() || undefined, priority, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined });
      setBugs((prev) => [created, ...prev]);
      setSelectedBugId(null); setTitle(""); setDescription(""); setPriority("MEDIUM"); setDueAt(""); setDurationHours(""); setItemType("BUG");
      setSuccess(`${created.type === "FEATURE" ? "Feature" : "Bug"} added to bug list successfully.`);
    } catch (err: unknown) { setError(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (authLoading || isLoading) {
    return (
      <div className="bp-loading">
        <div className="bp-spinner" />
        <span style={{ color:"rgba(0,212,200,0.7)", fontFamily:"var(--f-m)", fontSize:13 }}>Loading…</span>
      </div>
    );
  }
  if (!isAuth || !user) return null;

  if (!canView) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background:"#020509" }}>
        <GlobalStyles /><BgLayers />
        <Sidebar activeProjectId={activeProjectId} onSelectProject={setActiveProjectId} projects={projects} currentRole={currentRole} onRoleChange={() => {}} />
        <div className="flex-1 flex items-center justify-center" style={{ color:"#fda4af", fontFamily:"var(--f-d)", fontSize:15 }}>You are not allowed to view bug list.</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:"#020509" }}>
      <GlobalStyles />
      <BgLayers />

      <Sidebar activeProjectId={activeProjectId} onSelectProject={setActiveProjectId} projects={projects} currentRole={currentRole} onRoleChange={() => {}} />

      {/* ── main scroll area ── */}
      <div className="bp-main flex-1 overflow-auto" style={{ padding:"28px 28px 80px" }}>

        {/* ── Page header ── */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
          <div className="bp-logo-ring logo-frame logo-frame-animated border border-white/10 bg-black/20">
            <Image src="/logo-2.png" alt="Bugs logo" width={42} height={42} className="logo-img logo-color-animate object-contain" priority />
          </div>
          <div>
            <div className="bp-page-title">🐛 Bug & Feature Management</div>
            <div className="bp-page-sub">// track, assign, and manage your project work items</div>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error   && <div className="bp-alert bp-alert-error"><span>⚠</span><span>{error}</span></div>}
        {success && <div className="bp-alert bp-alert-success"><span>✓</span><span>{success}</span></div>}

        {/* ── Filters ── */}
        <div className="bp-grid-3" style={{ marginBottom:20 }}>
          <div className="bp-filter-card">
            <label className="bp-label">📁 Project</label>
            <select className="bp-select" value={activeProjectId ?? ""} onChange={(e) => setActiveProjectId(e.target.value ? Number(e.target.value) : null)}>
              <option value="" disabled>{projects.length === 0 ? "No projects available" : "Select project"}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {projects.length === 0 && <p style={{ marginTop:8, fontSize:11, color:"#fbbf24", fontFamily:"var(--f-m)" }}>💡 No projects found. Contact admin.</p>}
          </div>

          <div className="bp-filter-card">
            <label className="bp-label">🔍 Type Filter</label>
            <select className="bp-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | WorkItemType)} disabled={isClientRole}>
              <option value="BUG">🐛 Bugs</option>
              <option value="FEATURE">✨ Features</option>
              <option value="ALL">📋 All Items</option>
            </select>
          </div>

          {!isClientRole && (
            <div className="bp-filter-card">
              <label className="bp-label">👤 Assigned To</label>
              <select
                className="bp-select"
                value={assignedToFilter}
                onChange={(e) => {
                  if (isDeveloperRole) return;
                  const value = e.target.value;
                  if (value === "ALL" || value === "UNASSIGNED") { setAssignedToFilter(value); return; }
                  setAssignedToFilter(Number(value));
                }}
                disabled={isDeveloperRole}
              >
                {isDeveloperRole ? (
                  <option value={user?.id ?? ""}>My assigned items</option>
                ) : (
                  <>
                    <option value="ALL">All developers</option>
                    <option value="UNASSIGNED">⚪ Unassigned</option>
                    {developers.map((d) => <option key={d.id} value={d.id}>{d.username}</option>)}
                  </>
                )}
              </select>
            </div>
          )}
        </div>

        {/* ── Publish All Banner ── */}
        {canManage && (
          <div className="bp-publish-banner">
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:24 }}>📦</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--t1)" }}>Ready to Publish</div>
                <div style={{ fontSize:11, color:"var(--t3)", fontFamily:"var(--f-m)" }}>{doneItems.length} DONE items in selected project</div>
              </div>
            </div>
            <button type="button" onClick={onPublishAllDone} disabled={publishingAllDone || doneItems.length === 0} className="bp-btn bp-btn-violet">
              {publishingAllDone ? "⏳ Publishing…" : "🚀 Publish All DONE"}
            </button>
          </div>
        )}

        {/* ── Create Bug/Feature Form ── */}
        {canCreateBug && (
          <div className="bp-card" style={{ marginBottom:20, padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <span style={{ fontSize:26 }}>{isClientRole ? "📝" : "➕"}</span>
              <div>
                <div className="bp-section-title">{isClientRole ? "Report New Bug" : (itemType === "FEATURE" ? "Create New Feature" : "Create New Bug")}</div>
                {isClientRole && <div className="bp-section-sub">report issues you've discovered in this project</div>}
              </div>
            </div>
            <form onSubmit={onCreateBug}>
              <div className="bp-grid-2" style={{ marginBottom:14 }}>
                {canManage ? (
                  <div style={{ gridColumn:"1/-1" }}>
                    <label className="bp-label">Type</label>
                    <select className="bp-select" value={itemType} onChange={(e) => setItemType(e.target.value as WorkItemType)}>
                      <option value="BUG">🐛 Bug</option>
                      <option value="FEATURE">✨ Feature</option>
                    </select>
                  </div>
                ) : (
                  <div style={{ gridColumn:"1/-1", padding:"10px 14px", borderRadius:11, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", fontSize:13, color:"#c4b5fd", display:"flex", alignItems:"center", gap:8 }}>
                    <span>🐛</span><span style={{ fontWeight:600 }}>Type: BUG</span>
                  </div>
                )}
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="bp-label">Title *</label>
                  <input className="bp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={itemType === "FEATURE" ? "Enter feature title…" : "Enter bug title…"} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="bp-label">Description</label>
                  <textarea className="bp-textarea bp-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide detailed description…" rows={3} style={{ padding:"11px 14px" }} />
                </div>
                <div>
                  <label className="bp-label">Priority</label>
                  <select className="bp-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p==="CRITICAL"?"🔴 CRITICAL":p==="HIGH"?"🟠 HIGH":p==="MEDIUM"?"🟡 MEDIUM":"🟢 LOW"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="bp-label">Due Date & Time</label>
                  <input type="datetime-local" className="bp-input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
                <div style={{ gridColumn:"1/-1" }}>
                  <label className="bp-label">⏱️ Calculate Due Date (hours from now)</label>
                  <input
                    type="number" min={1} step={1} className="bp-input"
                    value={durationHours}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) { setDurationHours(""); return; }
                      const hours = Number(value);
                      if (Number.isNaN(hours) || hours <= 0) { setDurationHours(""); return; }
                      setDurationHours(hours);
                      setDueAt(toLocalDateTimeInput(new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()));
                    }}
                    placeholder="e.g., 24 hours"
                  />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="bp-btn bp-btn-teal bp-btn-full">
                {submitting ? "⏳ Adding…" : canManage ? (itemType === "FEATURE" ? "✨ Add Feature" : "🐛 Add Bug") : "📤 Report Bug"}
              </button>
            </form>
          </div>
        )}

        {/* ── QA/PM Management ── */}
        {canReassign && selectedItem && (
          <div className="bp-card" style={{ marginBottom:20, padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <span style={{ fontSize:26 }}>👨‍💼</span>
              <div>
                <div className="bp-section-title">QA/PM Management</div>
                <div className="bp-section-sub">
                  Selected: {selectedItem.type === "FEATURE" ? `✨ FEATURE-${selectedItem.id}` : `🐛 BUG-${selectedItem.id}`}
                  <span style={{ marginLeft:8, padding:"2px 8px", borderRadius:20, fontSize:10, fontFamily:"var(--f-m)", background:"rgba(0,212,200,0.1)", border:"1px solid rgba(0,212,200,0.25)", color:"var(--teal)" }}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label className="bp-label">👤 Assign / Reassign Developer</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <select className="bp-select" style={{ flex:1, minWidth:160 }} value={selectedDeveloperId} onChange={(e) => setSelectedDeveloperId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">Select developer…</option>
                  {developers.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
                <button type="button" onClick={assignToDeveloper} disabled={submitting || !selectedDeveloperId} className="bp-btn bp-btn-blue">✓ Assign</button>
                <button type="button" onClick={reassignDeveloper} disabled={submitting || !selectedDeveloperId} className="bp-btn bp-btn-sky">↻ Reassign</button>
              </div>
            </div>

            <div>
              <label className="bp-label">📝 QA Feedback / Progress Note</label>
              <textarea
                className="bp-input" value={qaFeedback} onChange={(e) => setQaFeedback(e.target.value)} rows={3}
                style={{ padding:"11px 14px", marginBottom:12 }}
                placeholder={selectedItem.status === "BUG_LIST" ? "Write QA/PM note before sending to progress…" : "If developer fix is not correct, write QA description here…"}
              />
              <button
                type="button" onClick={sendBackToProgress}
                disabled={submitting || !qaFeedback.trim() || (selectedItem.status !== "QA_FIX" && selectedItem.status !== "BUG_LIST")}
                className="bp-btn bp-btn-orange bp-btn-full"
              >
                {selectedItem.status === "BUG_LIST" ? "▶️ Send To Progress" : "↩️ Send Back to In Progress"}
              </button>
            </div>
          </div>
        )}

        {/* ── Developer Process Steps ── */}
        {isDeveloperRole && selectedItem && (
          <div className="bp-card" style={{ marginBottom:20, padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
              <span style={{ fontSize:26 }}>⚙️</span>
              <div>
                <div className="bp-section-title">Developer Process Steps</div>
                <div className="bp-section-sub">
                  {selectedItem.type === "FEATURE" ? `✨ FEATURE-${selectedItem.id}` : `🐛 BUG-${selectedItem.id}`} — {selectedItem.title}
                </div>
              </div>
            </div>

            {processEntries.length === 0 ? (
              <div style={{ padding:"20px", borderRadius:12, background:"rgba(0,0,0,0.25)", border:"1px dashed rgba(0,212,200,0.15)", textAlign:"center", marginBottom:16 }}>
                <span style={{ color:"var(--t3)", fontSize:12, fontFamily:"var(--f-m)" }}>📋 No process steps added yet</span>
              </div>
            ) : (
              <div className="bp-process-scroll" style={{ marginBottom:16, borderRadius:12, border:"1px solid rgba(0,212,200,0.12)", background:"rgba(0,0,0,0.2)", padding:"12px" }}>
                {processEntries.map((entry, index) => (
                  <div key={entry.id} className="bp-step">
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div className="bp-step-num">{index + 1}</div>
                      <span style={{ color:"var(--teal)", fontWeight:700, fontSize:13 }}>{entry.user?.username}</span>
                      <span style={{ marginLeft:"auto", fontSize:10, color:"var(--t3)", fontFamily:"var(--f-m)" }}>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p style={{ color:"var(--t2)", fontSize:12, paddingLeft:30 }}>{entry.message.replace("[PROCESS] ", "")}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <input
                className="bp-input" style={{ flex:1 }}
                value={processStepInput} onChange={(e) => setProcessStepInput(e.target.value)}
                placeholder="Add process step (only during IN_PROGRESS)…"
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting}
              />
              <button
                type="button" onClick={addProcessStep}
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting || !processStepInput.trim()}
                className="bp-btn bp-btn-sky"
              >
                {processSubmitting ? "⏳" : "➕ Add Step"}
              </button>
            </div>
          </div>
        )}

        {/* ── Work Items Table ── */}
        <div className="bp-card" style={{ marginBottom:20 }}>
          <div style={{ padding:"18px 24px 0", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div className="bp-section-title">📊 Work Items Overview</div>
                <div className="bp-section-sub">{filteredBugs.length} item{filteredBugs.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>
          <div className="bp-table-wrap" style={{ padding:"0 0 4px" }}>
            <table className="bp-table">
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Due At</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  {canShowActionsColumn && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBugs.length === 0 ? (
                  <tr>
                    <td colSpan={canShowActionsColumn ? 10 : 9} className="bp-table-empty">
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:44, opacity:.25 }}>📭</span>
                        <span style={{ fontSize:13 }}>No items match current filters</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBugs.map((bug, index) => (
                  <tr
                    key={bug.id}
                    onClick={() => loadBugIntoFields(bug)}
                    style={{ cursor:"pointer", background: selectedBugId === bug.id ? "rgba(0,212,200,0.07)" : index % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}
                  >
                    <td>
                      <span style={{
                        fontFamily:"var(--f-m)", fontSize:11, padding:"3px 10px", borderRadius:20,
                        background: bug.type === "FEATURE" ? "rgba(88,28,135,0.35)" : "rgba(127,29,29,0.35)",
                        color: bug.type === "FEATURE" ? "#e9d5ff" : "#fca5a5",
                        border: `1px solid ${bug.type === "FEATURE" ? "rgba(168,85,247,0.4)" : "rgba(239,68,68,0.4)"}`,
                        whiteSpace:"nowrap",
                      }}>
                        {bug.type === "FEATURE" ? `✨ FEATURE-${bug.id}` : `🐛 BUG-${bug.id}`}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:"var(--t2)" }}>{bug.type === "FEATURE" ? "Feature" : "Bug"}</td>
                    <td style={{ maxWidth:220 }}>
                      <div style={{ fontWeight:600, color:"var(--t1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={bug.title}>{bug.title}</div>
                    </td>
                    <td>{getPriorityBadge(bug.priority)}</td>
                    <td>{getStatusBadge(bug.status)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {canReassign ? (
                        <select
                          className="bp-inline-select"
                          value={bug.assignedTo?.id ?? ""}
                          onChange={(e) => onInlineAssignDeveloper(bug, e.target.value ? Number(e.target.value) : "")}
                          disabled={inlineAssigningItemId === bug.id}
                        >
                          <option value="">⚪ Unassigned</option>
                          {developers.map((d) => <option key={d.id} value={d.id}>👤 {d.username}</option>)}
                        </select>
                      ) : (
                        <span style={{ fontSize:12 }}>{bug.assignedTo?.username ? `👤 ${bug.assignedTo.username}` : "⚪ Unassigned"}</span>
                      )}
                    </td>
                    <td style={{ fontSize:11 }}>
                      {bug.dueAt ? (
                        <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <span>📅</span><span>{new Date(bug.dueAt).toLocaleString()}</span>
                        </span>
                      ) : <span style={{ color:"var(--t3)" }}>—</span>}
                    </td>
                    <td style={{ fontSize:11 }}>{bug.createdBy?.username}</td>
                    <td style={{ fontSize:11 }}>{new Date(bug.createdAt).toLocaleString()}</td>
                    {canShowActionsColumn && (
                      <td>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                          {isDeveloperRole && bug.assignedTo?.id === user?.id && (
                            <>
                              <button type="button" onClick={(e) => { e.stopPropagation(); moveBugStatus(bug, "IN_PROGRESS"); }}
                                disabled={statusUpdatingItemId === bug.id || bug.status !== "BUG_LIST"}
                                className="bp-btn bp-btn-orange bp-btn-sm">
                                {statusUpdatingItemId === bug.id && bug.status === "BUG_LIST" ? "⏳" : "▶️"} Start
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); moveBugStatus(bug, "QA_FIX"); }}
                                disabled={statusUpdatingItemId === bug.id || bug.status !== "IN_PROGRESS"}
                                className="bp-btn bp-btn-sky bp-btn-sm">
                                {statusUpdatingItemId === bug.id && bug.status === "IN_PROGRESS" ? "⏳" : "🔍"} QA Fix
                              </button>
                            </>
                          )}
                          {canManage && (
                            <>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onApproveAndDone(bug); }}
                                disabled={markingDoneItemId === bug.id || bug.status === "DONE" || bug.status === "PUBLISHED" || (bug.status !== "IN_PROGRESS" && bug.status !== "QA_FIX")}
                                className="bp-btn bp-btn-green bp-btn-sm">
                                {markingDoneItemId === bug.id ? "⏳" : bug.status === "DONE" || bug.status === "PUBLISHED" ? "✅" : "✓"}{" "}
                                {bug.status === "DONE" || bug.status === "PUBLISHED" ? "Done" : "Approve"}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onPublishItem(bug); }}
                                disabled={publishingItemId === bug.id || bug.status === "PUBLISHED" || bug.status !== "DONE"}
                                className="bp-btn bp-btn-violet bp-btn-sm">
                                {publishingItemId === bug.id ? "⏳" : bug.status === "PUBLISHED" ? "🚀" : "📤"} Publish
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteItem(bug); }}
                                disabled={deletingItemId === bug.id}
                                className="bp-btn bp-btn-red bp-btn-sm">
                                {deletingItemId === bug.id ? "⏳" : "🗑️"} Delete
                              </button>
                            </>
                          )}
                          {isClientRole && bug.status === "PUBLISHED" && (
                            <>
                              <button type="button" onClick={(e) => { e.stopPropagation(); submitClientReviewForBug(bug, "ACCEPTED"); }}
                                disabled={clientReviewingItemId === bug.id}
                                className="bp-btn bp-btn-green bp-btn-sm">
                                {clientReviewingItemId === bug.id ? "⏳" : "✓"} Accept
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); submitClientReviewForBug(bug, "REJECTED"); }}
                                disabled={clientReviewingItemId === bug.id}
                                className="bp-btn bp-btn-red bp-btn-sm">
                                ✗ Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Client Attachments ── */}
        {isClientRole && (
          <div className="bp-card" style={{ padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <span style={{ fontSize:26 }}>📎</span>
              <div>
                <div className="bp-section-title">Upload Bug Attachments</div>
                <div className="bp-section-sub">
                  {selectedItem ? `Selected: 🐛 BUG-${selectedItem.id} — ${selectedItem.title}` : "⚠️ Select a bug from the table above to upload attachments"}
                </div>
              </div>
            </div>

            <div style={{ marginBottom:20, padding:"16px", borderRadius:13, background:"rgba(0,0,0,0.2)", border:"1px dashed rgba(0,212,200,0.2)" }}>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <label style={{ flex:1, minWidth:200, padding:"10px 14px", borderRadius:11, background:"rgba(0,8,16,0.7)", border:"1px solid rgba(0,212,200,0.15)", color:"var(--t2)", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                  <span>📁</span>
                  <span>{attachmentFile ? attachmentFile.name : "Choose an image file…"}</span>
                  <input type="file" accept="image/*" disabled={!selectedItem || uploadingAttachment} onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} style={{ display:"none" }} />
                </label>
                <button type="button" onClick={uploadClientAttachment} disabled={!selectedItem || !attachmentFile || uploadingAttachment} className="bp-btn bp-btn-sky">
                  {uploadingAttachment ? "⏳ Uploading…" : "📤 Upload"}
                </button>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--t1)" }}>📂 Saved Attachments</div>
              {selectedAttachments.length > 0 && (
                <span style={{ fontSize:11, color:"var(--t3)", background:"rgba(255,255,255,0.07)", padding:"3px 10px", borderRadius:20, fontFamily:"var(--f-m)" }}>
                  {selectedAttachments.length} file{selectedAttachments.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {selectedAttachments.length === 0 ? (
              <div style={{ padding:"40px 16px", borderRadius:12, background:"rgba(0,0,0,0.2)", border:"1px dashed rgba(0,212,200,0.12)", textAlign:"center" }}>
                <span style={{ display:"block", fontSize:36, opacity:.2, marginBottom:8 }}>📭</span>
                <span style={{ color:"var(--t3)", fontSize:12, fontFamily:"var(--f-m)" }}>No attachments saved for this bug yet</span>
              </div>
            ) : (
              <div className="bp-attach-scroll" style={{ borderRadius:12, border:"1px solid var(--border)" }}>
                <table className="bp-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAttachments.map((attachment, index) => (
                      <tr key={attachment.id} style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent" }}>
                        <td>
                          {isImageAttachment(attachment.fileType) ? (
                            <img src={attachment.url} alt={attachment.originalName}
                              style={{ width:48, height:48, borderRadius:9, objectFit:"cover", border:"1px solid rgba(0,212,200,0.2)", cursor:"pointer" }}
                              onClick={() => setPreviewAttachment(attachment)} />
                          ) : (
                            <div style={{ width:48, height:48, borderRadius:9, background:"rgba(0,212,200,0.07)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📄</div>
                          )}
                        </td>
                        <td style={{ fontSize:12, fontWeight:600, color:"var(--t1)" }}>{attachment.originalName}</td>
                        <td>
                          <span style={{ fontSize:10, padding:"3px 8px", borderRadius:20, background:"rgba(0,212,200,0.1)", color:"var(--teal)", border:"1px solid rgba(0,212,200,0.25)", fontFamily:"var(--f-m)" }}>
                            {attachment.fileType}
                          </span>
                        </td>
                        <td style={{ fontSize:11 }}>{new Date(attachment.createdAt).toLocaleString()}</td>
                        <td>
                          <button type="button"
                            onClick={() => { if (isImageAttachment(attachment.fileType)) { setPreviewAttachment(attachment); return; } window.open(attachment.url, "_blank", "noopener,noreferrer"); }}
                            className="bp-btn bp-btn-blue bp-btn-sm">
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>{/* /main scroll area */}

      {/* ── Image Preview Modal ── */}
      {previewAttachment && (
        <div className="bp-modal" onClick={() => setPreviewAttachment(null)}>
          <div className="bp-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="bp-modal-header">
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22 }}>🖼️</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--t1)", maxWidth:400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{previewAttachment.originalName}</div>
                  <div style={{ fontSize:11, color:"var(--t3)", fontFamily:"var(--f-m)" }}>{previewAttachment.fileType}</div>
                </div>
              </div>
              <button type="button" onClick={() => setPreviewAttachment(null)} className="bp-btn bp-btn-red bp-btn-sm">✕ Close</button>
            </div>
            <div style={{ padding:"20px", background:"rgba(0,0,0,0.4)" }}>
              <img src={previewAttachment.url} alt={previewAttachment.originalName}
                style={{ width:"100%", maxHeight:"75vh", objectFit:"contain", borderRadius:12, border:"1px solid rgba(0,212,200,0.15)" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}