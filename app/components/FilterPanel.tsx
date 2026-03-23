"use client";

import { X, ChevronDown, Search } from "lucide-react";
import { WorkItemFilter, WorkItemType, WorkItemStatus, Priority, ClientReviewStatus, User } from "../types";

type Props = {
  filter: WorkItemFilter;
  onChange: (f: WorkItemFilter) => void;
  onClose: () => void;
  members: User[];
};

/* ─── Injected styles ─────────────────────────────────────────────────── */
const PanelStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap');

    .fp-root {
      font-family: 'Outfit', sans-serif;
      width: 260px;
      flex-shrink: 0;
      max-height: calc(100vh - 140px);

      /* ── scrollbar ── */
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.45) rgba(0,8,16,0.5);

      background: linear-gradient(160deg, rgba(6,11,18,0.97), rgba(4,8,14,0.99));
      border: 1px solid rgba(0,212,200,0.18);
      border-radius: 20px;
      padding: 20px;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.03),
        0 20px 60px rgba(0,0,0,0.6),
        0 0 50px rgba(0,212,200,0.06);
      position: relative;
    }
    .fp-root::-webkit-scrollbar       { width: 4px; }
    .fp-root::-webkit-scrollbar-track { background: rgba(0,8,16,0.5); border-radius: 4px; }
    .fp-root::-webkit-scrollbar-thumb { background: rgba(0,212,200,0.45); border-radius: 4px; }
    .fp-root::-webkit-scrollbar-thumb:hover { background: rgba(0,212,200,0.7); }

    /* shimmer top edge */
    .fp-root::before {
      content: '';
      position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,212,200,0.7), rgba(34,211,238,0.5), rgba(0,212,200,0.7), transparent);
      border-radius: 1px;
      animation: fp-topBar 3.5s ease-in-out infinite alternate;
    }
    @keyframes fp-topBar {
      from { opacity: 0.5; filter: blur(0); }
      to   { opacity: 1;   filter: blur(0.5px); }
    }

    /* ── header ── */
    .fp-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px; padding-bottom: 14px;
      border-bottom: 1px solid rgba(0,212,200,0.12);
    }
    .fp-title {
      font-size: 11px; font-weight: 700; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(0,212,200,0.8);
      font-family: 'DM Mono', monospace;
    }
    .fp-header-actions { display: flex; align-items: center; gap: 6px; }

    /* ── clear button ── */
    .fp-clear-btn {
      padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 700;
      border: 1px solid rgba(0,212,200,0.25); cursor: pointer; transition: all .2s;
      background: rgba(0,212,200,0.07); color: rgba(0,212,200,0.7);
      font-family: 'DM Mono', monospace; letter-spacing: 0.5px;
    }
    .fp-clear-btn:hover {
      background: rgba(0,212,200,0.15); border-color: rgba(0,212,200,0.5);
      color: #00d4c8; transform: translateY(-1px);
    }

    /* ── close button ── */
    .fp-close-btn {
      width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(251,113,133,0.2); cursor: pointer; transition: all .2s;
      background: rgba(251,113,133,0.07); color: rgba(251,113,133,0.6);
    }
    .fp-close-btn:hover {
      background: rgba(251,113,133,0.2); border-color: rgba(251,113,133,0.5);
      color: #fb7185; transform: scale(1.05);
    }

    /* ── section ── */
    .fp-section { margin-bottom: 16px; }
    .fp-section:last-child { margin-bottom: 0; }

    /* ── label ── */
    .fp-label {
      display: block; font-size: 9px; font-weight: 500; letter-spacing: 1.8px;
      text-transform: uppercase; color: rgba(0,212,200,0.5);
      margin-bottom: 7px; font-family: 'DM Mono', monospace;
    }

    /* ── search box ── */
    .fp-search-wrap {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px; border-radius: 11px;
      background: rgba(0,8,16,0.7); border: 1px solid rgba(0,212,200,0.15);
      transition: all .25s;
    }
    .fp-search-wrap:focus-within {
      border-color: rgba(0,212,200,0.55);
      box-shadow: 0 0 0 3px rgba(0,212,200,0.1), 0 0 16px rgba(0,212,200,0.07);
      background: rgba(0,212,200,0.04);
    }
    .fp-search-icon { color: rgba(0,212,200,0.5); flex-shrink: 0; }
    .fp-search-input {
      background: transparent; border: none; outline: none;
      color: #e2e8f0; font-size: 12px; flex: 1;
      font-family: 'Outfit', sans-serif;
    }
    .fp-search-input::placeholder { color: rgba(61,90,110,0.8); }

    /* ── select wrapper ── */
    .fp-select-wrap {
      position: relative;
    }
    .fp-select {
      width: 100%; padding: 9px 32px 9px 12px; border-radius: 11px;
      font-size: 12px; font-family: 'Outfit', sans-serif;
      background: rgba(0,8,16,0.7); border: 1px solid rgba(0,212,200,0.15);
      color: #e2e8f0; outline: none; cursor: pointer;
      appearance: none; -webkit-appearance: none;
      transition: all .25s;
    }
    .fp-select:hover { border-color: rgba(0,212,200,0.3); }
    .fp-select:focus {
      border-color: rgba(0,212,200,0.55);
      box-shadow: 0 0 0 3px rgba(0,212,200,0.1), 0 0 16px rgba(0,212,200,0.07);
      background: rgba(0,212,200,0.04);
    }
    .fp-select option { background: #060b11; color: #e2e8f0; }
    .fp-chevron {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      color: rgba(0,212,200,0.5); pointer-events: none;
      transition: color .2s;
    }
    .fp-select:focus ~ .fp-chevron { color: rgba(0,212,200,0.9); }

    /* ── datetime input ── */
    .fp-datetime {
      width: 100%; padding: 9px 12px; border-radius: 11px;
      font-size: 12px; font-family: 'Outfit', sans-serif;
      background: rgba(0,8,16,0.7); border: 1px solid rgba(0,212,200,0.15);
      color: #e2e8f0; outline: none; transition: all .25s;
      color-scheme: dark;
    }
    .fp-datetime:hover  { border-color: rgba(0,212,200,0.3); }
    .fp-datetime:focus  {
      border-color: rgba(0,212,200,0.55);
      box-shadow: 0 0 0 3px rgba(0,212,200,0.1), 0 0 16px rgba(0,212,200,0.07);
      background: rgba(0,212,200,0.04);
    }

    /* ── divider between groups ── */
    .fp-divider {
      height: 1px; background: rgba(0,212,200,0.08); margin: 14px 0;
    }

    /* ── active filter dot ── */
    .fp-active-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #00d4c8; box-shadow: 0 0 6px #00d4c8;
      animation: fp-blink 2s infinite;
    }
    @keyframes fp-blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
  `}</style>
);

export default function FilterPanel({ filter, onChange, onClose, members }: Props) {
  const set = <K extends keyof WorkItemFilter>(key: K, val: WorkItemFilter[K]) =>
    onChange({ ...filter, [key]: val });

  const assignedToValue = (() => {
    if (filter.assignedTo === "unassigned") return "unassigned";
    if (typeof filter.assignedTo === "number" && !Number.isNaN(filter.assignedTo)) return String(filter.assignedTo);
    return "";
  })();

  const hasActive = Object.values(filter).some((v) => v !== "" && v !== undefined);

  return (
    <>
      <PanelStyles />
      <div className="fp-root">

        {/* ── Header ── */}
        <div className="fp-header">
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {hasActive && <div className="fp-active-dot" />}
            <span className="fp-title">Filters</span>
          </div>
          <div className="fp-header-actions">
            {hasActive && (
              <button className="fp-clear-btn" onClick={() => onChange({ sortBy: "newest" })}>
                Clear all
              </button>
            )}
            <button className="fp-close-btn" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="fp-section">
          <label className="fp-label">Search</label>
          <div className="fp-search-wrap">
            <Search size={13} className="fp-search-icon" />
            <input
              className="fp-search-input"
              placeholder="Title, description…"
              value={filter.textSearch ?? ""}
              onChange={(e) => set("textSearch", e.target.value)}
            />
          </div>
        </div>

        <div className="fp-divider" />

        {/* ── Type ── */}
        <div className="fp-section">
          <label className="fp-label">Type</label>
          <div className="fp-select-wrap">
            <select className="fp-select" value={filter.type ?? ""} onChange={(e) => set("type", e.target.value as WorkItemType | "")}>
              <option value="">All types</option>
              <option value="BUG">🐛 Bug</option>
              <option value="FEATURE">✨ Feature</option>
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        {/* ── Status ── */}
        <div className="fp-section">
          <label className="fp-label">Status</label>
          <div className="fp-select-wrap">
            <select className="fp-select" value={filter.status ?? ""} onChange={(e) => set("status", e.target.value as WorkItemStatus | "")}>
              <option value="">All statuses</option>
              <option value="BUG_LIST">📋 Bug List</option>
              <option value="IN_PROGRESS">⚙️ In Progress</option>
              <option value="QA_FIX">🔍 QA Fix</option>
              <option value="DONE">✅ Done</option>
              <option value="PUBLISHED">🚀 Published</option>
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        {/* ── Priority ── */}
        <div className="fp-section">
          <label className="fp-label">Priority</label>
          <div className="fp-select-wrap">
            <select className="fp-select" value={filter.priority ?? ""} onChange={(e) => set("priority", e.target.value as Priority | "")}>
              <option value="">All priorities</option>
              <option value="LOW">🟢 Low</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="HIGH">🟠 High</option>
              <option value="CRITICAL">🔴 Critical</option>
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        <div className="fp-divider" />

        {/* ── Assigned To ── */}
        <div className="fp-section">
          <label className="fp-label">Assigned To</label>
          <div className="fp-select-wrap">
            <select
              className="fp-select"
              value={assignedToValue}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) { set("assignedTo", ""); return; }
                if (value === "unassigned") { set("assignedTo", "unassigned"); return; }
                const parsed = Number(value);
                set("assignedTo", Number.isNaN(parsed) ? "" : parsed);
              }}
            >
              <option value="">Anyone</option>
              <option value="unassigned">⚪ Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        {/* ── Created By ── */}
        <div className="fp-section">
          <label className="fp-label">Created By</label>
          <div className="fp-select-wrap">
            <select
              className="fp-select"
              value={filter.createdBy ?? ""}
              onChange={(e) => set("createdBy", e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Anyone</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        <div className="fp-divider" />

        {/* ── Created Range ── */}
        <div className="fp-section">
          <label className="fp-label">Created From</label>
          <input
            type="datetime-local"
            className="fp-datetime"
            value={filter.createdFrom ?? ""}
            onChange={(e) => set("createdFrom", e.target.value || undefined)}
          />
        </div>

        <div className="fp-section">
          <label className="fp-label">Created To</label>
          <input
            type="datetime-local"
            className="fp-datetime"
            value={filter.createdTo ?? ""}
            onChange={(e) => set("createdTo", e.target.value || undefined)}
          />
        </div>

        <div className="fp-divider" />

        {/* ── Due Range ── */}
        <div className="fp-section">
          <label className="fp-label">Due From</label>
          <input
            type="datetime-local"
            className="fp-datetime"
            value={filter.dueFrom ?? ""}
            onChange={(e) => set("dueFrom", e.target.value || undefined)}
          />
        </div>

        <div className="fp-section">
          <label className="fp-label">Due To</label>
          <input
            type="datetime-local"
            className="fp-datetime"
            value={filter.dueTo ?? ""}
            onChange={(e) => set("dueTo", e.target.value || undefined)}
          />
        </div>

        <div className="fp-divider" />

        {/* ── Client Review ── */}
        <div className="fp-section">
          <label className="fp-label">Client Review</label>
          <div className="fp-select-wrap">
            <select
              className="fp-select"
              value={filter.clientReviewStatus ?? ""}
              onChange={(e) => set("clientReviewStatus", e.target.value as ClientReviewStatus | "")}
            >
              <option value="">All</option>
              <option value="NONE">— None</option>
              <option value="ACCEPTED">✓ Accepted</option>
              <option value="REJECTED">✗ Rejected</option>
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

        {/* ── Sort By ── */}
        <div className="fp-section">
          <label className="fp-label">Sort By</label>
          <div className="fp-select-wrap">
            <select
              className="fp-select"
              value={filter.sortBy ?? "newest"}
              onChange={(e) => set("sortBy", e.target.value as WorkItemFilter["sortBy"])}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="due_soon">Due soon</option>
              <option value="priority">Priority</option>
            </select>
            <ChevronDown size={13} className="fp-chevron" />
          </div>
        </div>

      </div>
    </>
  );
}