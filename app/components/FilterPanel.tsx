"use client";

import { X, ChevronDown, Search } from "lucide-react";
import { WorkItemFilter, WorkItemType, WorkItemStatus, Priority, ClientReviewStatus, User } from "../types";

type Props = {
  filter: WorkItemFilter;
  onChange: (f: WorkItemFilter) => void;
  onClose: () => void;
  members: User[];
};

const SELECT_CLS =
  "w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer";
const BORDER = { borderColor: "rgba(255,255,255,0.1)" };

export default function FilterPanel({ filter, onChange, onClose, members }: Props) {
  const set = <K extends keyof WorkItemFilter>(key: K, val: WorkItemFilter[K]) =>
    onChange({ ...filter, [key]: val });

  const hasActive = Object.values(filter).some((v) => v !== "" && v !== undefined);

  return (
    <div
      className="border rounded-2xl p-4 flex-shrink-0"
      style={{ background: "#161920", borderColor: "rgba(255,255,255,0.08)", width: "240px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white text-xs font-semibold uppercase tracking-widest">Filters</span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              onClick={() => onChange({ sortBy: "newest" })}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
              style={{ fontSize: "10px" }}
            >
              Clear all
            </button>
          )}
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Text search */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Search
        </label>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2" style={BORDER}>
          <Search size={11} className="text-gray-600 flex-shrink-0" />
          <input
            className="bg-transparent text-xs text-gray-300 flex-1 outline-none placeholder-gray-600"
            placeholder="Title, description..."
            value={filter.textSearch ?? ""}
            onChange={(e) => set("textSearch", e.target.value)}
          />
        </div>
      </div>

      {/* Type */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Type
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.type ?? ""} onChange={(e) => set("type", e.target.value as WorkItemType | "")}>
            <option value="">All types</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Status */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Status
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.status ?? ""} onChange={(e) => set("status", e.target.value as WorkItemStatus | "")}>
            <option value="">All statuses</option>
            <option value="BUG_LIST">Bug List</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="QA_FIX">QA Fix</option>
            <option value="DONE">Done</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Priority */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Priority
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.priority ?? ""} onChange={(e) => set("priority", e.target.value as Priority | "")}>
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Assigned To */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Assigned To
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.assignedTo ?? ""} onChange={(e) => set("assignedTo", e.target.value ? Number(e.target.value) : "")}>
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.username}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Created By */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Created By
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.createdBy ?? ""} onChange={(e) => set("createdBy", e.target.value ? Number(e.target.value) : "")}>
            <option value="">Anyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.username}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Created Range */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Created From
        </label>
        <input
          type="datetime-local"
          className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          style={BORDER}
          value={filter.createdFrom ?? ""}
          onChange={(e) => set("createdFrom", e.target.value || undefined)}
        />
      </div>

      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Created To
        </label>
        <input
          type="datetime-local"
          className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          style={BORDER}
          value={filter.createdTo ?? ""}
          onChange={(e) => set("createdTo", e.target.value || undefined)}
        />
      </div>

      {/* Due Range */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Due From
        </label>
        <input
          type="datetime-local"
          className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          style={BORDER}
          value={filter.dueFrom ?? ""}
          onChange={(e) => set("dueFrom", e.target.value || undefined)}
        />
      </div>

      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Due To
        </label>
        <input
          type="datetime-local"
          className="w-full bg-transparent border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
          style={BORDER}
          value={filter.dueTo ?? ""}
          onChange={(e) => set("dueTo", e.target.value || undefined)}
        />
      </div>

      {/* Client Review */}
      <div className="mb-3">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Client Review
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.clientReviewStatus ?? ""} onChange={(e) => set("clientReviewStatus", e.target.value as ClientReviewStatus | "")}>
            <option value="">All</option>
            <option value="NONE">None</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Sort */}
      <div className="mb-1">
        <label className="text-gray-500 mb-1.5 block" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Sort By
        </label>
        <div className="relative">
          <select className={SELECT_CLS} style={BORDER} value={filter.sortBy ?? "newest"} onChange={(e) => set("sortBy", e.target.value as WorkItemFilter["sortBy"])}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due_soon">Due soon</option>
            <option value="priority">Priority</option>
          </select>
          <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
