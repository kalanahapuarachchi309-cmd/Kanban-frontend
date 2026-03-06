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
  
  return (
    <div className="flex h-full flex-shrink-0">
      {/* Icon Rail */}
      <div className="w-14 flex flex-col items-center py-4 gap-3 border-r"
        style={{ background: "#0d0f14", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
          <span className="text-white font-bold" style={{ fontSize: "11px" }}>PM</span>
        </Link>
        <Link href="/" className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"><Home size={17} /></Link>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "rgba(99,102,241,0.18)", color: "#818cf8" }}><CheckSquare size={17} /></button>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"><FolderKanban size={17} /></button>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"><Users size={17} /></button>
        {user?.role === 'ADMIN' && (
          <Link href="/admin" className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors">
            <Shield size={17} />
          </Link>
        )}
        <div className="mt-auto">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 transition-colors"><Settings size={16} /></button>
        </div>
      </div>

      {/* Text Sidebar */}
      <div className="w-56 flex flex-col py-3 overflow-y-auto border-r"
        style={{ background: "#13161e", borderColor: "rgba(255,255,255,0.06)" }}>
        {/* Role Switcher */}
        <div className="px-3 mb-4">
          <p className="text-gray-600 mb-2 uppercase font-semibold tracking-widest" style={{ fontSize: "10px" }}>Your Role</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
              const active = r === currentRole;
              return (
                <button key={r} onClick={() => onRoleChange(r)}
                  className="px-2 py-1.5 rounded-lg text-left transition-colors"
                  style={{
                    background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? "rgba(99,102,241,0.4)" : "transparent"}`,
                    color: active ? "#a5b4fc" : "#6b7280",
                    fontSize: "10px",
                    fontWeight: active ? 600 : 400,
                  }}>
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-3 h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Projects */}
        <div className="px-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 uppercase font-semibold tracking-widest" style={{ fontSize: "10px" }}>Projects</p>
            <button className="text-gray-600 hover:text-gray-300 transition-colors"><Plus size={12} /></button>
          </div>
          {projects.map((p) => {
            const active = p.id === activeProjectId;
            return (
              <button key={p.id} onClick={() => onSelectProject(p.id)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all mb-0.5"
                style={{
                  background: active ? "rgba(99,102,241,0.12)" : "transparent",
                  border: `1px solid ${active ? "rgba(99,102,241,0.25)" : "transparent"}`,
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-xs flex-1 text-left truncate" style={{ color: active ? "#e2e8f0" : "#9ca3af" }}>{p.name}</span>
                <span className="text-gray-600" style={{ fontSize: "10px" }}>{p.memberCount ?? 0}</span>
              </button>
            );
          })}
          {projects.length === 0 && (
            <p className="px-2 py-1 text-xs text-gray-500">No projects found</p>
          )}
        </div>

        <div className="mx-3 h-px my-3" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Quick links */}
        <div className="px-3">
          <p className="text-gray-600 mb-2 uppercase font-semibold tracking-widest" style={{ fontSize: "10px" }}>Quick Access</p>
          {([
              { label: "All Work Items", icon: CheckSquare, href: "/" },
              { label: "Bug List", icon: Layers, href: "/bugs?type=BUG" },
              ...(user?.role !== "CLIENT"
                ? [{ label: "Feature List", icon: Layers, href: "/bugs?type=FEATURE" }]
                : []),
              { label: "Team Members",   icon: Users, href: "/" },
            ] as { label: string; icon: React.ElementType; href: string }[]).map(({ label, icon: Icon, href }) => (
            <Link key={label} href={href} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group mb-0.5">
              <Icon size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              <span className="text-gray-400 text-xs group-hover:text-gray-200 transition-colors">{label}</span>
            </Link>
          ))}
          {user?.role === 'ADMIN' && (
            <Link href="/admin" className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group mb-0.5">
              <Shield size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              <span className="text-gray-400 text-xs group-hover:text-gray-200 transition-colors">Admin Panel</span>
            </Link>
          )}
        </div>

        <div className="flex-1" />

        {/* Current user */}
        <div className="mx-3 mb-3 p-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "10px" }}>
              {user?.username?.substring(0, 2).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 text-xs font-medium truncate">{user?.username || "User"}</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: "#818cf8", background: "rgba(99,102,241,0.15)" }}>
                {user?.role ? ROLE_LABELS[user.role as Role] : ROLE_LABELS[currentRole]}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "#d1d5db" }}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
