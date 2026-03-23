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
  return (
    <div className="flex flex-col rounded-2xl flex-shrink-0 backdrop-blur-xl shadow-2xl"
      style={{ width: "280px", background: "rgba(22, 25, 32, 0.7)", border: "1px solid rgba(139, 92, 246, 0.2)",
        minHeight: "calc(100vh - 130px)", maxHeight: "calc(100vh - 130px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
            <h2 className="text-gray-200 text-sm font-semibold tracking-wide">{title}</h2>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md min-w-[22px] text-center"
              style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
              {items.length}
            </span>
          </div>
          {canAdd && (
            <button onClick={onAddItem} className="text-gray-600 hover:text-gray-300 transition-colors p-0.5 rounded hover:bg-white/5">
              <Plus size={14} />
            </button>
          )}
        </div>
        <p className="text-gray-600 pl-5" style={{ fontSize: "10px" }}>{STATUS_DESCRIPTIONS[status]}</p>
        <div className="mt-3 h-px rounded-full"
          style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }} />
      </div>
      {/* Cards */}
      <div className={`flex-1 overflow-y-auto px-3 pb-2 ${
        status === 'DONE' ? 'scrollbar-green' : 
        status === 'IN_PROGRESS' ? 'scrollbar-orange' : 
        status === 'QA_FIX' ? 'scrollbar-cyan' : ''
      }`}>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-20 rounded-xl border-dashed border text-gray-700 text-xs mt-1"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}>No items</div>
        ) : (
          items.map((item) => (
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
          ))
        )}
      </div>
      {/* Add footer */}
      {canAdd && (
        <button onClick={onAddItem}
          className="flex items-center gap-2 mx-3 mb-3 mt-1 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all text-xs flex-shrink-0">
          <Plus size={12} /> Add work item
        </button>
      )}
    </div>
  );
}
