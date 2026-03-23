"use client";

import { useState } from "react";
import { WorkItem, Priority, WorkItemType, Role, User } from "../types";
import { MessageCircle, Paperclip, Calendar, AlertTriangle, Zap, Play, CheckCircle, Send, Trash2, Rocket, Edit } from "lucide-react";

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  LOW:      { label: "Low",      color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)"  },
  MEDIUM:   { label: "Medium",   color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)"  },
  HIGH:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.1)",  border: "rgba(249,115,22,0.25)"  },
  CRITICAL: { label: "Critical", color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.25)" },
};

const TYPE_CONFIG: Record<WorkItemType, { label: string; color: string; bg: string; border: string }> = {
  BUG:     { label: "Bug",     color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.25)" },
  FEATURE: { label: "Feature", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)" },
};

function formatDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const due  = new Date(iso);
  const now  = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0)   return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { label: "Due today",    overdue: true };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false };
  return { label: `${diffDays}d left`, overdue: false };
}

/* ── styles ── */
const CardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap');

    .tc-card {
      font-family: 'Outfit', sans-serif;
      border-radius: 16px;
      padding: 13px 14px;
      margin-bottom: 10px;
      cursor: pointer;
      position: relative;
      transition: transform .25s, box-shadow .25s, border-color .25s;
      background: linear-gradient(145deg, rgba(6,11,18,0.94), rgba(4,8,14,0.97));
      border: 1px solid rgba(0,212,200,0.13);
      box-shadow: 0 4px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.03);
    }
    .tc-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,200,0.07);
      border-color: rgba(0,212,200,0.24);
    }
    .tc-card--managed { border-color: rgba(167,139,250,0.2); }
    .tc-card--managed:hover { border-color: rgba(167,139,250,0.38); }

    /* shimmer top */
    .tc-card::before {
      content: '';
      position: absolute; top: 0; left: 20%; right: 20%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,212,200,0.4), transparent);
      border-radius: 1px; pointer-events: none;
      animation: tc-topBar 4s ease-in-out infinite alternate;
    }
    @keyframes tc-topBar {
      from { opacity: .35; } to { opacity: .8; }
    }

    /* ── action count badge ── */
    .tc-action-badge {
      position: absolute; top: -7px; right: -7px;
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 800; color: #020509;
      background: linear-gradient(135deg, #00b8ad, #00d4c8);
      border: 2px solid rgba(4,8,14,0.98);
      box-shadow: 0 0 10px rgba(0,212,200,0.5);
      animation: tc-badgePop .4s cubic-bezier(.34,1.56,.64,1);
      font-family: 'DM Mono', monospace;
    }
    @keyframes tc-badgePop { from{opacity:0;transform:scale(.4);} to{opacity:1;transform:scale(1);} }

    /* ── type / priority / status pills ── */
    .tc-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 20px;
      font-size: 9px; font-weight: 700; letter-spacing: 0.8px;
      text-transform: uppercase; border: 1px solid;
      font-family: 'DM Mono', monospace; white-space: nowrap;
    }

    /* ── title ── */
    .tc-title {
      font-size: 12px; font-weight: 700; color: #e2e8f0; line-height: 1.4;
      margin: 6px 0 4px; letter-spacing: -0.1px;
      transition: color .2s;
    }
    .tc-card:hover .tc-title { color: #fff; }

    /* ── description ── */
    .tc-desc {
      font-size: 11px; color: rgba(61,90,110,0.85); line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; margin-bottom: 7px;
    }

    /* ── QA feedback ── */
    .tc-qa-hint {
      font-size: 10px; font-weight: 600; padding: 4px 9px; border-radius: 8px; margin-bottom: 7px;
      background: rgba(249,115,22,0.1); color: #fdba74; border: 1px solid rgba(249,115,22,0.22);
      font-family: 'DM Mono', monospace;
    }
    .tc-qa-msg {
      font-size: 11px; padding: 8px 10px; border-radius: 10px; margin-bottom: 7px;
      background: rgba(249,115,22,0.08); color: #fed7aa; border: 1px solid rgba(249,115,22,0.18);
      line-height: 1.5;
    }

    /* ── due date ── */
    .tc-due {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 20px; margin-bottom: 7px;
      font-size: 10px; font-weight: 600; border: 1px solid;
      font-family: 'DM Mono', monospace;
    }
    .tc-due--overdue { background: rgba(251,113,133,0.1); color: #fb7185; border-color: rgba(251,113,133,0.25); }
    .tc-due--ok      { background: rgba(0,212,200,0.07);  color: rgba(0,212,200,0.65); border-color: rgba(0,212,200,0.18); }

    /* ── client review status ── */
    .tc-review-badge {
      font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px;
      display: inline-block; margin-bottom: 7px; border: 1px solid;
      font-family: 'DM Mono', monospace;
    }
    .tc-review--accepted { background: rgba(52,211,153,0.1); color: #34d399; border-color: rgba(52,211,153,0.25); }
    .tc-review--rejected { background: rgba(251,113,133,0.1); color: #fb7185; border-color: rgba(251,113,133,0.25); }

    /* ── client review buttons ── */
    .tc-review-btn {
      font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9px;
      border: 1px solid; cursor: pointer; transition: all .2s;
      font-family: 'Outfit', sans-serif;
    }
    .tc-review-btn:disabled { opacity: .5; cursor: not-allowed; }
    .tc-review-btn:not(:disabled):hover { transform: translateY(-1px); }
    .tc-review-btn--accept { background: rgba(52,211,153,0.12); color: #34d399; border-color: rgba(52,211,153,0.28); }
    .tc-review-btn--accept:not(:disabled):hover { background: rgba(52,211,153,0.22); }
    .tc-review-btn--reject { background: rgba(251,113,133,0.12); color: #fb7185; border-color: rgba(251,113,133,0.28); }
    .tc-review-btn--reject:not(:disabled):hover { background: rgba(251,113,133,0.22); }

    /* ── quick actions toggle ── */
    .tc-actions-toggle {
      width: 100%; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
      padding: 8px; border-radius: 10px; cursor: pointer; transition: all .2s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      background: transparent; border: 1px solid rgba(0,212,200,0.1); color: rgba(0,212,200,0.45);
      font-family: 'DM Mono', monospace;
    }
    .tc-actions-toggle:hover {
      background: rgba(0,212,200,0.07); border-color: rgba(0,212,200,0.25); color: rgba(0,212,200,0.8);
    }
    .tc-count-chip {
      padding: 1px 6px; border-radius: 20px; font-size: 9px; font-weight: 800;
      background: rgba(0,212,200,0.15); color: #00d4c8;
      border: 1px solid rgba(0,212,200,0.25);
    }

    /* ── actions panel ── */
    .tc-actions-panel {
      margin-top: 8px; padding: 10px; border-radius: 12px;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(0,212,200,0.08);
      display: flex; flex-direction: column; gap: 6px;
    }

    /* ── action button base ── */
    .tc-act-btn {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px 12px; border-radius: 10px; font-size: 11px; font-weight: 700;
      border: 1px solid; cursor: pointer; transition: all .2s;
      font-family: 'Outfit', sans-serif;
    }
    .tc-act-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }
    .tc-act-btn:not(:disabled):hover { transform: translateY(-1px); }
    .tc-act-btn:not(:disabled):active { transform: scale(.97); }

    .tc-act-orange { background: rgba(249,115,22,0.12); color: #fdba74; border-color: rgba(249,115,22,0.28); }
    .tc-act-orange:not(:disabled):hover { background: rgba(249,115,22,0.22); }
    .tc-act-cyan   { background: rgba(34,211,238,0.1);  color: #67e8f9; border-color: rgba(34,211,238,0.25); }
    .tc-act-cyan:not(:disabled):hover   { background: rgba(34,211,238,0.2); }
    .tc-act-green  { background: rgba(52,211,153,0.1);  color: #34d399; border-color: rgba(52,211,153,0.25); }
    .tc-act-green:not(:disabled):hover  { background: rgba(52,211,153,0.2); }
    .tc-act-violet { background: rgba(167,139,250,0.1); color: #c4b5fd; border-color: rgba(167,139,250,0.25); }
    .tc-act-violet:not(:disabled):hover { background: rgba(167,139,250,0.2); }
    .tc-act-red    { background: rgba(251,113,133,0.1); color: #fda4af; border-color: rgba(251,113,133,0.25); }
    .tc-act-red:not(:disabled):hover    { background: rgba(251,113,133,0.2); }

    /* ── assign select ── */
    .tc-assign-select {
      width: 100%; padding: 8px 10px; border-radius: 10px; font-size: 11px; cursor: pointer;
      background: rgba(167,139,250,0.08); color: #c4b5fd; border: 1px solid rgba(167,139,250,0.22);
      outline: none; font-family: 'Outfit', sans-serif; transition: border-color .2s;
    }
    .tc-assign-select:focus { border-color: rgba(167,139,250,0.5); }
    .tc-assign-select option { background: #060b11; }

    /* ── footer ── */
    .tc-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 10px; padding-top: 8px;
      border-top: 1px solid rgba(0,212,200,0.07);
    }
    .tc-footer-meta { display: flex; align-items: center; gap: 10px; }
    .tc-meta-item { display: flex; align-items: center; gap: 4px; color: rgba(61,90,110,0.6); font-size: 11px; }

    /* ── avatar ── */
    .tc-avatar {
      width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 900; color: #020509;
      font-family: 'DM Mono', monospace;
      box-shadow: 0 0 8px rgba(0,0,0,0.4);
    }
    .tc-avatar-empty {
      width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
      border: 1px dashed rgba(0,212,200,0.18);
    }
  `}</style>
);

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
  const type     = TYPE_CONFIG[item.type];
  const due      = formatDue(item.dueAt);

  const qaFeedbackPrefix  = "[QA/PM Feedback] ";
  const descriptionText   = item.description || "";
  const descriptionLines  = descriptionText.split("\n");
  const qaFeedbackLine    = descriptionLines.find((l) => l.startsWith(qaFeedbackPrefix)) || "";
  const qaFeedbackMessage = qaFeedbackLine.replace(qaFeedbackPrefix, "").trim();
  const hasQaFeedback     = qaFeedbackMessage.length > 0;
  const normalDescription = descriptionLines
    .filter((l) => !l.startsWith(qaFeedbackPrefix))
    .join("\n").trim();

  const showClientReviewActions = currentRole === "CLIENT" && item.status === "PUBLISHED";
  const isDeveloperRole         = currentRole === "DEVELOPER";
  const canManage               = currentRole === "QA_PM" || currentRole === "ADMIN";
  const canReassign             = currentRole === "QA_PM";
  const isAssignedToDeveloper   = isDeveloperRole && currentUser && item.assignedTo?.id === currentUser.id;

  const showStartProgress = (canManage || isAssignedToDeveloper) && item.status === "BUG_LIST";
  const showQaFix         = isAssignedToDeveloper && item.status === "IN_PROGRESS";
  const showApproveDone   = canManage && (item.status === "IN_PROGRESS" || item.status === "QA_FIX");
  const showPublish       = canManage && item.status === "DONE";
  const showDelete        = canManage;
  const showEdit          = canManage;
  const showAssignment    = canReassign && item.status === "BUG_LIST";

  const hasActions = showStartProgress || showQaFix || showApproveDone || showPublish || showDelete || showEdit || showAssignment || showClientReviewActions;

  const actionCount = [showStartProgress, showQaFix, showApproveDone, showPublish, showDelete, showEdit, showAssignment].filter(Boolean).length;

  return (
    <>
      <CardStyles />
      <div
        className={`tc-card${hasActions && !showClientReviewActions ? " tc-card--managed" : ""}`}
        onClick={() => { if (hasQaFeedback) setShowQaMessage((p) => !p); }}
      >
        {/* action count badge */}
        {hasActions && !showClientReviewActions && actionCount > 0 && (
          <div className="tc-action-badge" title={`${actionCount} action${actionCount > 1 ? "s" : ""} available`}>
            {actionCount}
          </div>
        )}

        {/* ── Top row: type + priority ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
          <span className="tc-pill" style={{ color:type.color, background:type.bg, borderColor:type.border }}>
            {item.type === "BUG" ? <AlertTriangle size={8} /> : <Zap size={8} />}
            {type.label}
          </span>
          <span className="tc-pill" style={{ color:priority.color, background:priority.bg, borderColor:priority.border }}>
            {priority.label}
          </span>
        </div>

        {/* ── Title ── */}
        <p className="tc-title">{item.title}</p>

        {/* ── Description ── */}
        {normalDescription && <p className="tc-desc">{normalDescription}</p>}

        {/* ── QA feedback ── */}
        {hasQaFeedback && qaFeedbackMessage && (
          <div className="tc-qa-hint">⚡ QA/PM message — tap to reveal</div>
        )}
        {hasQaFeedback && showQaMessage && (
          <div className="tc-qa-msg">{qaFeedbackMessage}</div>
        )}

        {/* ── Due date ── */}
        {due && (
          <div className={`tc-due ${due.overdue ? "tc-due--overdue" : "tc-due--ok"}`}>
            <Calendar size={9} />
            {due.label}
          </div>
        )}

        {/* ── Client review status ── */}
        {item.clientReviewStatus === "REJECTED" && (
          <div className="tc-review-badge tc-review--rejected">✗ Client Rejected</div>
        )}
        {item.clientReviewStatus === "ACCEPTED" && (
          <div className="tc-review-badge tc-review--accepted">✓ Client Accepted</div>
        )}

        {/* ── Client review actions ── */}
        {showClientReviewActions && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <button type="button" disabled={clientReviewLoading} onClick={(e) => { e.stopPropagation(); onClientReview?.(item.id, "ACCEPTED"); }} className="tc-review-btn tc-review-btn--accept">
              {clientReviewLoading ? "Saving…" : "✓ Accept"}
            </button>
            <button type="button" disabled={clientReviewLoading} onClick={(e) => { e.stopPropagation(); onClientReview?.(item.id, "REJECTED"); }} className="tc-review-btn tc-review-btn--reject">
              ✗ Reject
            </button>
          </div>
        )}

        {/* ── Action toggle + panel ── */}
        {hasActions && !showClientReviewActions && (
          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid rgba(0,212,200,0.07)" }}>
            <button className="tc-actions-toggle" onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}>
              <span>⚡</span>
              <span>{showActions ? "Hide Actions ▲" : "Quick Actions ▼"}</span>
              {!showActions && actionCount > 0 && <span className="tc-count-chip">{actionCount}</span>}
            </button>

            {showActions && (
              <div className="tc-actions-panel">

                {showStartProgress && (
                  <button className="tc-act-btn tc-act-orange" disabled={statusUpdating}
                    onClick={(e) => { e.stopPropagation(); onStatusChange?.(item, "IN_PROGRESS"); }}>
                    <Play size={11} />
                    {statusUpdating ? "⏳ Starting…" : "▶️ Start Progress"}
                  </button>
                )}

                {showQaFix && (
                  <button className="tc-act-btn tc-act-cyan" disabled={statusUpdating}
                    onClick={(e) => { e.stopPropagation(); onStatusChange?.(item, "QA_FIX"); }}>
                    <Send size={11} />
                    {statusUpdating ? "⏳ Submitting…" : "🔍 Send to QA"}
                  </button>
                )}

                {showApproveDone && (
                  <button className="tc-act-btn tc-act-green" disabled={statusUpdating}
                    onClick={(e) => { e.stopPropagation(); onStatusChange?.(item, "DONE"); }}>
                    <CheckCircle size={11} />
                    {statusUpdating ? "⏳ Approving…" : "✅ Approve & Done"}
                  </button>
                )}

                {showPublish && (
                  <button className="tc-act-btn tc-act-violet" disabled={publishing}
                    onClick={(e) => { e.stopPropagation(); onPublish?.(item); }}>
                    <Rocket size={11} />
                    {publishing ? "⏳ Publishing…" : "🚀 Publish"}
                  </button>
                )}

                {showAssignment && developers.length > 0 && (
                  <div>
                    <label style={{ display:"block", fontSize:9, fontWeight:600, color:"rgba(0,212,200,0.45)", marginBottom:5, fontFamily:"'DM Mono',monospace", letterSpacing:"1px", textTransform:"uppercase" }}>
                      👤 Assign Developer
                    </label>
                    <select
                      className="tc-assign-select"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const devId = Number(e.target.value);
                        if (devId) { onAssign?.(item, devId); e.target.value = ""; }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {item.assignedTo ? `Change from ${item.assignedTo.username}` : "Select developer…"}
                      </option>
                      {developers
                        .filter((dev) => dev.id !== item.assignedTo?.id)
                        .map((dev) => (
                          <option key={dev.id} value={dev.id}>👤 {dev.username}</option>
                        ))}
                    </select>
                  </div>
                )}

                {showEdit && (
                  <button className="tc-act-btn tc-act-violet"
                    onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}>
                    <Edit size={11} />
                    ✏️ Edit
                  </button>
                )}

                {showDelete && (
                  <button className="tc-act-btn tc-act-red" disabled={deleting}
                    onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}>
                    <Trash2 size={11} />
                    {deleting ? "⏳ Deleting…" : "🗑️ Delete"}
                  </button>
                )}

              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="tc-footer">
          <div className="tc-footer-meta">
            {!!item.commentCount && (
              <div className="tc-meta-item">
                <MessageCircle size={11} />
                <span>{item.commentCount}</span>
              </div>
            )}
            {!!item.attachmentCount && (
              <div className="tc-meta-item">
                <Paperclip size={11} />
                <span>{item.attachmentCount}</span>
              </div>
            )}
          </div>
          {item.assignedTo ? (
            <div
              className="tc-avatar"
              title={item.assignedTo.username}
              style={{ background: item.assignedTo.avatarColor }}
            >
              {item.assignedTo.initials}
            </div>
          ) : (
            <div className="tc-avatar-empty" />
          )}
        </div>

      </div>
    </>
  );
}