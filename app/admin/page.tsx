"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import Image from "next/image";
import {
  getUsers,
  getDeveloperUsers,
  createUserByAdmin,
  createProject,
  getProjects,
  addProjectMembers,
  getProjectMembers,
  deactivateUser,
  activateUser,
  deleteUser,
  resendPasswordSetupEmail,
  resetTemporaryPassword,
} from "../lib/api/services";
import type { User, Project, ProjectMember } from "../types";

type Role = "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";

interface CreateUserForm {
  username: string;
  email: string;
  role: Role;
}

const ROLE_OPTIONS = [
  { value: "ADMIN" as Role,     label: "Admin",     color: "#fb7185" },
  { value: "QA_PM" as Role,     label: "QA / PM",   color: "#fbbf24" },
  { value: "DEVELOPER" as Role, label: "Developer", color: "#00d4c8" },
  { value: "CLIENT" as Role,    label: "Client",    color: "#a78bfa" },
];

const AVATAR_COLORS = ["#00d4c8","#22d3ee","#a78bfa","#fb7185","#fbbf24","#34d399","#f97316","#60a5fa"];

function getAvatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }
function getInitials(username: string) { return username.substring(0, 2).toUpperCase(); }

/* ─────────────────────────────────────────────────────────────
   GLOBAL STYLES — aurora palette matching LoginPage
───────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --bg:       #020509;
      --surface:  #060b11;
      --card:     #080f1a;
      --card2:    #0a1220;
      --teal:     #00d4c8;
      --cyan:     #22d3ee;
      --rose:     #fb7185;
      --amber:    #fbbf24;
      --violet:   #a78bfa;
      --green:    #34d399;
      --border:   rgba(0,212,200,0.14);
      --borderg:  rgba(0,212,200,0.45);
      --t1:       #e2e8f0;
      --t2:       #7aa0b8;
      --t3:       #3d5a6e;
      --f-d:      'Outfit', sans-serif;
      --f-m:      'DM Mono', monospace;
    }

    html { scroll-behavior: smooth; }

    /* ── ROOT ── */
    .ap-root {
      height: 100vh;
      background: var(--bg);
      font-family: var(--f-d);
      color: var(--t1);
      overflow-x: hidden;
      overflow-y: auto;
      position: relative;
      -webkit-overflow-scrolling: touch;
    }

    /* ── MESH BG ── */
    .ap-mesh {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 70% 55% at 5%  15%,  rgba(0,212,200,0.13)  0%, transparent 60%),
        radial-gradient(ellipse 55% 45% at 95% 85%,  rgba(251,113,133,0.11) 0%, transparent 55%),
        radial-gradient(ellipse 45% 60% at 55% 50%,  rgba(167,139,250,0.08) 0%, transparent 60%),
        radial-gradient(ellipse 35% 35% at 85% 8%,   rgba(34,211,238,0.09)  0%, transparent 50%),
        #020509;
      animation: ap-meshPulse 12s ease-in-out infinite alternate;
    }
    @keyframes ap-meshPulse {
      0%   { filter: hue-rotate(0deg) brightness(1); }
      50%  { filter: hue-rotate(15deg) brightness(1.05); }
      100% { filter: hue-rotate(-10deg) brightness(0.97); }
    }

    /* ── SCANLINES ── */
    .ap-scan {
      position: fixed; inset: 0; z-index: 1; pointer-events: none;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px
      );
    }

    /* ── GRAIN ── */
    .ap-noise {
      position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 200px 200px;
      animation: ap-grain 0.4s steps(1) infinite;
    }
    @keyframes ap-grain {
      0%  { background-position: 0 0; }
      25% { background-position: -30px 15px; }
      50% { background-position: 20px -10px; }
      75% { background-position: -10px -25px; }
    }

    /* ── AURORA STREAKS ── */
    .ap-streak {
      position: fixed; pointer-events: none; z-index: 1;
      border-radius: 100px; filter: blur(40px);
      animation: ap-streakDrift ease-in-out infinite alternate;
    }
    .ap-streak-1 { width:600px; height:3px; top:18%; left:-100px; background:linear-gradient(90deg,transparent,var(--teal),transparent); animation-duration:10s; animation-delay:0s; }
    .ap-streak-2 { width:450px; height:2px; top:60%; right:-80px; background:linear-gradient(90deg,transparent,var(--rose),transparent); animation-duration:13s; animation-delay:3s; }
    .ap-streak-3 { width:380px; height:2px; top:82%; left:15%; background:linear-gradient(90deg,transparent,var(--violet),transparent); animation-duration:8s; animation-delay:7s; }
    @keyframes ap-streakDrift {
      from { transform:translateX(-50px) scaleX(0.75); opacity:0.35; }
      to   { transform:translateX(50px) scaleX(1.15); opacity:0.85; }
    }

    /* ── FLOATING DOTS ── */
    .ap-dot {
      position: fixed; border-radius: 50%; pointer-events: none; z-index: 1;
      animation: ap-dotFloat linear infinite;
    }
    @keyframes ap-dotFloat {
      0%   { transform:translateY(105vh) scale(0); opacity:0; }
      6%   { opacity:1; }
      94%  { opacity:0.6; }
      100% { transform:translateY(-8vh) scale(1.3); opacity:0; }
    }

    /* ── LAYOUT INNER ── */
    .ap-inner {
      position: relative; z-index: 3;
      max-width: 1200px; margin: 0 auto;
      padding: 36px 24px 100px;
    }

    /* ── STAGGER FADE-UP ── */
    .ap-fade {
      opacity: 0; transform: translateY(22px);
      animation: ap-fadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards;
    }
    @keyframes ap-fadeUp {
      to { opacity:1; transform:translateY(0); }
    }
    .ap-fade:nth-child(1){animation-delay:0.05s;}
    .ap-fade:nth-child(2){animation-delay:0.13s;}
    .ap-fade:nth-child(3){animation-delay:0.21s;}
    .ap-fade:nth-child(4){animation-delay:0.29s;}
    .ap-fade:nth-child(5){animation-delay:0.37s;}

    /* ── HEADER ── */
    .ap-header {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:40px; gap:16px; flex-wrap:wrap;
    }
    .ap-logo-wrap { display:flex; align-items:center; gap:16px; }
    .ap-logo-ring {
      width:56px; height:56px; border-radius:16px; flex-shrink:0;
      background: linear-gradient(135deg, rgba(0,212,200,0.2), rgba(34,211,238,0.1));
      border: 1px solid rgba(0,212,200,0.4);
      display:flex; align-items:center; justify-content:center;
      overflow: hidden;
      box-shadow: 0 0 28px rgba(0,212,200,0.25), inset 0 1px 0 rgba(255,255,255,0.07);
      animation: ap-logoPulse 4s ease-in-out infinite;
    }
    @keyframes ap-logoPulse {
      0%,100% { box-shadow: 0 0 28px rgba(0,212,200,0.25), inset 0 1px 0 rgba(255,255,255,0.07); }
      50%      { box-shadow: 0 0 50px rgba(0,212,200,0.55), inset 0 1px 0 rgba(255,255,255,0.13); }
    }
    .ap-title {
      font-size:26px; font-weight:900; letter-spacing:-0.8px; line-height:1;
      background: linear-gradient(135deg, #ffffff 0%, var(--teal) 60%, var(--cyan) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; background-size: 200% 100%;
      animation: ap-titleShimmer 6s linear infinite;
    }
    @keyframes ap-titleShimmer {
      0%,100% { background-position:0% 50%; }
      50%      { background-position:100% 50%; }
    }
    .ap-subtitle {
      font-size:11px; color:rgba(0,212,200,0.5); margin-top:4px;
      font-family:var(--f-m); letter-spacing:1.5px;
    }
    .ap-email-badge {
      display:inline-flex; align-items:center; gap:6px; margin-top:6px;
      padding:4px 10px; border-radius:6px;
      background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.35);
      font-size:11px; font-weight:600; color:#fcd34d; font-family:var(--f-m);
      animation: ap-badgePop 0.4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes ap-badgePop { from{opacity:0;transform:scale(.8);} to{opacity:1;transform:scale(1);} }

    /* ── HEADER BUTTONS ── */
    .ap-btn-group { display:flex; gap:10px; }
    .ap-btn {
      padding:10px 22px; border-radius:11px; font-size:13px; font-weight:700;
      border:none; cursor:pointer; transition:all 0.25s;
      font-family:var(--f-d); letter-spacing:0.3px;
      position:relative; overflow:hidden;
    }
    .ap-btn::before {
      content:''; position:absolute; top:0; left:-100%; width:60%; height:100%;
      background:linear-gradient(110deg,transparent,rgba(255,255,255,0.12),transparent);
      transform:skewX(-20deg); transition:left 0.5s; pointer-events:none;
    }
    .ap-btn:hover::before { left:140%; }
    .ap-btn-primary {
      background:linear-gradient(135deg, #00b8ad, #00d4c8);
      color:#020509;
      box-shadow: 0 4px 18px rgba(0,212,200,0.4);
    }
    .ap-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 26px rgba(0,212,200,0.6); }
    .ap-btn-secondary {
      background:rgba(0,212,200,0.07); color:var(--t2);
      border:1px solid rgba(0,212,200,0.18);
    }
    .ap-btn-secondary:hover { color:var(--t1); border-color:rgba(0,212,200,0.45); transform:translateY(-1px); background:rgba(0,212,200,0.12); }

    /* ── ALERTS ── */
    .ap-alert {
      padding:14px 18px; border-radius:13px; font-size:12px;
      margin-bottom:18px; display:flex; align-items:flex-start; gap:10px;
      animation: ap-alertSlide 0.35s cubic-bezier(.22,1,.36,1);
      font-family:var(--f-m);
    }
    @keyframes ap-alertSlide { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
    .ap-alert-error   { background:rgba(251,113,133,0.08); border:1px solid rgba(251,113,133,0.28); color:#fda4af; }
    .ap-alert-success { background:rgba(52,211,153,0.08);  border:1px solid rgba(52,211,153,0.28);  color:#6ee7b7; }

    /* ── CARDS ── */
    .ap-card {
      background: linear-gradient(145deg, rgba(8,15,26,0.97), rgba(6,11,17,0.99));
      border:1px solid var(--border);
      border-radius:20px; margin-bottom:24px;
      overflow:hidden; transition:border-color 0.3s;
      position:relative;
      box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,200,0.04);
    }
    .ap-card::before {
      content:''; position:absolute; top:0; left:15%; right:15%; height:1px;
      background:linear-gradient(90deg, transparent, var(--teal), var(--cyan), var(--teal), transparent);
      animation: ap-topBar 3.5s ease-in-out infinite alternate;
    }
    @keyframes ap-topBar {
      from { opacity:0.5; filter:blur(0px); }
      to   { opacity:1;   filter:blur(0.5px); }
    }
    .ap-card:hover { border-color:rgba(0,212,200,0.28); }
    .ap-card-header {
      padding:22px 24px 0;
      display:flex; align-items:center; gap:12px; margin-bottom:20px;
    }
    .ap-card-icon {
      width:38px; height:38px; border-radius:11px;
      display:flex; align-items:center; justify-content:center;
      font-size:17px; flex-shrink:0;
      border:1px solid;
    }
    .ap-card-icon-teal   { background:rgba(0,212,200,0.12);  border-color:rgba(0,212,200,0.25); }
    .ap-card-icon-violet { background:rgba(167,139,250,0.12); border-color:rgba(167,139,250,0.25); }
    .ap-card-icon-rose   { background:rgba(251,113,133,0.12); border-color:rgba(251,113,133,0.25); }
    .ap-card-body { padding:0 24px 24px; }

    /* ── SECTION TITLES ── */
    .ap-section-title { font-size:16px; font-weight:700; color:var(--t1); line-height:1; }
    .ap-section-sub   { font-size:11px; color:var(--t3); margin-top:3px; font-family:var(--f-m); letter-spacing:0.5px; }

    /* ── FORM ELEMENTS ── */
    .ap-label {
      display:block; font-size:10px; font-weight:500; letter-spacing:1.5px;
      text-transform:uppercase; color:rgba(0,212,200,0.5); margin-bottom:8px;
      font-family:var(--f-m);
    }
    .ap-input, .ap-select, .ap-textarea {
      width:100%; padding:11px 14px; border-radius:11px; font-size:13px;
      background:rgba(0,8,16,0.7); border:1px solid rgba(0,212,200,0.15);
      color:var(--t1); outline:none; transition:all 0.25s;
      font-family:var(--f-d);
    }
    .ap-input:focus, .ap-select:focus, .ap-textarea:focus {
      border-color:var(--teal);
      box-shadow:0 0 0 3px rgba(0,212,200,0.12), 0 0 20px rgba(0,212,200,0.07);
      background:rgba(0,212,200,0.04);
    }
    .ap-input::placeholder, .ap-textarea::placeholder { color:var(--t3); }
    .ap-select option { background:#080f1a; }
    .ap-textarea { resize:vertical; min-height:80px; }

    .ap-form-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
    .ap-form-grid-4 { display:grid; grid-template-columns:1fr 1.2fr 0.8fr auto; gap:12px; align-items:start; }
    @media(max-width:768px){
      .ap-form-grid-2 { grid-template-columns:1fr; }
      .ap-form-grid-4 { grid-template-columns:1fr; }
    }

    /* ── CHECKBOX LIST ── */
    .ap-checkbox-list { padding:10px 0; max-height:130px; overflow-y:auto; }
    .ap-checkbox-list::-webkit-scrollbar { width:3px; }
    .ap-checkbox-list::-webkit-scrollbar-thumb { background:rgba(0,212,200,0.35); border-radius:3px; }
    .ap-checkbox-row {
      display:flex; align-items:center; gap:8px;
      padding:5px 4px; border-radius:7px; cursor:pointer;
      transition:background 0.15s; font-size:12px; color:var(--t2);
    }
    .ap-checkbox-row:hover:not(.ap-checkbox-row--disabled) { background:rgba(0,212,200,0.07); color:var(--t1); }
    .ap-checkbox-row--disabled { opacity:0.35; cursor:not-allowed; }
    .ap-checkbox-row input[type="checkbox"] { accent-color:var(--teal); width:14px; height:14px; }

    /* ── SUBMIT BUTTONS ── */
    .ap-submit {
      padding:11px 24px; border-radius:11px; font-size:13px;
      font-weight:700; border:none; cursor:pointer; transition:all 0.25s;
      font-family:var(--f-d); white-space:nowrap; position:relative; overflow:hidden;
    }
    .ap-submit::before {
      content:''; position:absolute; top:0; left:-100%; width:60%; height:100%;
      background:linear-gradient(110deg,transparent,rgba(255,255,255,0.15),transparent);
      transform:skewX(-20deg); transition:left 0.5s; pointer-events:none;
    }
    .ap-submit:hover::before { left:140%; }
    .ap-submit:disabled { opacity:0.4; cursor:not-allowed; transform:none !important; }
    .ap-submit-teal {
      background:linear-gradient(135deg,#00b8ad,#00d4c8); color:#020509;
      box-shadow:0 4px 16px rgba(0,212,200,0.38);
    }
    .ap-submit-teal:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,212,200,0.55); }
    .ap-submit-violet {
      background:linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff;
      box-shadow:0 4px 16px rgba(167,139,250,0.35);
    }
    .ap-submit-violet:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(167,139,250,0.5); }
    .ap-submit-rose {
      background:linear-gradient(135deg,#e11d48,#fb7185); color:#fff;
      box-shadow:0 4px 16px rgba(251,113,133,0.35); width:100%; padding:12px;
    }
    .ap-submit-rose:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(251,113,133,0.5); }

    /* ── TABLE ── */
    .ap-table-wrap {
      border-radius:13px; border:1px solid var(--border);
      overflow:hidden; overflow-x:auto;
    }
    .ap-table-wrap::-webkit-scrollbar { height:3px; }
    .ap-table-wrap::-webkit-scrollbar-thumb { background:rgba(0,212,200,0.3); border-radius:3px; }
    .ap-table { width:100%; border-collapse:collapse; }
    .ap-table thead tr {
      background:rgba(0,212,200,0.04);
      border-bottom:1px solid var(--border);
    }
    .ap-table th {
      padding:12px 16px; text-align:left; font-size:9px; font-weight:500;
      letter-spacing:1.5px; text-transform:uppercase; color:rgba(0,212,200,0.5);
      font-family:var(--f-m); white-space:nowrap;
    }
    .ap-table tbody tr {
      border-bottom:1px solid rgba(0,212,200,0.05);
      transition:background 0.15s;
    }
    .ap-table tbody tr:last-child { border-bottom:none; }
    .ap-table tbody tr:hover { background:rgba(0,212,200,0.03); }
    .ap-table td { padding:14px 16px; font-size:13px; color:var(--t2); white-space:nowrap; }
    .ap-table-empty { padding:44px 16px; text-align:center; color:var(--t3); font-size:12px; font-family:var(--f-m); }

    /* ── AVATAR ── */
    .ap-avatar {
      width:36px; height:36px; border-radius:10px;
      display:flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:900; color:#020509; flex-shrink:0;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
      font-family:var(--f-d);
    }
    .ap-user-cell { display:flex; align-items:center; gap:10px; }

    /* ── ROLE PILL ── */
    .ap-role-pill {
      display:inline-block; padding:4px 10px; border-radius:20px;
      font-size:10px; font-weight:600; font-family:var(--f-m); letter-spacing:0.5px;
      border:1px solid;
    }

    /* ── STATUS PILL ── */
    .ap-status-pill {
      display:inline-flex; align-items:center; gap:6px;
      padding:4px 10px; border-radius:20px; font-size:11px; font-weight:600;
      font-family:var(--f-m);
    }
    .ap-status-pill::before { content:''; width:6px; height:6px; border-radius:50%; }
    .ap-status-active  { background:rgba(52,211,153,0.1);  color:#6ee7b7; border:1px solid rgba(52,211,153,0.25); }
    .ap-status-active::before  { background:#34d399; box-shadow:0 0 6px #34d399; animation:ap-statusBlink 2s infinite; }
    .ap-status-inactive{ background:rgba(251,113,133,0.1); color:#fda4af; border:1px solid rgba(251,113,133,0.2); }
    .ap-status-inactive::before{ background:#fb7185; }
    @keyframes ap-statusBlink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

    /* ── ACTION BUTTONS ── */
    .ap-action-group { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .ap-action-btn {
      padding:5px 10px; border-radius:8px; font-size:11px; font-weight:600;
      border:none; cursor:pointer; transition:all 0.2s;
      font-family:var(--f-d); white-space:nowrap;
    }
    .ap-action-btn:disabled  { opacity:0.3; cursor:not-allowed; transform:none !important; }
    .ap-action-btn:not(:disabled):hover { transform:translateY(-1px); }
    .ap-action-blue  { background:rgba(34,211,238,0.12); color:#67e8f9; }
    .ap-action-blue:not(:disabled):hover  { background:rgba(34,211,238,0.22); }
    .ap-action-amber { background:rgba(251,191,36,0.12);  color:#fde68a; }
    .ap-action-amber:not(:disabled):hover { background:rgba(251,191,36,0.22); }
    .ap-action-red   { background:rgba(251,113,133,0.12); color:#fda4af; }
    .ap-action-red:not(:disabled):hover   { background:rgba(251,113,133,0.22); }
    .ap-action-rose  { background:rgba(251,113,133,0.1);  color:#fecdd3; }
    .ap-action-rose:not(:disabled):hover  { background:rgba(251,113,133,0.2); }
    .ap-action-shield{ background:rgba(0,212,200,0.07); color:var(--t3); cursor:default; }

    /* ── LOADING ── */
    .ap-loading { padding:60px; text-align:center; color:var(--t3); font-family:var(--f-m); font-size:12px; }
    .ap-spinner {
      width:28px; height:28px; border-radius:50%; margin:0 auto 14px;
      border:2px solid rgba(0,212,200,0.15);
      border-top-color:var(--teal);
      animation:ap-spin 0.7s linear infinite;
    }
    @keyframes ap-spin { to{ transform:rotate(360deg); } }

    /* ── MISC ── */
    .ap-empty-hint { font-size:11px; color:var(--t3); margin-top:8px; font-family:var(--f-m); }
    .ap-table-label {
      font-size:10px; font-weight:500; letter-spacing:1.5px;
      text-transform:uppercase; color:rgba(0,212,200,0.45); margin-bottom:10px;
      font-family:var(--f-m);
    }
    .ap-count-badge {
      display:inline-flex; align-items:center; justify-content:center;
      min-width:22px; height:22px; padding:0 6px; border-radius:6px;
      font-size:11px; font-weight:700;
      background:rgba(0,212,200,0.15); color:var(--teal);
      font-family:var(--f-m); border:1px solid rgba(0,212,200,0.25);
    }
  `}</style>
);

/* ── Decorative background ── */
const BgLayers = () => (
  <>
    <div className="ap-mesh" />
    <div className="ap-scan" />
    <div className="ap-noise" />
    <div className="ap-streak ap-streak-1" />
    <div className="ap-streak ap-streak-2" />
    <div className="ap-streak ap-streak-3" />
    {[
      {s:4,l:"6%", c:"#00d4c8",dur:"22s",delay:"0s"},
      {s:3,l:"20%",c:"#fb7185",dur:"17s",delay:"5s"},
      {s:5,l:"38%",c:"#a78bfa",dur:"26s",delay:"9s"},
      {s:3,l:"55%",c:"#22d3ee",dur:"19s",delay:"2s"},
      {s:4,l:"70%",c:"#fbbf24",dur:"23s",delay:"13s"},
      {s:2,l:"85%",c:"#00d4c8",dur:"15s",delay:"7s"},
      {s:3,l:"94%",c:"#fb7185",dur:"28s",delay:"16s"},
    ].map((d,i)=>(
      <div key={i} className="ap-dot" style={{
        width:d.s,height:d.s,left:d.l,bottom:"-8px",
        background:d.c, boxShadow:`0 0 ${d.s*3}px ${d.c}`,
        animationDuration:d.dur, animationDelay:d.delay,
      }}/>
    ))}
  </>
);

export default function AdminPanel() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectMembersByProject, setProjectMembersByProject] = useState<Record<number, ProjectMember[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [resendingForUserId, setResendingForUserId] = useState<number | null>(null);
  const [resettingPasswordForUserId, setResettingPasswordForUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [showEmailConfigBadge, setShowEmailConfigBadge] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState<{ userIds: number[]; role: Role }>({ userIds: [], role: "DEVELOPER" });
  const [formData, setFormData] = useState<CreateUserForm>({ username: "", email: "", role: "DEVELOPER" });

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "QA_PM") fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) { setProjectMembers([]); return; }
    getProjectMembers(selectedProjectId).then(setProjectMembers).catch(() => setProjectMembers([]));
  }, [selectedProjectId]);

  const loadProjectMemberships = async (projectList: Project[]) => {
    if (projectList.length === 0) { setProjectMembersByProject({}); return; }
    const entries = await Promise.all(projectList.map(async (project) => {
      try { const members = await getProjectMembers(project.id); return [project.id, members] as const; }
      catch { return [project.id, []] as const; }
    }));
    setProjectMembersByProject(Object.fromEntries(entries));
  };

  const shouldShowEmailConfigBadge = (message?: string) => {
    if (!message) return false;
    const n = message.toLowerCase();
    return n.includes("smtp")||n.includes("spring.mail")||n.includes("app.email.from")||n.includes("unable to send email")||n.includes("authentication failed")||n.includes("authentication error");
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true); setError("");
      const [usersData, projectsData] = await Promise.all([
        user?.role === "ADMIN" ? getUsers() : getDeveloperUsers(),
        getProjects(),
      ]);
      setUsers(usersData); setProjects(projectsData);
      await loadProjectMemberships(projectsData);
      if (projectsData.length > 0) setSelectedProjectId(projectsData[0].id);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 401) setError("Your session has expired. Please login again.");
      else if (status === 403) setError("You do not have permission to manage project membership.");
      else if (status === 500) setError(msg || "Server error while loading users.");
      else setError(msg || "Failed to load admin data.");
    } finally { setIsLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    const normalizedUsername = formData.username.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedUsername || !normalizedEmail) { setError("Username and email are required."); return; }
    if (users.some((u) => u.username.trim().toLowerCase() === normalizedUsername.toLowerCase())) { setError(`Username already exists: ${normalizedUsername}`); return; }
    if (users.some((u) => u.email.trim().toLowerCase() === normalizedEmail)) { setError(`Email already exists: ${normalizedEmail}`); return; }
    try {
      setIsCreatingUser(true);
      const created = await createUserByAdmin({ ...formData, username: normalizedUsername, email: normalizedEmail, temporaryPassword: Math.random().toString(36).slice(-10) + "A1" });
      if (created.emailWarning) { setSuccess(`User ${normalizedUsername} created. Temporary password: ${created.temporaryPassword || "N/A"}`); setError(created.emailWarning); if (shouldShowEmailConfigBadge(created.emailWarning)) setShowEmailConfigBadge(true); }
      else setSuccess(`User ${normalizedUsername} created. Temporary password: ${created.temporaryPassword || "N/A"}`);
      setFormData({ username: "", email: "", role: "DEVELOPER" });
      setShowCreateUserForm(false);
      fetchInitialData();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (shouldShowEmailConfigBadge(msg)) setShowEmailConfigBadge(true);
      setError(msg || (err.response?.status === 409 ? "User already exists." : "Failed to create user"));
    } finally { setIsCreatingUser(false); }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    try {
      setIsCreatingProject(true);
      const created = await createProject(projectForm);
      setProjectForm({ name: "", description: "" });
      setSuccess(`Project "${created.name}" created successfully!`);
      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
      await loadProjectMemberships(updatedProjects);
      setSelectedProjectId(created.id);
    } catch (err: any) { setError(err.response?.data?.message || "Failed to create project"); }
    finally { setIsCreatingProject(false); }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!selectedProjectId || memberForm.userIds.length === 0) { setError("Please select a project and at least one user."); return; }
    try {
      setIsAddingMember(true);
      const createdMembers = await addProjectMembers(selectedProjectId, memberForm.userIds, memberForm.role);
      const addedCount = createdMembers.length, failedCount = memberForm.userIds.length - addedCount;
      if (addedCount > 0 && failedCount === 0) setSuccess(`${addedCount} user(s) added to project.`);
      else if (addedCount > 0) setSuccess(`${addedCount} added. ${failedCount} failed (already member or invalid).`);
      else setError("Failed to add selected users to project.");
      setMemberForm({ userIds: [], role: "DEVELOPER" });
      const members = await getProjectMembers(selectedProjectId);
      setProjectMembers(members);
      setProjectMembersByProject((prev) => ({ ...prev, [selectedProjectId]: members }));
      const refreshedProjects = await getProjects();
      setProjects(refreshedProjects);
      await loadProjectMemberships(refreshedProjects);
    } catch (err: any) { setError(err.response?.data?.message || "Failed to add user to project"); }
    finally { setIsAddingMember(false); }
  };

  const toggleUserStatus = async (target: User) => {
    if (target.role === "ADMIN") { setError("Admin accounts cannot be activated/deactivated from this panel."); return; }
    try {
      setError(""); setSuccess("");
      if (target.isActive) { await deactivateUser(target.id); setSuccess(`User ${target.username} deactivated.`); }
      else { await activateUser(target.id); setSuccess(`User ${target.username} activated.`); }
      const data = await getUsers(); setUsers(data);
    } catch (err: any) { setError(err.response?.data?.message || "Failed to update user status"); }
  };

  const handleResendSetupEmail = async (target: User) => {
    try {
      setError(""); setSuccess(""); setResendingForUserId(target.id);
      await resendPasswordSetupEmail(target.id);
      setSuccess(`Password setup email sent to ${target.email}.`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (shouldShowEmailConfigBadge(msg)) setShowEmailConfigBadge(true);
      setError(msg || "Failed to resend password setup email");
    } finally { setResendingForUserId(null); }
  };

  const handleResetTemporaryPassword = async (target: User) => {
    setError(""); setSuccess("");
    try {
      setResettingPasswordForUserId(target.id);
      const result = await resetTemporaryPassword(target.id);
      setSuccess(`Temp password reset for ${result.username}. New password: ${result.temporaryPassword}`);
      fetchInitialData();
    } catch (err: any) { setError(err?.response?.data?.message || "Failed to reset temporary password"); }
    finally { setResettingPasswordForUserId(null); }
  };

  const handleDeleteUser = async (target: User) => {
    if (!window.confirm(`Delete user ${target.username}? This action cannot be undone.`)) return;
    try {
      setError(""); setSuccess(""); setDeletingUserId(target.id);
      await deleteUser(target.id);
      setSuccess(`User ${target.username} deleted.`);
      const data = await getUsers(); setUsers(data);
    } catch (err: any) { setError(err.response?.data?.message || "Failed to delete user"); }
    finally { setDeletingUserId(null); }
  };

  const handleLogout = () => { logout(); router.push("/login"); };

  if (user?.role !== "ADMIN" && user?.role !== "QA_PM") return null;

  const isAdmin = user?.role === "ADMIN";
  const assignableRoleOptions = isAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((o) => o.value === "DEVELOPER");
  const assignedUserIds = new Set(projectMembers.map((m) => m.user.id));
  const roleUsers = users.filter((u) => u.role === memberForm.role);
  const selectableRoleUsersCount = roleUsers.filter((u) => u.isActive !== false && !assignedUserIds.has(u.id)).length;
  const selectedRoleLabel = ROLE_OPTIONS.find((o) => o.value === memberForm.role)?.label || memberForm.role;

  return (
    <div className="ap-root">
      <GlobalStyles />
      <BgLayers />

      <div className="ap-inner">

        {/* ── Header ── */}
        <div className="ap-header ap-fade">
          <div className="ap-logo-wrap">
            <div className="ap-logo-ring">
              <Image src="/logo.jpeg" alt="logo" width={56} height={56} style={{ objectFit: "cover" }} priority />
            </div>
            <div>
              <div className="ap-title">{isAdmin ? "Admin Panel" : "QA / PM Panel"}</div>
              <div className="ap-subtitle">{isAdmin ? "// user & system management" : "// project assignment"}</div>
              {showEmailConfigBadge && <div className="ap-email-badge">⚠ SMTP auth failed — email unconfigured</div>}
            </div>
          </div>
          <div className="ap-btn-group">
            {isAdmin && (
              <button className="ap-btn ap-btn-primary" onClick={() => setShowCreateUserForm(!showCreateUserForm)}>
                {showCreateUserForm ? "✕ Cancel" : "+ New User"}
              </button>
            )}
            <button className="ap-btn ap-btn-secondary" onClick={handleLogout}>Sign out</button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {error && <div className="ap-alert ap-alert-error ap-fade"><span>⚠</span><span>{error}</span></div>}
        {success && <div className="ap-alert ap-alert-success ap-fade"><span>✓</span><span>{success}</span></div>}

        {/* ── Create Project ── */}
        <div className="ap-card ap-fade">
          <div className="ap-card-header">
            <div className="ap-card-icon ap-card-icon-teal">🗂</div>
            <div>
              <div className="ap-section-title">Create Project</div>
              <div className="ap-section-sub">set up a new workspace</div>
            </div>
          </div>
          <div className="ap-card-body">
            <form onSubmit={handleCreateProject}>
              <div className="ap-form-grid-2" style={{ marginBottom: 16 }}>
                <div>
                  <label className="ap-label">Project Name</label>
                  <input className="ap-input" type="text" placeholder="Enter project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="ap-label">Description</label>
                  <input className="ap-input" type="text" placeholder="Optional description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="ap-submit ap-submit-teal" disabled={isCreatingProject}>
                {isCreatingProject ? "Creating…" : "Create Project"}
              </button>
            </form>
          </div>
        </div>

        {/* ── Project Membership ── */}
        <div className="ap-card ap-fade">
          <div className="ap-card-header">
            <div className="ap-card-icon ap-card-icon-violet">👥</div>
            <div>
              <div className="ap-section-title">Project Membership & Roles</div>
              <div className="ap-section-sub">assign users to projects</div>
            </div>
          </div>
          <div className="ap-card-body">
            <form onSubmit={handleAddMember} style={{ marginBottom: 20 }}>
              <div className="ap-form-grid-4">
                <div>
                  <label className="ap-label">Project</label>
                  <select className="ap-select" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")} required>
                    <option value="">Select project…</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ap-label">
                    {selectedRoleLabel} Users{" "}
                    {memberForm.userIds.length > 0 && <span className="ap-count-badge">{memberForm.userIds.length}</span>}
                  </label>
                  <div style={{ background: "rgba(0,8,16,0.7)", border: "1px solid rgba(0,212,200,0.15)", borderRadius: 11, padding: "4px 10px" }}>
                    <div className="ap-checkbox-list">
                      {roleUsers.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--t3)", padding: "6px 0", fontFamily: "var(--f-m)" }}>No users with this role.</div>
                      ) : roleUsers.map((u) => {
                        const checked = memberForm.userIds.includes(u.id);
                        const alreadyAssigned = assignedUserIds.has(u.id);
                        const inactive = u.isActive === false;
                        const disabled = alreadyAssigned || inactive;
                        return (
                          <label key={u.id} className={`ap-checkbox-row${disabled ? " ap-checkbox-row--disabled" : ""}`}>
                            <input type="checkbox" checked={checked} disabled={disabled}
                              onChange={(e) => setMemberForm((prev) => ({
                                ...prev,
                                userIds: e.target.checked ? [...prev.userIds, u.id] : prev.userIds.filter((id) => id !== u.id),
                              }))}
                            />
                            <span>{u.username}{alreadyAssigned ? " · assigned" : ""}{inactive ? " · inactive" : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="ap-label">Role</label>
                  <select className="ap-select" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as Role })} required>
                    {assignableRoleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={{ paddingTop: 22 }}>
                  <button type="submit" className="ap-submit ap-submit-violet" disabled={isAddingMember || memberForm.userIds.length === 0}>
                    {isAddingMember ? "Adding…" : "Add Member"}
                  </button>
                </div>
              </div>
              {selectableRoleUsersCount === 0 && selectedProjectId && (
                <div className="ap-empty-hint" style={{ marginTop: 10 }}>No available active {selectedRoleLabel} users for this project.</div>
              )}
            </form>

            <div className="ap-table-label">Current Project Members</div>
            <div className="ap-table-wrap" style={{ marginBottom: 20 }}>
              <table className="ap-table">
                <thead><tr><th>Username</th><th>Email</th><th>Project Role</th></tr></thead>
                <tbody>
                  {projectMembers.length === 0 ? (
                    <tr><td colSpan={3} className="ap-table-empty">No members for selected project.</td></tr>
                  ) : projectMembers.map((pm) => {
                    const roleOpt = ROLE_OPTIONS.find((r) => r.value === pm.role);
                    return (
                      <tr key={pm.id}>
                        <td style={{ color: "var(--t1)", fontWeight: 700 }}>{pm.user.username}</td>
                        <td style={{ fontFamily: "var(--f-m)", fontSize: 12 }}>{pm.user.email}</td>
                        <td>
                          <span className="ap-role-pill" style={{ background: (roleOpt?.color||"#00d4c8")+"18", color: roleOpt?.color||"#00d4c8", borderColor: (roleOpt?.color||"#00d4c8")+"40" }}>
                            {roleOpt?.label || pm.role}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ap-table-label">All Projects Overview</div>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead><tr><th>Project</th><th>QA / PM</th><th>Developers</th><th>Clients</th></tr></thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={4} className="ap-table-empty">No projects available.</td></tr>
                  ) : projects.map((project) => {
                    const members = project.id === selectedProjectId ? projectMembers : (projectMembersByProject[project.id] || []);
                    const qaPm = members.filter((m) => m.role === "QA_PM");
                    const devs = members.filter((m) => m.role === "DEVELOPER");
                    const clients = members.filter((m) => m.role === "CLIENT");
                    const renderNames = (list: ProjectMember[], emptyText: string) =>
                      list.length === 0 ? <span style={{ color: "var(--t3)", fontSize: 12 }}>{emptyText}</span> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {list.map((m) => <span key={m.id} style={{ color: "var(--t1)", fontWeight: 600 }}>{m.user.username}</span>)}
                        </div>
                      );
                    return (
                      <tr key={project.id}>
                        <td style={{ color: "var(--t1)", fontWeight: 700 }}>{project.name}</td>
                        <td>{renderNames(qaPm, "— none")}</td>
                        <td>{renderNames(devs, "— none")}</td>
                        <td>{renderNames(clients, "— none")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Create User Form ── */}
        {isAdmin && showCreateUserForm && (
          <div className="ap-card ap-fade">
            <div className="ap-card-header">
              <div className="ap-card-icon ap-card-icon-rose">✦</div>
              <div>
                <div className="ap-section-title">Create New User</div>
                <div className="ap-section-sub">account is created; send setup email after</div>
              </div>
            </div>
            <div className="ap-card-body">
              <form onSubmit={handleCreateUser}>
                <div className="ap-form-grid-2" style={{ marginBottom: 16 }}>
                  <div>
                    <label className="ap-label">Username</label>
                    <input className="ap-input" type="text" placeholder="Enter username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                  </div>
                  <div>
                    <label className="ap-label">Email</label>
                    <input className="ap-input" type="email" placeholder="Enter email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="ap-label">Role</label>
                  <select className="ap-select" style={{ maxWidth: 280 }} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}>
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <button type="submit" className="ap-submit ap-submit-rose" style={{ maxWidth: 280 }} disabled={isCreatingUser}>
                  {isCreatingUser ? "Creating…" : "Create User"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Users List ── */}
        {isAdmin && (
          <div className="ap-card ap-fade">
            <div className="ap-card-header">
              <div className="ap-card-icon ap-card-icon-teal">⊞</div>
              <div>
                <div className="ap-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  All Users <span className="ap-count-badge">{users.length}</span>
                </div>
                <div className="ap-section-sub">accounts & access control</div>
              </div>
            </div>
            <div style={{ padding: "0 0 24px" }}>
              {isLoading ? (
                <div className="ap-loading"><div className="ap-spinner" />Loading users…</div>
              ) : (
                <div className="ap-table-wrap" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--border)" }}>
                  <table className="ap-table">
                    <thead>
                      <tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const roleOpt = ROLE_OPTIONS.find((r) => r.value === u.role);
                        return (
                          <tr key={u.id}>
                            <td>
                              <div className="ap-user-cell">
                                <div className="ap-avatar" style={{ background: u.avatarColor || getAvatarColor(u.id) }}>
                                  {u.initials || getInitials(u.username)}
                                </div>
                                <span style={{ fontWeight: 700, color: "var(--t1)" }}>{u.username}</span>
                              </div>
                            </td>
                            <td style={{ fontFamily: "var(--f-m)", fontSize: 12 }}>{u.email}</td>
                            <td>
                              <span className="ap-role-pill" style={{ background: (roleOpt?.color||"#00d4c8")+"18", color: roleOpt?.color||"#00d4c8", borderColor: (roleOpt?.color||"#00d4c8")+"40" }}>
                                {roleOpt?.label || u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`ap-status-pill ${u.isActive ? "ap-status-active" : "ap-status-inactive"}`}>
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <div className="ap-action-group">
                                <button className="ap-action-btn ap-action-blue" onClick={() => handleResendSetupEmail(u)} disabled={!u.isActive || resendingForUserId === u.id}>
                                  {resendingForUserId === u.id ? "Sending…" : "Resend Email"}
                                </button>
                                <button className="ap-action-btn ap-action-amber" onClick={() => handleResetTemporaryPassword(u)} disabled={!u.isActive || u.role === "ADMIN" || resettingPasswordForUserId === u.id}>
                                  {resettingPasswordForUserId === u.id ? "Resetting…" : "Reset Password"}
                                </button>
                                {u.id !== user.id && (
                                  <>
                                    {u.role === "ADMIN" ? (
                                      <button className="ap-action-btn ap-action-shield" disabled>Protected</button>
                                    ) : (
                                      <button className="ap-action-btn ap-action-red" onClick={() => toggleUserStatus(u)}>
                                        {u.isActive ? "Deactivate" : "Activate"}
                                      </button>
                                    )}
                                    <button className="ap-action-btn ap-action-rose" onClick={() => handleDeleteUser(u)} disabled={deletingUserId === u.id || u.role === "ADMIN"}>
                                      {deletingUserId === u.id ? "Deleting…" : "Delete"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td style={{ fontFamily: "var(--f-m)", fontSize: 11, color: "var(--t3)" }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}