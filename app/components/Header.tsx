"use client";

import { Bell, MoreHorizontal, Table, List, SlidersHorizontal, Columns3, Plus } from "lucide-react";
import { Role, Notification } from "../types";
import { useState } from "react";
import Image from "next/image";

type Tab = "Kanban" | "Table" | "List";

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  ADMIN:     { label: "Admin",     color: "#fb7185", bg: "rgba(251,113,133,0.1)",  border: "rgba(251,113,133,0.3)"  },
  QA_PM:     { label: "QA / PM",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.3)"   },
  DEVELOPER: { label: "Developer", color: "#00d4c8", bg: "rgba(0,212,200,0.1)",    border: "rgba(0,212,200,0.3)"    },
  CLIENT:    { label: "Client",    color: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.3)"  },
};

/* ── styles ── */
const HeaderStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap');

    .hd-root {
      flex-shrink: 0;
      font-family: 'Outfit', sans-serif;
      background: linear-gradient(180deg, rgba(4,8,14,0.98) 0%, rgba(6,11,18,0.97) 100%);
      border-bottom: 1px solid rgba(0,212,200,0.1);
      position: relative;
      z-index: 20;
    }
    /* bottom shimmer line */
    .hd-root::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(0,212,200,0.25) 30%, rgba(34,211,238,0.2) 50%, rgba(0,212,200,0.25) 70%, transparent 100%);
      pointer-events: none;
    }

    /* ── top row ── */
    .hd-top {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 18px;
    }

    /* ── logo ring ── */
    .hd-logo-ring {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, rgba(0,212,200,0.2), rgba(34,211,238,0.1));
      border: 1px solid rgba(0,212,200,0.35);
      box-shadow: 0 0 16px rgba(0,212,200,0.2), inset 0 1px 0 rgba(255,255,255,0.06);
      animation: hd-logoPulse 4s ease-in-out infinite;
      overflow: hidden;
    }
    @keyframes hd-logoPulse {
      0%,100% { box-shadow: 0 0 16px rgba(0,212,200,0.2), inset 0 1px 0 rgba(255,255,255,0.06); }
      50%      { box-shadow: 0 0 28px rgba(0,212,200,0.45), inset 0 1px 0 rgba(255,255,255,0.1); }
    }
    .hd-logo-fallback {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,212,200,0.1); border: 1px solid rgba(0,212,200,0.25);
    }

    /* ── project name ── */
    .hd-project-name {
      font-size: 14px; font-weight: 700; color: #e2e8f0; line-height: 1.2;
      letter-spacing: -0.2px;
    }
    .hd-project-sub {
      font-size: 9px; color: rgba(0,212,200,0.45);
      font-family: 'DM Mono', monospace; letter-spacing: 1px; margin-top: 1px;
    }

    /* ── right cluster ── */
    .hd-right { display: flex; align-items: center; gap: 8px; }
    .hd-sep   { width: 1px; height: 20px; background: rgba(0,212,200,0.12); }

    /* ── role badge ── */
    .hd-role-badge {
      padding: 4px 10px; border-radius: 20px;
      font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; font-family: 'DM Mono', monospace;
      border: 1px solid;
    }

    /* ── add item button ── */
    .hd-add-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 7px 13px; border-radius: 10px;
      font-size: 12px; font-weight: 700; border: none; cursor: pointer;
      font-family: 'Outfit', sans-serif; transition: all .22s;
      background: linear-gradient(135deg, #00b8ad, #00d4c8);
      color: #020509;
      box-shadow: 0 3px 12px rgba(0,212,200,0.35);
      position: relative; overflow: hidden;
    }
    .hd-add-btn::before {
      content: ''; position: absolute; top:0; left:-100%; width:60%; height:100%;
      background: linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent);
      transform: skewX(-20deg); transition: left .5s; pointer-events:none;
    }
    .hd-add-btn:hover::before { left: 140%; }
    .hd-add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(0,212,200,0.55); }

    /* ── notification bell ── */
    .hd-bell-btn {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(0,212,200,0.12); cursor: pointer;
      transition: all .2s; position: relative;
      background: transparent;
      color: rgba(0,212,200,0.45);
    }
    .hd-bell-btn:hover, .hd-bell-btn--open {
      background: rgba(0,212,200,0.08);
      border-color: rgba(0,212,200,0.3);
      color: var(--teal, #00d4c8);
    }
    .hd-bell-badge {
      position: absolute; top: -3px; right: -3px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #fb7185; border: 2px solid rgba(4,8,14,0.98);
      display: flex; align-items: center; justify-content: center;
      font-size: 8px; font-weight: 800; color: #fff; font-family: 'DM Mono', monospace;
      animation: hd-badgePop .4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes hd-badgePop { from{opacity:0;transform:scale(.5);} to{opacity:1;transform:scale(1);} }

    /* ── notification dropdown ── */
    .hd-notif-dropdown {
      position: absolute; right: 0; top: calc(100% + 8px);
      width: 300px; border-radius: 16px; z-index: 50; overflow: hidden;
      background: linear-gradient(145deg, rgba(6,11,18,0.98), rgba(4,8,14,0.99));
      border: 1px solid rgba(0,212,200,0.18);
      box-shadow: 0 20px 60px rgba(0,0,0,0.65), 0 0 40px rgba(0,212,200,0.06);
      animation: hd-dropIn .25s cubic-bezier(.22,1,.36,1);
    }
    @keyframes hd-dropIn { from{opacity:0;transform:translateY(-8px) scale(.97);} to{opacity:1;transform:translateY(0) scale(1);} }
    .hd-notif-header {
      padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid rgba(0,212,200,0.1);
      background: rgba(0,212,200,0.04);
    }
    .hd-notif-title { font-size: 11px; font-weight: 700; color: #e2e8f0; font-family: 'DM Mono', monospace; letter-spacing: 1px; }
    .hd-mark-all {
      font-size: 10px; font-weight: 600; color: rgba(0,212,200,0.7);
      background: none; border: none; cursor: pointer; font-family: 'DM Mono', monospace;
      transition: color .2s; padding: 0;
    }
    .hd-mark-all:hover { color: #00d4c8; }

    /* ── notification list — scrollbar ── */
    .hd-notif-list {
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.4) rgba(0,8,16,0.5);
    }
    .hd-notif-list::-webkit-scrollbar       { width: 4px; }
    .hd-notif-list::-webkit-scrollbar-track { background: rgba(0,8,16,0.5); border-radius: 4px; }
    .hd-notif-list::-webkit-scrollbar-thumb { background: rgba(0,212,200,0.4); border-radius: 4px; }
    .hd-notif-list::-webkit-scrollbar-thumb:hover { background: rgba(0,212,200,0.65); }

    .hd-notif-empty {
      padding: 32px 16px; text-align: center;
      font-size: 12px; color: rgba(61,90,110,0.8); font-family: 'DM Mono', monospace;
    }
    .hd-notif-item {
      width: 100%; text-align: left; padding: 12px 16px;
      border-bottom: 1px solid rgba(0,212,200,0.06);
      background: transparent; border-left: none; border-right: none; border-top: none;
      cursor: pointer; transition: background .15s; display: block;
    }
    .hd-notif-item:hover { background: rgba(0,212,200,0.04); }
    .hd-notif-item:last-child { border-bottom: none; }
    .hd-notif-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
    }
    .hd-notif-dot--unread { background: #00d4c8; box-shadow: 0 0 6px #00d4c8; animation: hd-dotBlink 2s infinite; }
    .hd-notif-dot--read   { background: rgba(61,90,110,0.5); }
    @keyframes hd-dotBlink { 0%,100%{opacity:1;} 50%{opacity:.3;} }

    /* ── more button ── */
    .hd-more-btn {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: 1px solid rgba(0,212,200,0.1);
      color: rgba(0,212,200,0.35); cursor: pointer; transition: all .2s;
    }
    .hd-more-btn:hover { background: rgba(0,212,200,0.07); border-color: rgba(0,212,200,0.25); color: rgba(0,212,200,0.7); }

    /* ── tabs row ── */
    .hd-tabs-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 18px;
    }
    .hd-tabs { display: flex; align-items: center; gap: 2px; }
    .hd-tab {
      display: flex; align-items: center; gap: 5px;
      padding: 8px 14px; font-size: 12px; font-weight: 600;
      border: none; background: transparent; cursor: pointer;
      transition: all .2s; font-family: 'Outfit', sans-serif;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      position: relative;
    }
    .hd-tab--active {
      color: #00d4c8;
      border-bottom-color: #00d4c8;
    }
    .hd-tab--active::before {
      content: ''; position: absolute; bottom: -1px; left: 20%; right: 20%; height: 2px;
      background: linear-gradient(90deg, transparent, rgba(0,212,200,0.6), transparent);
      filter: blur(2px);
    }
    .hd-tab--inactive { color: rgba(61,90,110,0.9); }
    .hd-tab--inactive:hover { color: rgba(0,212,200,0.6); }

    /* ── filter button ── */
    .hd-filter-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 13px; border-radius: 9px;
      font-size: 11px; font-weight: 700; cursor: pointer;
      transition: all .22s; font-family: 'Outfit', sans-serif;
      margin-bottom: 6px; border: 1px solid;
    }
    .hd-filter-btn--active {
      background: rgba(0,212,200,0.12); color: #00d4c8;
      border-color: rgba(0,212,200,0.35);
      box-shadow: 0 0 12px rgba(0,212,200,0.15);
    }
    .hd-filter-btn--inactive {
      background: rgba(255,255,255,0.04); color: rgba(61,90,110,0.9);
      border-color: rgba(0,212,200,0.08);
    }
    .hd-filter-btn--inactive:hover {
      background: rgba(0,212,200,0.07); color: rgba(0,212,200,0.7);
      border-color: rgba(0,212,200,0.2);
    }
    .hd-filter-btn--active:hover { box-shadow: 0 0 18px rgba(0,212,200,0.3); }
  `}</style>
);

export default function Header({
  activeTab,
  onTabChange,
  currentRole,
  projectName,
  logoSrc,
  logoAlt = "Project logo",
  notifications,
  showNotifications = true,
  onFilterToggle,
  filterActive,
  onAddItem,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  currentRole: Role;
  projectName: string;
  logoSrc?: string;
  logoAlt?: string;
  notifications: Notification[];
  showNotifications?: boolean;
  onFilterToggle: () => void;
  filterActive: boolean;
  onAddItem?: () => void;
  onMarkNotificationRead?: (id: number) => void;
  onMarkAllNotificationsRead?: () => void;
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const unread = notifications.filter((n) => !n.isRead).length;
  const role = ROLE_CONFIG[currentRole];

  return (
    <>
      <HeaderStyles />
      <div className="hd-root">

        {/* ── Top Row ── */}
        <div className="hd-top">

          {/* Left — logo + project name */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {logoSrc ? (
              <div className="hd-logo-ring logo-frame-animated">
                <Image src={logoSrc} alt={logoAlt} width={24} height={24} className="logo-img-sm logo-color-animate object-cover" />
              </div>
            ) : (
              <div className="hd-logo-fallback">
                <Columns3 size={15} style={{ color:"rgba(0,212,200,0.7)" }} />
              </div>
            )}
            <div>
              <div className="hd-project-name">{projectName}</div>
              <div className="hd-project-sub">// bug & feature tracker</div>
            </div>
          </div>

          {/* Right cluster */}
          <div className="hd-right">

            {/* Role badge */}
            <span className="hd-role-badge" style={{ color:role.color, background:role.bg, borderColor:role.border }}>
              {role.label}
            </span>

            <div className="hd-sep" />

            {/* Add Item — QA_PM / ADMIN only */}
            {(currentRole === "QA_PM" || currentRole === "ADMIN") && (
              <button onClick={onAddItem} className="hd-add-btn">
                <Plus size={12} /> New Item
              </button>
            )}

            {/* Notifications */}
            {showNotifications && (
              <div style={{ position:"relative" }}>
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className={`hd-bell-btn${showNotifs ? " hd-bell-btn--open" : ""}`}
                >
                  <Bell size={15} />
                  {unread > 0 && <span className="hd-bell-badge">{unread}</span>}
                </button>

                {showNotifs && (
                  <div className="hd-notif-dropdown">
                    <div className="hd-notif-header">
                      <span className="hd-notif-title">NOTIFICATIONS</span>
                      {unread > 0 && (
                        <button className="hd-mark-all" onClick={onMarkAllNotificationsRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="hd-notif-list">
                      {notifications.length === 0 ? (
                        <div className="hd-notif-empty">No notifications</div>
                      ) : notifications.map((n) => (
                        <button
                          key={n.id}
                          className="hd-notif-item"
                          onClick={() => onMarkNotificationRead?.(n.id)}
                          style={{ opacity: n.isRead ? 0.45 : 1 }}
                        >
                          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                            <div className={`hd-notif-dot ${n.isRead ? "hd-notif-dot--read" : "hd-notif-dot--unread"}`} />
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", marginBottom:2 }}>{n.title}</div>
                              <div style={{ fontSize:11, color:"rgba(61,90,110,0.9)", fontFamily:"'DM Mono',monospace", lineHeight:1.4 }}>{n.body}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* More */}
            <button className="hd-more-btn">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* ── Tabs Row ── */}
        <div className="hd-tabs-row">
          <div className="hd-tabs">
            {(["Kanban", "Table", "List"] as Tab[]).map((tab) => {
              const Icon = tab === "Kanban" ? Columns3 : tab === "Table" ? Table : List;
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={`hd-tab ${active ? "hd-tab--active" : "hd-tab--inactive"}`}
                >
                  <Icon size={13} />{tab}
                </button>
              );
            })}
          </div>

          <button
            onClick={onFilterToggle}
            className={`hd-filter-btn ${filterActive ? "hd-filter-btn--active" : "hd-filter-btn--inactive"}`}
          >
            <SlidersHorizontal size={12} />
            {filterActive ? "Filtering" : "Filter"}
          </button>
        </div>

      </div>
    </>
  );
}