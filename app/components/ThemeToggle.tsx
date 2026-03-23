"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme-context";

const ToggleStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');

    .tt-btn {
      position: fixed;
      right: 16px; bottom: 16px; z-index: 100;
      display: flex; align-items: center; gap: 7px;
      padding: 9px 14px; border-radius: 14px;
      font-size: 11px; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase;
      font-family: 'DM Mono', monospace;
      cursor: pointer; border: none;
      transition: transform .25s, box-shadow .25s;
      overflow: hidden;
    }
    @media (min-width: 768px) {
      .tt-btn { right: 24px; bottom: 24px; }
    }

    /* shimmer sweep on hover */
    .tt-btn::before {
      content: '';
      position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
      background: linear-gradient(110deg, transparent, rgba(255,255,255,0.15), transparent);
      transform: skewX(-20deg); transition: left .5s; pointer-events: none;
    }
    .tt-btn:hover::before { left: 140%; }

    /* idle pulse ring */
    .tt-btn::after {
      content: '';
      position: absolute; inset: -3px;
      border-radius: 17px;
      border: 1px solid;
      animation: tt-ring 3s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes tt-ring {
      0%,100% { opacity: 0; transform: scale(1); }
      50%      { opacity: 1; transform: scale(1.03); }
    }

    /* dark mode state */
    .tt-btn--dark {
      background: linear-gradient(135deg, rgba(6,11,18,0.97), rgba(4,8,14,0.99));
      color: rgba(0,212,200,0.85);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 18px rgba(0,212,200,0.1);
      border: 1px solid rgba(0,212,200,0.22);
    }
    .tt-btn--dark::after { border-color: rgba(0,212,200,0.25); }
    .tt-btn--dark:hover  { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.55), 0 0 28px rgba(0,212,200,0.22); }

    /* light mode state */
    .tt-btn--light {
      background: linear-gradient(135deg, #00b8ad, #00d4c8);
      color: #020509;
      box-shadow: 0 8px 24px rgba(0,212,200,0.4), 0 3px 10px rgba(0,0,0,0.2);
      border: 1px solid rgba(0,84,97,0.3);
    }
    .tt-btn--light::after { border-color: rgba(0,212,200,0.45); }
    .tt-btn--light:hover  { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,212,200,0.6), 0 4px 14px rgba(0,0,0,0.25); }

    /* icon wrapper */
    .tt-icon {
      display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0;
      transition: transform .3s;
    }
    .tt-btn:hover .tt-icon { transform: rotate(20deg) scale(1.1); }
    .tt-icon--dark  { background: rgba(0,212,200,0.12); }
    .tt-icon--light { background: rgba(2,5,9,0.15); }
  `}</style>
);

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <>
      <ToggleStyles />
      <button
        type="button"
        onClick={toggleTheme}
        className={`tt-btn ${isLight ? "tt-btn--light" : "tt-btn--dark"}`}
        aria-label="Toggle light mode"
        title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      >
        <span className={`tt-icon ${isLight ? "tt-icon--light" : "tt-icon--dark"}`}>
          {isLight ? <Moon size={12} /> : <Sun size={12} />}
        </span>
        <span>{isLight ? "Dark" : "Light"}</span>
      </button>
    </>
  );
}