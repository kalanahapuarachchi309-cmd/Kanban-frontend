"use client";

import { Plus } from "lucide-react";
import TaskCard from "./TaskCard";
import { WorkItem, WorkItemStatus, Role, User } from "../types";

type Props = {
  status: WorkItemStatus;
  title: string;
  accentColor: string;
  items: WorkItem[];
  currentRole: Role;
  currentUser: User;
  developers: User[];
  onAddItem?: () => void;
  onClientReview?: (id: number, reviewStatus: "ACCEPTED" | "REJECTED") => void;
  clientReviewLoadingId?: number | null;
  onStatusChange?: (item: WorkItem, toStatus: "IN_PROGRESS" | "QA_FIX" | "DONE") => void;
  onPublish?: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
  onAssign?: (item: WorkItem, developerId: number) => void;
  onEdit?: (item: WorkItem) => void;
  statusUpdatingItemId?: number | null;
  publishingItemId?: number | null;
  deletingItemId?: number | null;
};

const STATUS_DESCRIPTIONS: Record<WorkItemStatus, string> = {
  BUG_LIST:    "New bugs & features",
  IN_PROGRESS: "Currently being worked on",
  QA_FIX:      "Awaiting QA review",
  DONE:        "Completed, ready to publish",
  PUBLISHED:   "Visible to client",
  ACCEPTED:    "Approved by client",
};

/* ── per-column scrollbar colour driven by accentColor via CSS var ── */
const ColumnStyles = ({ id, accent }: { id: string; accent: string }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap');

    /* column card */
    .kc-col-${id} {
      font-family: 'Outfit', sans-serif;
      width: 280px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-radius: 20px;
      min-height: calc(100vh - 130px);
      max-height: calc(100vh - 130px);
      background: linear-gradient(160deg, rgba(6,11,18,0.96), rgba(4,8,14,0.98));
      border: 1px solid rgba(${hexToRgb(accent)},0.18);
      box-shadow:
        0 8px 40px rgba(0,0,0,0.45),
        0 0 30px rgba(${hexToRgb(accent)},0.05),
        inset 0 1px 0 rgba(255,255,255,0.03);
      transition: border-color .3s;
      position: relative;
      overflow: hidden;
    }
    .kc-col-${id}:hover {
      border-color: rgba(${hexToRgb(accent)},0.32);
    }
    /* shimmer top bar */
    .kc-col-${id}::before {
      content: '';
      position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
      background: linear-gradient(90deg, transparent, ${accent}, transparent);
      animation: kc-topBar-${id} 3.5s ease-in-out infinite alternate;
      pointer-events: none; z-index: 1;
    }
    @keyframes kc-topBar-${id} {
      from { opacity: 0.45; filter: blur(0); }
      to   { opacity: 0.9;  filter: blur(0.5px); }
    }

    /* scrollable cards area */
    .kc-scroll-${id} {
      flex: 1;
      overflow-y: auto;
      padding: 0 10px 10px;
      /* scrollbar */
      scrollbar-width: thin;
      scrollbar-color: rgba(${hexToRgb(accent)},0.5) rgba(0,8,16,0.4);
    }
    .kc-scroll-${id}::-webkit-scrollbar       { width: 4px; }
    .kc-scroll-${id}::-webkit-scrollbar-track { background: rgba(0,8,16,0.4); border-radius: 4px; }
    .kc-scroll-${id}::-webkit-scrollbar-thumb { background: rgba(${hexToRgb(accent)},0.5); border-radius: 4px; }
    .kc-scroll-${id}::-webkit-scrollbar-thumb:hover { background: rgba(${hexToRgb(accent)},0.8); }
  `}</style>
);

/* helper: convert #rrggbb → "r,g,b" */
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean, 16);
  return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
}

export default function KanbanColumn({
  status,
  title,
  accentColor,
  items,
  currentRole,
  currentUser,
  developers,
  onAddItem,
  onClientReview,
  clientReviewLoadingId,
  onStatusChange,
  onPublish,
  onDelete,
  onAssign,
  onEdit,
  statusUpdatingItemId,
  publishingItemId,
  deletingItemId,
}: Props) {
  const canAdd = (currentRole === "QA_PM" || currentRole === "ADMIN") && status === "BUG_LIST";

  /* stable id for scoped CSS — use status slug */
  const colId = status.toLowerCase().replace(/_/g, "-");

  return (
    <>
      <ColumnStyles id={colId} accent={accentColor} />

      <div className={`kc-col-${colId}`}>

        {/* ── Column Header ── */}
        <div style={{ padding:"16px 16px 12px", flexShrink:0, position:"relative", zIndex:2 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* accent dot */}
              <span style={{
                width:9, height:9, borderRadius:"50%", flexShrink:0,
                background: accentColor,
                boxShadow: `0 0 8px ${accentColor}, 0 0 3px ${accentColor}`,
                animation: "kc-dot-pulse 2.5s ease-in-out infinite",
              }} />
              <h2 style={{ color:"#e2e8f0", fontSize:13, fontWeight:700, letterSpacing:0.2 }}>{title}</h2>
              {/* count badge */}
              <span style={{
                fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:20,
                background:`rgba(${hexToRgb(accentColor)},0.15)`,
                color: accentColor,
                border:`1px solid rgba(${hexToRgb(accentColor)},0.3)`,
                fontFamily:"'DM Mono',monospace", minWidth:22, textAlign:"center",
              }}>
                {items.length}
              </span>
            </div>
            {canAdd && (
              <button
                onClick={onAddItem}
                style={{
                  width:26, height:26, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
                  background:`rgba(${hexToRgb(accentColor)},0.1)`,
                  border:`1px solid rgba(${hexToRgb(accentColor)},0.25)`,
                  color: accentColor, cursor:"pointer", transition:"all .2s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background=`rgba(${hexToRgb(accentColor)},0.22)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=`rgba(${hexToRgb(accentColor)},0.1)`; }}
              >
                <Plus size={13} />
              </button>
            )}
          </div>

          {/* description */}
          <p style={{ fontSize:10, color:"rgba(61,90,110,0.8)", fontFamily:"'DM Mono',monospace", paddingLeft:17, letterSpacing:0.3 }}>
            {STATUS_DESCRIPTIONS[status]}
          </p>

          {/* gradient divider */}
          <div style={{
            marginTop:12, height:1, borderRadius:1,
            background:`linear-gradient(to right, ${accentColor}60, ${accentColor}15, transparent)`,
          }} />
        </div>

        {/* ── Cards scroll area (scrollbar color = accentColor) ── */}
        <div className={`kc-scroll-${colId}`}>
          {items.length === 0 ? (
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center",
              height:72, borderRadius:12, margin:"4px 2px",
              border:`1px dashed rgba(${hexToRgb(accentColor)},0.14)`,
              color:"rgba(61,90,110,0.6)", fontSize:11,
              fontFamily:"'DM Mono',monospace",
            }}>
              No items
            </div>
          ) : items.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              currentRole={currentRole}
              currentUser={currentUser}
              developers={developers}
              onClientReview={onClientReview}
              clientReviewLoading={clientReviewLoadingId === item.id}
              onStatusChange={onStatusChange}
              onPublish={onPublish}
              onDelete={onDelete}
              onAssign={onAssign}
              onEdit={onEdit}
              statusUpdating={statusUpdatingItemId === item.id}
              publishing={publishingItemId === item.id}
              deleting={deletingItemId === item.id}
            />
          ))}
        </div>

        {/* ── Add footer ── */}
        {canAdd && (
          <button
            onClick={onAddItem}
            style={{
              display:"flex", alignItems:"center", gap:7,
              margin:"4px 12px 12px", padding:"9px 12px",
              borderRadius:11, fontSize:12, fontWeight:600,
              color:`rgba(${hexToRgb(accentColor)},0.6)`,
              background:`rgba(${hexToRgb(accentColor)},0.05)`,
              border:`1px dashed rgba(${hexToRgb(accentColor)},0.2)`,
              cursor:"pointer", transition:"all .2s", flexShrink:0,
              fontFamily:"'Outfit',sans-serif",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background=`rgba(${hexToRgb(accentColor)},0.1)`;
              b.style.borderColor=`rgba(${hexToRgb(accentColor)},0.4)`;
              b.style.color=accentColor;
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background=`rgba(${hexToRgb(accentColor)},0.05)`;
              b.style.borderColor=`rgba(${hexToRgb(accentColor)},0.2)`;
              b.style.color=`rgba(${hexToRgb(accentColor)},0.6)`;
            }}
          >
            <Plus size={12} /> Add work item
          </button>
        )}

        {/* global dot pulse keyframe (injected once, harmless if repeated) */}
        <style>{`
          @keyframes kc-dot-pulse {
            0%,100% { opacity:1; }
            50%      { opacity:0.45; }
          }
        `}</style>
      </div>
    </>
  );
}