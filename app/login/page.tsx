"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";
import { resendPasswordSetupLink } from "../lib/api/auth";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────
   STYLES — injected once, scoped with lp- prefix
───────────────────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

    /* ── CSS tokens ── */
    :root {
      --c-bg:       #020509;
      --c-surface:  #080d14;
      --c-card:     #0b1220;
      --c-teal:     #00d4c8;
      --c-cyan:     #22d3ee;
      --c-rose:     #fb7185;
      --c-amber:    #fbbf24;
      --c-violet:   #a78bfa;
      --c-green:    #34d399;
      --c-border:   rgba(0,212,200,0.18);
      --c-borderg:  rgba(0,212,200,0.55);
      --f-display:  'Outfit', sans-serif;
      --f-mono:     'DM Mono', monospace;
    }

    /* ── page root ── */
    .lp-root {
      font-family: var(--f-display);
      position: relative;
      overflow: hidden;
    }

    /* ── MESH BACKGROUND ── */
    .lp-mesh {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 80% 60% at 10% 20%,  rgba(0,212,200,0.18)  0%, transparent 60%),
        radial-gradient(ellipse 60% 50% at 90% 80%,  rgba(251,113,133,0.14) 0%, transparent 55%),
        radial-gradient(ellipse 50% 70% at 50% 50%,  rgba(167,139,250,0.10) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 80% 10%,  rgba(34,211,238,0.12)  0%, transparent 50%),
        #020509;
      animation: lp-meshPulse 10s ease-in-out infinite alternate;
    }
    @keyframes lp-meshPulse {
      0%   { filter: hue-rotate(0deg) brightness(1); }
      50%  { filter: hue-rotate(18deg) brightness(1.06); }
      100% { filter: hue-rotate(-12deg) brightness(0.96); }
    }

    /* ── SCANLINES ── */
    .lp-scan {
      position: fixed; inset: 0; z-index: 1; pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.08) 2px,
        rgba(0,0,0,0.08) 4px
      );
    }

    /* ── NOISE grain overlay ── */
    .lp-noise {
      position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.035;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-repeat: repeat;
      background-size: 200px 200px;
      animation: lp-grainShift 0.4s steps(1) infinite;
    }
    @keyframes lp-grainShift {
      0%  { background-position: 0 0; }
      25% { background-position: -30px 15px; }
      50% { background-position: 20px -10px; }
      75% { background-position: -10px -25px; }
    }

    /* ── ORBITING RINGS ── */
    .lp-ring {
      position: fixed; border-radius: 50%; pointer-events: none; z-index: 1;
      border: 1px solid;
      animation: lp-ringRotate linear infinite;
    }
    .lp-ring-1 {
      width: 700px; height: 700px;
      top: 50%; left: 50%; margin: -350px 0 0 -350px;
      border-color: rgba(0,212,200,0.07);
      animation-duration: 40s;
    }
    .lp-ring-2 {
      width: 520px; height: 520px;
      top: 50%; left: 50%; margin: -260px 0 0 -260px;
      border-color: rgba(251,113,133,0.06);
      animation-duration: 28s; animation-direction: reverse;
    }
    .lp-ring-3 {
      width: 340px; height: 340px;
      top: 50%; left: 50%; margin: -170px 0 0 -170px;
      border-color: rgba(167,139,250,0.08);
      animation-duration: 18s;
    }
    @keyframes lp-ringRotate { to { transform: rotate(360deg); } }

    /* ── AURORA STREAKS ── */
    .lp-streak {
      position: fixed; pointer-events: none; z-index: 1;
      border-radius: 100px;
      filter: blur(40px);
      animation: lp-streakDrift ease-in-out infinite alternate;
    }
    .lp-streak-1 {
      width: 500px; height: 3px;
      top: 25%; left: -100px;
      background: linear-gradient(90deg, transparent, var(--c-teal), transparent);
      animation-duration: 9s; animation-delay: 0s;
    }
    .lp-streak-2 {
      width: 400px; height: 2px;
      top: 65%; right: -80px;
      background: linear-gradient(90deg, transparent, var(--c-rose), transparent);
      animation-duration: 11s; animation-delay: 3s;
    }
    .lp-streak-3 {
      width: 350px; height: 2px;
      top: 45%; left: 20%;
      background: linear-gradient(90deg, transparent, var(--c-violet), transparent);
      animation-duration: 7s; animation-delay: 6s;
    }
    @keyframes lp-streakDrift {
      from { transform: translateX(-60px) scaleX(0.7); opacity: 0.4; }
      to   { transform: translateX(60px) scaleX(1.2); opacity: 0.9; }
    }

    /* ── FLOATING DOTS ── */
    .lp-dot {
      position: fixed; border-radius: 50%; pointer-events: none; z-index: 1;
      animation: lp-dotFloat linear infinite;
    }
    @keyframes lp-dotFloat {
      0%   { transform: translateY(110vh) scale(0) rotate(0deg); opacity: 0; }
      5%   { opacity: 1; }
      95%  { opacity: 0.7; }
      100% { transform: translateY(-10vh) scale(1.2) rotate(180deg); opacity: 0; }
    }

    /* ── CARD ── */
    .lp-card {
      position: relative; z-index: 10;
      border-radius: 24px !important;
      border: 1px solid var(--c-border) !important;
      background: linear-gradient(145deg, rgba(11,18,32,0.97), rgba(8,13,20,0.99)) !important;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04),
        0 32px 100px rgba(0,0,0,0.8),
        0 0 80px rgba(0,212,200,0.07),
        inset 0 1px 0 rgba(0,212,200,0.12) !important;
      animation: lp-cardIn 0.9s cubic-bezier(.22,1,.36,1) both;
      overflow: visible !important;
    }
    @keyframes lp-cardIn {
      from { opacity: 0; transform: translateY(40px) scale(0.95) rotateX(4deg); filter: blur(4px); }
      to   { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); filter: blur(0); }
    }
    /* top teal glow bar */
    .lp-card::before {
      content: '';
      position: absolute; top: -1px; left: 15%; right: 15%; height: 1px;
      background: linear-gradient(90deg, transparent, var(--c-teal), var(--c-cyan), var(--c-teal), transparent);
      border-radius: 1px;
      animation: lp-topBarGlow 3s ease-in-out infinite alternate;
    }
    @keyframes lp-topBarGlow {
      from { opacity: 0.6; filter: blur(0px); }
      to   { opacity: 1;   filter: blur(1px); }
    }
    /* corner accent */
    .lp-card::after {
      content: '';
      position: absolute; bottom: -1px; right: 20px; left: 20px; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(251,113,133,0.3), transparent);
    }

    /* ── LOGO RING ── */
    .lp-logo-ring {
      border-radius: 20px !important;
      border: 1px solid rgba(0,212,200,0.4) !important;
      background: linear-gradient(135deg, rgba(0,212,200,0.15), rgba(34,211,238,0.08)) !important;
      box-shadow:
        0 0 0 4px rgba(0,212,200,0.06),
        0 0 30px rgba(0,212,200,0.25),
        inset 0 1px 0 rgba(255,255,255,0.1) !important;
      padding: 14px !important;
      animation:
        lp-logoIn 0.8s 0.2s cubic-bezier(.34,1.56,.64,1) both,
        lp-logoGlow 4s 1s ease-in-out infinite alternate !important;
    }
    @keyframes lp-logoIn {
      from { opacity: 0; transform: scale(0.3) rotate(-20deg) translateY(10px); }
      to   { opacity: 1; transform: scale(1) rotate(0deg) translateY(0); }
    }
    @keyframes lp-logoGlow {
      from { box-shadow: 0 0 0 4px rgba(0,212,200,0.06), 0 0 30px rgba(0,212,200,0.25), inset 0 1px 0 rgba(255,255,255,0.1); }
      to   { box-shadow: 0 0 0 8px rgba(0,212,200,0.10), 0 0 55px rgba(0,212,200,0.50), inset 0 1px 0 rgba(255,255,255,0.18); }
    }

    /* ── HEADINGS ── */
    .lp-h1 {
      font-family: var(--f-display) !important;
      font-weight: 900 !important;
      font-size: 2rem !important;
      letter-spacing: -1px !important;
      background: linear-gradient(135deg, #ffffff 0%, var(--c-teal) 50%, var(--c-cyan) 100%) !important;
      -webkit-background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      background-clip: text !important;
      animation: lp-fadeUp 0.6s 0.3s cubic-bezier(.22,1,.36,1) both,
                 lp-h1Shimmer 5s 1s linear infinite !important;
      background-size: 200% 100% !important;
    }
    @keyframes lp-h1Shimmer {
      0%,100% { background-position: 0% 50%; }
      50%      { background-position: 100% 50%; }
    }
    .lp-h2 {
      font-family: var(--f-mono) !important;
      font-size: 10px !important;
      font-weight: 400 !important;
      letter-spacing: 3px !important;
      text-transform: uppercase !important;
      color: rgba(0,212,200,0.55) !important;
      animation: lp-fadeUp 0.6s 0.38s cubic-bezier(.22,1,.36,1) both !important;
    }

    @keyframes lp-fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── ALERTS ── */
    .lp-alert-error {
      border-radius: 12px !important;
      background: rgba(251,113,133,0.08) !important;
      border: 1px solid rgba(251,113,133,0.3) !important;
      color: #fda4af !important;
      font-family: var(--f-mono) !important;
      font-size: 12px !important;
      animation: lp-alertIn 0.4s cubic-bezier(.22,1,.36,1) !important;
    }
    .lp-alert-success {
      border-radius: 12px !important;
      background: rgba(52,211,153,0.08) !important;
      border: 1px solid rgba(52,211,153,0.3) !important;
      color: #6ee7b7 !important;
      font-family: var(--f-mono) !important;
      font-size: 12px !important;
      animation: lp-alertIn 0.4s cubic-bezier(.22,1,.36,1) !important;
    }
    @keyframes lp-alertIn {
      from { opacity: 0; transform: scale(0.96) translateY(-6px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* ── LABELS ── */
    .lp-label {
      font-family: var(--f-mono) !important;
      font-size: 10px !important;
      font-weight: 500 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
      color: rgba(0,212,200,0.5) !important;
    }

    /* ── INPUTS ── */
    .lp-input {
      border-radius: 12px !important;
      border: 1px solid rgba(0,212,200,0.15) !important;
      background: rgba(0,10,18,0.7) !important;
      font-family: var(--f-display) !important;
      font-size: 14px !important;
      color: #e2e8f0 !important;
      transition: border-color 0.3s, box-shadow 0.3s, background 0.3s !important;
      padding: 12px 16px !important;
    }
    .lp-input::placeholder { color: rgba(100,130,150,0.5) !important; }
    .lp-input:focus {
      border-color: var(--c-teal) !important;
      background: rgba(0,212,200,0.04) !important;
      box-shadow:
        0 0 0 3px rgba(0,212,200,0.12),
        0 0 20px rgba(0,212,200,0.08) !important;
      outline: none !important;
    }

    /* ── SIGN IN BUTTON ── */
    .lp-btn-primary {
      border-radius: 12px !important;
      font-family: var(--f-display) !important;
      font-size: 15px !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
      background: linear-gradient(135deg, #00b8ad 0%, #00d4c8 45%, #22d3ee 100%) !important;
      color: #020509 !important;
      border: none !important;
      box-shadow:
        0 4px 24px rgba(0,212,200,0.45),
        0 1px 0 rgba(255,255,255,0.2) inset !important;
      transition: transform 0.2s, box-shadow 0.2s !important;
      position: relative; overflow: hidden;
      padding: 13px !important;
      animation: lp-fadeUp 0.6s 0.52s cubic-bezier(.22,1,.36,1) both !important;
    }
    /* animated shimmer sweep */
    .lp-btn-primary::before {
      content: '';
      position: absolute;
      top: 0; left: -120%; width: 70%; height: 100%;
      background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%);
      transform: skewX(-20deg);
      transition: left 0.6s ease;
      pointer-events: none;
    }
    .lp-btn-primary:hover::before { left: 140%; }
    .lp-btn-primary:not(:disabled):hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 8px 36px rgba(0,212,200,0.65), 0 1px 0 rgba(255,255,255,0.2) inset !important;
    }
    .lp-btn-primary:not(:disabled):active {
      transform: translateY(0px) scale(0.98) !important;
    }
    .lp-btn-primary:disabled { opacity: 0.4 !important; cursor: not-allowed !important; }

    /* pulse ring on idle */
    .lp-btn-primary::after {
      content: '';
      position: absolute; inset: -3px;
      border-radius: 15px;
      border: 1px solid rgba(0,212,200,0.4);
      animation: lp-btnRing 2.5s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes lp-btnRing {
      0%,100% { opacity: 0; transform: scale(1); }
      50%      { opacity: 1; transform: scale(1.02); }
    }

    /* ── RESEND BUTTON ── */
    .lp-btn-secondary {
      border-radius: 12px !important;
      font-family: var(--f-display) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      background: transparent !important;
      border: 1px solid rgba(0,212,200,0.2) !important;
      color: rgba(0,212,200,0.7) !important;
      transition: all 0.3s !important;
      padding: 11px !important;
      position: relative; overflow: hidden;
      animation: lp-fadeUp 0.6s 0.6s cubic-bezier(.22,1,.36,1) both !important;
    }
    .lp-btn-secondary::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(0,212,200,0.1), rgba(34,211,238,0.05));
      opacity: 0; transition: opacity 0.3s;
    }
    .lp-btn-secondary:not(:disabled):hover {
      border-color: rgba(0,212,200,0.55) !important;
      color: var(--c-teal) !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 20px rgba(0,212,200,0.15) !important;
    }
    .lp-btn-secondary:not(:disabled):hover::before { opacity: 1; }
    .lp-btn-secondary:disabled { opacity: 0.3 !important; }
  `}</style>
);

/* ── Decorative background layers (purely visual) ── */
const BgLayers = () => (
  <>
    <div className="lp-mesh" />
    <div className="lp-scan" />
    <div className="lp-noise" />
    <div className="lp-ring lp-ring-1" />
    <div className="lp-ring lp-ring-2" />
    <div className="lp-ring lp-ring-3" />
    <div className="lp-streak lp-streak-1" />
    <div className="lp-streak lp-streak-2" />
    <div className="lp-streak lp-streak-3" />
    {/* floating dots */}
    {[
      { s:4, l:"8%",  col:"#00d4c8", dur:"19s", delay:"0s"  },
      { s:3, l:"22%", col:"#fb7185", dur:"24s", delay:"4s"  },
      { s:5, l:"40%", col:"#a78bfa", dur:"15s", delay:"8s"  },
      { s:3, l:"58%", col:"#22d3ee", dur:"22s", delay:"2s"  },
      { s:4, l:"74%", col:"#fbbf24", dur:"17s", delay:"6s"  },
      { s:3, l:"88%", col:"#00d4c8", dur:"26s", delay:"11s" },
      { s:2, l:"95%", col:"#fb7185", dur:"20s", delay:"14s" },
    ].map((d,i) => (
      <div key={i} className="lp-dot" style={{
        width: d.s, height: d.s, left: d.l, bottom: "-8px",
        background: d.col,
        boxShadow: `0 0 ${d.s * 3}px ${d.col}`,
        animationDuration: d.dur, animationDelay: d.delay,
      }} />
    ))}
  </>
);

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      await login({ username, password });
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSetupEmail = async () => {
    setError("");
    setInfo("");

    const identifier = username.trim();
    if (!identifier) {
      setError("Enter your username or email first.");
      return;
    }

    try {
      setIsResending(true);
      await resendPasswordSetupLink({ usernameOrEmail: identifier });
      setInfo("Password setup email sent. Please check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend password setup email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="lp-root flex items-center justify-center min-h-screen" style={{ background: "#020509" }}>
      <GlobalStyles />
      <BgLayers />

      {/* ── EXACT ORIGINAL STRUCTURE — only lp- classnames prepended ── */}
      <div className="lp-card w-full max-w-md p-8 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
        <div className="mb-4 flex justify-center">
          <div className="lp-logo-ring logo-frame logo-frame-animated border border-white/10 bg-black/20">
            <Image src="/logo.jpeg" alt="Login logo" width={44} height={44} className="logo-img logo-color-animate object-cover" priority />
          </div>
        </div>
        <h1 className="lp-h1 text-3xl font-bold text-white mb-6 text-center">Kanban Board</h1>
        <h2 className="lp-h2 text-xl text-gray-300 mb-6 text-center">Sign In</h2>

        {error && (
          <div className="lp-alert-error mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {info && (
          <div className="lp-alert-success mb-4 p-3 rounded bg-green-500/10 border border-green-500/50 text-green-400 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="lp-label block text-sm font-medium text-gray-300 mb-2">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="lp-input w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your username or email"
            />
          </div>

          <div>
            <label htmlFor="password" className="lp-label block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="lp-input w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="lp-btn-primary w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResendSetupEmail}
          disabled={isResending}
          className="lp-btn-secondary mt-3 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium rounded transition-colors"
        >
          {isResending ? "Sending..." : "Resend Password Setup Email"}
        </button>

        {/* <p className="mt-4 text-center text-sm text-gray-500">
          Default credentials: admin / admin123
        </p> */}
      </div>
    </div>
  );
}