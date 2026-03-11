"use client";

import { useState } from "react";
import { WorkItem, Priority, WorkItemType, Role, User } from "../types";
import { MessageCircle, Paperclip, Calendar, AlertTriangle, Zap, Play, CheckCircle, Send, Trash2, Rocket, Edit } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:      { label: "Low",      color: "#86efac", bg: "rgba(134,239,172,0.15)" },
  MEDIUM:   { label: "Medium",   color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  HIGH:     { label: "High",     color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  CRITICAL: { label: "Critical", color: "#f87171", bg: "rgba(248,113,113,0.15)" },
};

const TYPE_CONFIG: Record<WorkItemType, { label: string; color: string; bg: string }> = {
  BUG:     { label: "Bug",     color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  FEATURE: { label: "Feature", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
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

type Props = {
  item: WorkItem;
  currentRole: Role;
  currentUser: User;
  developers: User[];
  onClientReview?: (id: number, reviewStatus: "ACCEPTED" | "REJECTED") => void;
  clientReviewLoading?: boolean;
  onStatusChange?: (item: WorkItem, toStatus: "IN_PROGRESS" | "QA_FIX" | "DONE") => void;
  onPublish?: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
  onAssign?: (item: WorkItem, developerId: number) => void;
  onEdit?: (item: WorkItem) => void;
  statusUpdating?: boolean;
  publishing?: boolean;
  deleting?: boolean;
};

export default function TaskCard({ 
  item, 
  currentRole, 
  currentUser, 
  developers,
  onClientReview, 
  clientReviewLoading = false,
  onStatusChange,
  onPublish,
  onDelete,
  onAssign,
  onEdit,
  statusUpdating = false,
  publishing = false,
  deleting = false,
}: Props) {
  const [showQaMessage, setShowQaMessage] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const priority = PRIORITY_CONFIG[item.priority];
  const type = TYPE_CONFIG[item.type];
  const due = formatDue(item.dueAt);
  
  const qaFeedbackPrefix = "[QA/PM Feedback] ";
  const descriptionText = item.description || "";
  const descriptionLines = descriptionText.split("\n");
  const qaFeedbackLine = descriptionLines.find((line) => line.startsWith(qaFeedbackPrefix)) || "";
  const qaFeedbackMessage = qaFeedbackLine.replace(qaFeedbackPrefix, "").trim();
  const hasQaFeedback = qaFeedbackMessage.length > 0;
  const normalDescription = descriptionLines
    .filter((line) => !line.startsWith(qaFeedbackPrefix))
    .join("\n")
    .trim();
  
  const showClientReviewActions = currentRole === "CLIENT" && item.status === "PUBLISHED";
  const isDeveloperRole = currentRole === "DEVELOPER";
  const canManage = currentRole === "QA_PM" || currentRole === "ADMIN";
  const canReassign = currentRole === "QA_PM";
  const isAssignedToDeveloper = isDeveloperRole && currentUser && item.assignedTo?.id === currentUser.id;
  
  // Determine which actions to show
  const showStartProgress = 
    (canManage || isAssignedToDeveloper) && 
    item.status === "BUG_LIST";
  
  const showQaFix = 
    isAssignedToDeveloper && 
    item.status === "IN_PROGRESS";
  
  const showApproveDone = 
    canManage && 
    (item.status === "IN_PROGRESS" || item.status === "QA_FIX");
  
  const showPublish = 
    canManage && 
    item.status === "DONE";
  
  const showDelete = canManage;
  
  const showEdit = canManage;
  
  const showAssignment = canReassign && item.status === "BUG_LIST";
  
  const hasActions = showStartProgress || showQaFix || showApproveDone || showPublish || showDelete || showEdit || showAssignment || showClientReviewActions;
  
  const actionCount = [
    showStartProgress,
    showQaFix,
    showApproveDone,
    showPublish,
    showDelete,
    showEdit,
    showAssignment
  ].filter(Boolean).length;

  return (
    <div
      onClick={() => {
        if (hasQaFeedback) {
          setShowQaMessage((prev) => !prev);
        }
      }}
      className="rounded-2xl p-3.5 mb-3 cursor-pointer group transition-all duration-300 hover:translate-y-[-2px] hover:shadow-2xl relative backdrop-blur-xl"
      style={{ 
        background: "rgba(30, 35, 48, 0.6)", 
        border: hasActions && !showClientReviewActions ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.12)", 
        boxShadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)" 
      }}
    >
      {/* Action indicator badge */}
      {hasActions && !showClientReviewActions && actionCount > 0 && (
        <div 
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition-transform hover:scale-110"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #a78bfa)", color: "#fff", border: "2px solid #1e2330" }}
          title={`${actionCount} action${actionCount > 1 ? 's' : ''} available`}
        >
          {actionCount}
        </div>
      )}
      
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
      {normalDescription && (
        <p className="text-gray-500 leading-relaxed mb-2 line-clamp-2" style={{ fontSize: "11px" }}>
          {normalDescription}
        </p>
      )}
      {hasQaFeedback && qaFeedbackMessage && (
        <div
          className="text-[10px] font-medium px-2 py-1 rounded mb-2"
          style={{ background: "rgba(251,146,60,0.15)", color: "#fdba74", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          QA/PM new message (click card)
        </div>
      )}
      {hasQaFeedback && showQaMessage && (
        <div className="text-[11px] px-2.5 py-2 rounded-lg mb-2" style={{ background: "rgba(251,146,60,0.12)", color: "#fed7aa", border: "1px solid rgba(251,146,60,0.15)" }}>
          {qaFeedbackMessage}
        </div>
      )}
      {/* Due date */}
      {due && (
        <div className="flex items-center gap-1 mb-2 w-fit px-1.5 py-0.5 rounded"
          style={{ background: due.overdue ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.05)", color: due.overdue ? "#f87171" : "#9ca3af", border: due.overdue ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(255,255,255,0.08)" }}>
          <Calendar size={10} />
          <span style={{ fontSize: "10px", fontWeight: 500 }}>{due.label}</span>
        </div>
      )}
      {/* Client review */}
      {item.clientReviewStatus === "REJECTED" && (
        <div className="text-[10px] font-semibold px-2 py-0.5 rounded mb-2 w-fit"
          style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>Client Rejected</div>
      )}
      {item.clientReviewStatus === "ACCEPTED" && (
        <div className="text-[10px] font-semibold px-2 py-0.5 rounded mb-2 w-fit"
          style={{ background: "rgba(134,239,172,0.15)", color: "#86efac", border: "1px solid rgba(134,239,172,0.2)" }}>Client Accepted</div>
      )}
      {showClientReviewActions && (
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            disabled={clientReviewLoading}
            onClick={(e) => {
              e.stopPropagation();
              onClientReview?.(item.id, "ACCEPTED");
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded transition-colors disabled:opacity-60"
            style={{ background: "rgba(134,239,172,0.18)", color: "#86efac", border: "1px solid rgba(134,239,172,0.25)" }}
          >
            {clientReviewLoading ? "Saving..." : "Accept"}
          </button>
          <button
            type="button"
            disabled={clientReviewLoading}
            onClick={(e) => {
              e.stopPropagation();
              onClientReview?.(item.id, "REJECTED");
            }}
            className="text-[10px] font-semibold px-2 py-1 rounded transition-colors disabled:opacity-60"
            style={{ background: "rgba(248,113,113,0.18)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}
          >
            Reject
          </button>
        </div>
      )}
      
      {/* Action Buttons */}
      {hasActions && !showClientReviewActions && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="w-full text-[11px] font-bold text-gray-400 hover:text-white transition-all duration-200 text-center py-2 rounded-xl hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <span className="text-xs">⚡</span>
            <span>{showActions ? "Hide Actions ▲" : "Quick Actions ▼"}</span>
            {!showActions && actionCount > 0 && (
              <span 
                className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}
              >
                {actionCount}
              </span>
            )}
          </button>
          
          {showActions && (
            <div className="mt-2.5 space-y-2 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.15)" }}>
              {showStartProgress && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange?.(item, "IN_PROGRESS");
                  }}
                  disabled={statusUpdating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(251,146,60,0.18)", color: "#fdba74", border: "1px solid rgba(251,146,60,0.25)" }}
                >
                  <Play size={11} />
                  {statusUpdating ? "⏳ Starting..." : "▶️ Start Progress"}
                </button>
              )}
              
              {showQaFix && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange?.(item, "QA_FIX");
                  }}
                  disabled={statusUpdating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(34,211,238,0.18)", color: "#67e8f9", border: "1px solid rgba(34,211,238,0.25)" }}
                >
                  <Send size={11} />
                  {statusUpdating ? "⏳ Submitting..." : "🔍 Send to QA"}
                </button>
              )}
              
              {showApproveDone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange?.(item, "DONE");
                  }}
                  disabled={statusUpdating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(134,239,172,0.18)", color: "#86efac", border: "1px solid rgba(134,239,172,0.25)" }}
                >
                  <CheckCircle size={11} />
                  {statusUpdating ? "⏳ Approving..." : "✅ Approve & Done"}
                </button>
              )}
              
              {showPublish && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish?.(item);
                  }}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(167,139,250,0.18)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.25)" }}
                >
                  <Rocket size={11} />
                  {publishing ? "⏳ Publishing..." : "🚀 Publish"}
                </button>
              )}
              
              {showAssignment && developers.length > 0 && (
                <div>
                  <label className="block text-[9px] font-medium text-gray-400 mb-1 px-0.5">👤 Assign Developer:</label>
                  <select
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      const devId = Number(e.target.value);
                      if (devId) {
                        onAssign?.(item, devId);
                        e.target.value = "";
                      }
                    }}
                    defaultValue=""
                    className="w-full px-2.5 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    style={{ background: "rgba(167,139,250,0.15)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.25)" }}
                  >
                    <option value="" disabled>
                      {item.assignedTo ? `Change from ${item.assignedTo.username}` : "Select developer..."}
                    </option>
                    {developers
                      .filter(dev => dev.id !== item.assignedTo?.id)
                      .map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          👤 {dev.username}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
              {showEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(item);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(167,139,250,0.18)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.25)" }}
                >
                  <Edit size={11} />
                  ✏️ Edit
                </button>
              )}
              
              {showDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(item);
                  }}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 disabled:opacity-50 hover:scale-[1.02] active:scale-95 hover:shadow-lg"
                  style={{ background: "rgba(248,113,113,0.18)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" }}
                >
                  <Trash2 size={11} />
                  {deleting ? "⏳ Deleting..." : "🗑️ Delete"}
                </button>
              )}
            </div>
          )}
        </div>
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
