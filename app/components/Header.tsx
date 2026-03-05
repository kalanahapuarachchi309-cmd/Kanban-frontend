"use client";

import { Bell, MoreHorizontal, Table, List, SlidersHorizontal, Columns3, Plus } from "lucide-react";
import { Role, Notification } from "../types";
import { useState } from "react";

type Tab = "Kanban" | "Table" | "List";

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  ADMIN:     { label: "Admin",     color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  QA_PM:     { label: "QA / PM",   color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  DEVELOPER: { label: "Developer", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  CLIENT:    { label: "Client",    color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
};

export default function Header({
  activeTab,
  onTabChange,
  currentRole,
  projectName,
  notifications,
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
  notifications: Notification[];
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
    <div className="flex-shrink-0 border-b" style={{ background: "#13161e", borderColor: "rgba(255,255,255,0.06)" }}>
      {/* Top Row */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.2)" }}>
            <Columns3 size={15} style={{ color: "#818cf8" }} />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm leading-tight">{projectName}</h1>
            <p className="text-gray-600" style={{ fontSize: "10px" }}>Bug & Feature Tracker</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Role badge */}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider" style={{ color: role.color, background: role.bg }}>
            {role.label}
          </span>

          <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* Add item - only for QA_PM / ADMIN */}
          {(currentRole === "QA_PM" || currentRole === "ADMIN") && (
            <button onClick={onAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              <Plus size={12} /> New Item
            </button>
          )}

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors relative"
              style={{ background: showNotifs ? "rgba(255,255,255,0.08)" : "transparent" }}>
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: "#ef4444", fontSize: "8px" }}>{unread}</span>
              )}
            </button>
            {/* Notification dropdown */}
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-semibold">Notifications</span>
                    {unread > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-indigo-400 text-[10px] cursor-pointer hover:text-indigo-300"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-600 text-xs">No notifications</div>
                  ) : notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onMarkNotificationRead?.(n.id)}
                      className="w-full text-left px-4 py-3 border-b hover:bg-white/5 transition-colors cursor-pointer"
                      style={{ borderColor: "rgba(255,255,255,0.05)", opacity: n.isRead ? 0.5 : 1 }}>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.isRead ? "#4b5563" : "#6366f1" }} />
                        <div>
                          <p className="text-gray-200 text-xs font-medium">{n.title}</p>
                          <p className="text-gray-500 mt-0.5" style={{ fontSize: "11px" }}>{n.body}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="text-gray-500 hover:text-gray-300 transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center justify-between px-5 pb-0">
        <div className="flex items-center gap-1">
          {(["Kanban", "Table", "List"] as Tab[]).map((tab) => {
            const Icon = tab === "Kanban" ? Columns3 : tab === "Table" ? Table : List;
            const active = activeTab === tab;
            return (
              <button key={tab} onClick={() => onTabChange(tab)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2"
                style={{ color: active ? "#818cf8" : "#6b7280", borderColor: active ? "#818cf8" : "transparent" }}>
                <Icon size={13} />{tab}
              </button>
            );
          })}
        </div>
        <button onClick={onFilterToggle}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors mb-1"
          style={{
            background: filterActive ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
            color: filterActive ? "#818cf8" : "#9ca3af",
            border: `1px solid ${filterActive ? "rgba(99,102,241,0.4)" : "transparent"}`,
          }}>
          <SlidersHorizontal size={12} />
          {filterActive ? "Filtering" : "Filter"}
        </button>
      </div>
    </div>
  );
}
