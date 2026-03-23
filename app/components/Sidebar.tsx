"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, CheckSquare, FolderKanban, Settings, Users, Plus, Layers, Shield, LogOut } from "lucide-react";
import { Project, Role } from "../types";
import { useAuth } from "../lib/auth-context";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin", QA_PM: "QA / PM", DEVELOPER: "Developer", CLIENT: "Client",
};

const ROLE_CONFIG: Record<Role, { color: string; bg: string; border: string }> = {
  ADMIN:     { color: "#fb7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.3)"  },
  QA_PM:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)"   },
  DEVELOPER: { color: "#00d4c8", bg: "rgba(0,212,200,0.12)",   border: "rgba(0,212,200,0.3)"    },
  CLIENT:    { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)"  },
};

const SidebarStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap');

    /* ── icon rail ── */
    .sb-rail {
      width: 52px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center;
      padding: 14px 0; gap: 4px;
      background: rgba(2,5,9,0.98);
      border-right: 1px solid rgba(0,212,200,0.1);
      position: relative;
    }
    /* right shimmer edge */
    .sb-rail::after {
      content: '';
      position: absolute; top: 15%; bottom: 15%; right: 0; width: 1px;
      background: linear-gradient(180deg, transparent, rgba(0,212,200,0.35), rgba(34,211,238,0.2), transparent);
      pointer-events: none;
    }

    /* ── PM logo button ── */
    .sb-pm-logo {
      width: 34px; height: 34px; border-radius: 11px; margin-bottom: 8px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #00b8ad, #00d4c8);
      box-shadow: 0 0 18px rgba(0,212,200,0.45), 0 3px 10px rgba(0,0,0,0.4);
      font-size: 10px; font-weight: 900; color: #020509;
      font-family: 'DM Mono', monospace; letter-spacing: 0.5px;
      text-decoration: none;
      animation: sb-logoPulse 4s ease-in-out infinite;
      transition: transform .2s;
    }
    .sb-pm-logo:hover { transform: scale(1.06); }
    @keyframes sb-logoPulse {
      0%,100% { box-shadow: 0 0 18px rgba(0,212,200,0.45), 0 3px 10px rgba(0,0,0,0.4); }
      50%      { box-shadow: 0 0 32px rgba(0,212,200,0.75), 0 3px 14px rgba(0,0,0,0.5); }
    }

    /* ── rail icon buttons ── */
    .sb-rail-btn {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: 1px solid transparent;
      color: rgba(61,90,110,0.7); cursor: pointer;
      transition: all .2s; text-decoration: none;
    }
    .sb-rail-btn:hover {
      background: rgba(0,212,200,0.08);
      border-color: rgba(0,212,200,0.2);
      color: rgba(0,212,200,0.7);
    }
    .sb-rail-btn--active {
      background: rgba(0,212,200,0.14);
      border-color: rgba(0,212,200,0.3);
      color: #00d4c8;
      box-shadow: 0 0 12px rgba(0,212,200,0.15);
    }

    /* ── text panel ── */
    .sb-panel {
      width: 218px; flex-shrink: 0;
      display: flex; flex-direction: column;
      padding: 14px 0;
      background: linear-gradient(180deg, rgba(4,8,14,0.97) 0%, rgba(3,6,11,0.98) 100%);
      border-right: 1px solid rgba(0,212,200,0.1);
      font-family: 'Outfit', sans-serif;
      position: relative;

      /* scrollbar */
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,212,200,0.35) rgba(0,8,16,0.4);
    }
    .sb-panel::-webkit-scrollbar       { width: 3px; }
    .sb-panel::-webkit-scrollbar-track { background: rgba(0,8,16,0.4); border-radius: 3px; }
    .sb-panel::-webkit-scrollbar-thumb { background: rgba(0,212,200,0.35); border-radius: 3px; }
    .sb-panel::-webkit-scrollbar-thumb:hover { background: rgba(0,212,200,0.6); }

    /* ── section label ── */
    .sb-section-label {
      font-size: 9px; font-weight: 600; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(0,212,200,0.4);
      font-family: 'DM Mono', monospace;
      padding: 0 12px; margin-bottom: 8px;
    }

    /* ── divider ── */
    .sb-divider {
      height: 1px; margin: 12px 12px;
      background: linear-gradient(90deg, transparent, rgba(0,212,200,0.15), transparent);
    }

    /* ── role button grid ── */
    .sb-role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 0 10px; margin-bottom: 4px; }
    .sb-role-btn {
      padding: 6px 8px; border-radius: 9px; font-size: 10px; font-weight: 600;
      cursor: pointer; transition: all .2s; text-align: left; border: 1px solid;
      font-family: 'Outfit', sans-serif;
    }

    /* ── project item ── */
    .sb-project-btn {
      width: 100%; display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 10px; cursor: pointer;
      border: 1px solid transparent; background: transparent;
      transition: all .2s; margin-bottom: 2px; font-family: 'Outfit', sans-serif;
    }
    .sb-project-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .sb-project-count { font-size: 9px; color: rgba(61,90,110,0.6); font-family: 'DM Mono', monospace; }

    /* ── quick link ── */
    .sb-link {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 10px;
      color: rgba(61,90,110,0.8); font-size: 12px;
      text-decoration: none; transition: all .2s; margin-bottom: 2px;
      border: 1px solid transparent;
    }
    .sb-link:hover {
      background: rgba(0,212,200,0.06);
      border-color: rgba(0,212,200,0.12);
      color: rgba(0,212,200,0.7);
    }

    /* ── user card ── */
    .sb-user-card {
      margin: 0 10px 10px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,212,200,0.04);
      border: 1px solid rgba(0,212,200,0.12);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .sb-avatar {
      width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #00b8ad, #00d4c8);
      font-size: 10px; font-weight: 900; color: #020509;
      font-family: 'DM Mono', monospace;
      box-shadow: 0 0 10px rgba(0,212,200,0.3);
    }

    /* ── logout button ── */
    .sb-logout-btn {
      width: 100%; margin-top: 10px; padding: 8px;
      border-radius: 9px; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      cursor: pointer; transition: all .2s;
      background: rgba(251,113,133,0.07);
      border: 1px solid rgba(251,113,133,0.18);
      color: rgba(251,113,133,0.6);
      font-family: 'Outfit', sans-serif;
    }
    .sb-logout-btn:hover {
      background: rgba(251,113,133,0.14);
      border-color: rgba(251,113,133,0.4);
      color: #fb7185;
      transform: translateY(-1px);
    }
  `}</style>
);

export default function Sidebar({
  activeProjectId,
  onSelectProject,
  projects = [],
  currentRole,
  onRoleChange,
}: {
  activeProjectId: number | null;
  onSelectProject: (id: number) => void;
  projects?: Project[];
  currentRole: Role;
  onRoleChange: (r: Role) => void;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const displayRole = user?.role ? (user.role as Role) : currentRole;
  const rc = ROLE_CONFIG[displayRole] || ROLE_CONFIG[currentRole];

  return (
    <>
      <SidebarStyles />
      <div style={{ display:"flex", height:"100%", flexShrink:0 }}>

        {/* ── Icon Rail ── */}
        <div className="sb-rail">
          {/* PM logo */}
          <Link href="/" className="sb-pm-logo">PM</Link>

          {/* Nav icons */}
          <Link href="/" className="sb-rail-btn"><Home size={16} /></Link>
          <button className="sb-rail-btn sb-rail-btn--active"><CheckSquare size={16} /></button>
          <button className="sb-rail-btn"><FolderKanban size={16} /></button>
          <button className="sb-rail-btn"><Users size={16} /></button>

          {user?.role === "ADMIN" && (
            <Link href="/admin" className="sb-rail-btn">
              <Shield size={16} />
            </Link>
          )}

          <div style={{ marginTop:"auto" }}>
            <button className="sb-rail-btn"><Settings size={15} /></button>
          </div>
        </div>

        {/* ── Text Panel ── */}
        <div className="sb-panel">

          {/* Role switcher */}
          <div style={{ padding:"0 0 4px" }}>
            <div className="sb-section-label">Your Role</div>
            <div className="sb-role-grid">
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
                const active = r === currentRole;
                const cfg = ROLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    className="sb-role-btn"
                    style={{
                      color:   active ? cfg.color : "rgba(61,90,110,0.7)",
                      background: active ? cfg.bg   : "rgba(255,255,255,0.03)",
                      borderColor: active ? cfg.border : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sb-divider" />

          {/* Projects */}
          <div style={{ padding:"0 0 4px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", marginBottom:8 }}>
              <span className="sb-section-label" style={{ padding:0, margin:0 }}>Projects</span>
              <button style={{ color:"rgba(0,212,200,0.4)", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", transition:"color .2s" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color="#00d4c8";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color="rgba(0,212,200,0.4)";}}>
                <Plus size={13} />
              </button>
            </div>
            <div style={{ padding:"0 6px" }}>
              {projects.map((p) => {
                const active = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectProject(p.id)}
                    className="sb-project-btn"
                    style={{
                      background:  active ? "rgba(0,212,200,0.08)"   : "transparent",
                      borderColor: active ? "rgba(0,212,200,0.22)"   : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,200,0.05)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <span
                      className="sb-project-dot"
                      style={{ background: p.color, boxShadow:`0 0 5px ${p.color}` }}
                    />
                    <span style={{
                      fontSize:12, flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      color: active ? "#e2e8f0" : "rgba(122,160,184,0.7)", fontWeight: active ? 600 : 400,
                    }}>
                      {p.name}
                    </span>
                    <span className="sb-project-count">{p.memberCount ?? 0}</span>
                  </button>
                );
              })}
              {projects.length === 0 && (
                <p style={{ padding:"4px 10px", fontSize:11, color:"rgba(61,90,110,0.5)", fontFamily:"'DM Mono',monospace" }}>
                  No projects found
                </p>
              )}
            </div>
          </div>

          <div className="sb-divider" />

          {/* Quick Access */}
          <div style={{ padding:"0 6px 4px" }}>
            <div className="sb-section-label" style={{ padding:"0 6px", marginBottom:8 }}>Quick Access</div>
            {([
              { label: "All Work Items", icon: CheckSquare, href: "/" },
              { label: "Bug List",       icon: Layers,      href: "/bugs?type=BUG" },
              ...(user?.role !== "CLIENT"
                ? [{ label: "Feature List", icon: Layers, href: "/bugs?type=FEATURE" }]
                : []),
              { label: "Team Members",   icon: Users,       href: "/" },
            ] as { label: string; icon: React.ElementType; href: string }[]).map(({ label, icon: Icon, href }) => (
              <Link key={label} href={href} className="sb-link">
                <Icon size={13} style={{ opacity:.7, flexShrink:0 }} />
                <span>{label}</span>
              </Link>
            ))}
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="sb-link" style={{ color:"rgba(251,113,133,0.6)" }}
                onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.color="#fb7185";(e.currentTarget as HTMLAnchorElement).style.borderColor="rgba(251,113,133,0.2)";}}
                onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.color="rgba(251,113,133,0.6)";(e.currentTarget as HTMLAnchorElement).style.borderColor="transparent";}}>
                <Shield size={13} style={{ opacity:.8, flexShrink:0 }} />
                <span>Admin Panel</span>
              </Link>
            )}
          </div>

          {/* Spacer */}
          <div style={{ flex:1 }} />

          {/* User card */}
          <div className="sb-user-card">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div className="sb-avatar">
                {user?.username?.substring(0, 2).toUpperCase() || "U"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:"#e2e8f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
                  {user?.username || "User"}
                </p>
                <span style={{
                  fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20,
                  color: rc.color, background: rc.bg, border:`1px solid ${rc.border}`,
                  fontFamily:"'DM Mono',monospace", letterSpacing:"0.8px",
                  textTransform:"uppercase",
                }}>
                  {user?.role ? ROLE_LABELS[user.role as Role] : ROLE_LABELS[currentRole]}
                </span>
              </div>
            </div>

            <button onClick={handleLogout} className="sb-logout-btn">
              <LogOut size={12} />
              Logout
            </button>
          </div>

        </div>
      </div>
    </>
  );
}