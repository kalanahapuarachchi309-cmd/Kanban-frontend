"use client";

import { WorkItem, Priority, WorkItemType } from "../types";
import { MessageCircle, Paperclip, Calendar, AlertTriangle, Zap } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:      { label: "Low",      color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  MEDIUM:   { label: "Medium",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  HIGH:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  CRITICAL: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const TYPE_CONFIG: Record<WorkItemType, { label: string; color: string; bg: string }> = {
  BUG:     { label: "Bug",     color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  FEATURE: { label: "Feature", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
};

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { label: "Due today", overdue: true };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false };
  return { label: `${diffDays}d left`, overdue: false };
}

// ─── Remove old type ──────────────────────────────────────────────────────────
type _OldTask = {
  id: number;
  title: string;
  description?: string;
  accentColor: string;
  comments?: number;
  avatars?: { initials: string; color: string }[];
  hasLink?: boolean;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

export default function TaskCard({ item }: { item: WorkItem }) {
  const priority = PRIORITY_CONFIG[item.priority];
  const type = TYPE_CONFIG[item.type];
  const due = formatDue(item.dueAt);
  const qaFeedbackPrefix = "[QA/PM Feedback] ";
  const hasQaFeedback = !!item.description?.startsWith(qaFeedbackPrefix);
  const qaFeedbackMessage = hasQaFeedback
    ? item.description?.replace(qaFeedbackPrefix, "").split("\n")[0]
    : "";
  return (
    <div
      className="rounded-xl p-3 mb-2.5 cursor-pointer group transition-all hover:translate-y-[-1px] hover:shadow-lg"
      style={{ background: "#1a1d27", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
    >
      {/* Top row: type badge + priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1"
          style={{ color: type.color, background: type.bg }}>
          {item.type === "BUG" ? <AlertTriangle size={9} /> : <Zap size={9} />}
          {type.label}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider"
          style={{ color: priority.color, background: priority.bg }}>
          {priority.label}
        </span>
      </div>
      {/* Title */}
      <p className="text-gray-200 text-xs font-medium leading-snug mb-1.5 group-hover:text-white transition-colors">
        {item.title}
      </p>
      {/* Description */}
      {item.description && (
        <p className="text-gray-500 leading-relaxed mb-2 line-clamp-2" style={{ fontSize: "11px" }}>
          {item.description}
        </p>
      )}
      {hasQaFeedback && qaFeedbackMessage && (
        <div
          className="text-[10px] font-medium px-2 py-1 rounded mb-2"
          style={{ background: "rgba(249,115,22,0.15)", color: "#fdba74" }}
        >
          QA/PM: {qaFeedbackMessage}
        </div>
      )}
      {/* Due date */}
      {due && (
        <div className="flex items-center gap-1 mb-2 w-fit px-1.5 py-0.5 rounded"
          style={{ background: due.overdue ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)", color: due.overdue ? "#ef4444" : "#9ca3af" }}>
          <Calendar size={10} />
          <span style={{ fontSize: "10px", fontWeight: 500 }}>{due.label}</span>
        </div>
      )}
      {/* Client review */}
      {item.clientReviewStatus === "REJECTED" && (
        <div className="text-[10px] font-semibold px-2 py-0.5 rounded mb-2 w-fit"
          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Client Rejected</div>
      )}
      {item.clientReviewStatus === "ACCEPTED" && (
        <div className="text-[10px] font-semibold px-2 py-0.5 rounded mb-2 w-fit"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Client Accepted</div>
      )}
      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          {!!item.commentCount && (
            <div className="flex items-center gap-1 text-gray-600">
              <MessageCircle size={11} />
              <span style={{ fontSize: "11px" }}>{item.commentCount}</span>
            </div>
          )}
          {!!item.attachmentCount && (
            <div className="flex items-center gap-1 text-gray-600">
              <Paperclip size={11} />
              <span style={{ fontSize: "11px" }}>{item.attachmentCount}</span>
            </div>
          )}
        </div>
        {item.assignedTo ? (
          <div title={item.assignedTo.username}
            className="w-6 h-6 rounded-full border flex items-center justify-center text-white font-semibold"
            style={{ background: item.assignedTo.avatarColor, borderColor: "#1a1d27", fontSize: "9px" }}>
            {item.assignedTo.initials}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border border-dashed" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
        )}
      </div>
    </div>
  );
}
