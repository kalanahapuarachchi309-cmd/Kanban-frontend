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
  "w-full border rounded-lg px-3 py-2 text-xs text-white focus:outline-none appearance-none cursor-pointer transition-all duration-200 focus:border-violet-400 focus:shadow-lg hover:border-violet-300";
const BORDER = { borderColor: "rgba(139, 92, 246, 0.25)" };

export default function FilterPanel({ filter, onChange, onClose, members }: Props) {
  const set = <K extends keyof WorkItemFilter>(key: K, val: WorkItemFilter[K]) =>
    onChange({ ...filter, [key]: val });

  const assignedToValue = (() => {
    if (filter.assignedTo === "unassigned") return "unassigned";
    if (typeof filter.assignedTo === "number" && !Number.isNaN(filter.assignedTo)) {
      return String(filter.assignedTo);
    }
    return "";
  })();

  const hasActive = Object.values(filter).some((v) => v !== "" && v !== undefined);

  return (
    <div
      className="border rounded-2xl p-5 flex-shrink-0 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-thin backdrop-blur-xl shadow-2xl"
      style={{ 
        background: "rgba(22, 25, 32, 0.85)", 
        borderColor: "rgba(139, 92, 246, 0.3)", 
        width: "260px",
        boxShadow: "0 0 30px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: "rgba(139, 92, 246, 0.2)" }}>
        <span className="text-white text-sm font-bold uppercase tracking-wider" style={{ textShadow: "0 0 10px rgba(139, 92, 246, 0.3)" }}>Filters</span>
        <div className="flex items-center gap-2">
          {hasActive && (
            <button
              onClick={() => onChange({ sortBy: "newest" })}
              className="px-2 py-1 rounded-lg text-violet-300 hover:text-violet-200 hover:bg-violet-500/20 transition-all duration-200"
              style={{ fontSize: "10px", fontWeight: "600" }}
            >
              Clear all
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/20 transition-all duration-200"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Text search */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Search
        </label>
        <div 
          className="flex items-center gap-2 border rounded-lg px-3 py-2.5 backdrop-blur-sm transition-all duration-200 focus-within:border-violet-400 focus-within:shadow-lg" 
          style={{ 
            ...BORDER, 
            background: "rgba(0, 0, 0, 0.3)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
          }}
        >
          <Search size={14} className="text-violet-300 flex-shrink-0" />
          <input
            className="bg-transparent text-sm text-white flex-1 outline-none placeholder-gray-500"
            placeholder="Title, description..."
            value={filter.textSearch ?? ""}
            onChange={(e) => set("textSearch", e.target.value)}
          />
        </div>
      </div>

      {/* Type */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Type
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.type ?? ""} 
            onChange={(e) => set("type", e.target.value as WorkItemType | "")}
          >
            <option value="" style={{ background: "#1a1d2e" }}>All types</option>
            <option value="BUG" style={{ background: "#1a1d2e" }}>Bug</option>
            <option value="FEATURE" style={{ background: "#1a1d2e" }}>Feature</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Status */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Status
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.status ?? ""} 
            onChange={(e) => set("status", e.target.value as WorkItemStatus | "")}
          >
            <option value="" style={{ background: "#1a1d2e" }}>All statuses</option>
            <option value="BUG_LIST" style={{ background: "#1a1d2e" }}>Bug List</option>
            <option value="IN_PROGRESS" style={{ background: "#1a1d2e" }}>In Progress</option>
            <option value="QA_FIX" style={{ background: "#1a1d2e" }}>QA Fix</option>
            <option value="DONE" style={{ background: "#1a1d2e" }}>Done</option>
            <option value="PUBLISHED" style={{ background: "#1a1d2e" }}>Published</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Priority */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Priority
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.priority ?? ""} 
            onChange={(e) => set("priority", e.target.value as Priority | "")}
          >
            <option value="" style={{ background: "#1a1d2e" }}>All priorities</option>
            <option value="LOW" style={{ background: "#1a1d2e" }}>Low</option>
            <option value="MEDIUM" style={{ background: "#1a1d2e" }}>Medium</option>
            <option value="HIGH" style={{ background: "#1a1d2e" }}>High</option>
            <option value="CRITICAL" style={{ background: "#1a1d2e" }}>Critical</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Assigned To */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Assigned To
        </label>
        <div className="relative">
          <select
            className={SELECT_CLS}
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }}
            value={assignedToValue}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) {
                set("assignedTo", "");
                return;
              }
              if (value === "unassigned") {
                set("assignedTo", "unassigned");
                return;
              }
              const parsed = Number(value);
              set("assignedTo", Number.isNaN(parsed) ? "" : parsed);
            }}
          >
            <option value="" style={{ background: "#1a1d2e" }}>Anyone</option>
            <option value="unassigned" style={{ background: "#1a1d2e" }}>Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} style={{ background: "#1a1d2e" }}>{m.username}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Created By */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Created By
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.createdBy ?? ""} 
            onChange={(e) => set("createdBy", e.target.value ? Number(e.target.value) : "")}
          >
            <option value="" style={{ background: "#1a1d2e" }}>Anyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id} style={{ background: "#1a1d2e" }}>{m.username}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Created Range */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Created From
        </label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 focus:border-violet-400 focus:shadow-lg hover:border-violet-300"
          style={{
            ...BORDER,
            background: "rgba(0, 0, 0, 0.3)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
          }}
          value={filter.createdFrom ?? ""}
          onChange={(e) => set("createdFrom", e.target.value || undefined)}
        />
      </div>

      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Created To
        </label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 focus:border-violet-400 focus:shadow-lg hover:border-violet-300"
          style={{
            ...BORDER,
            background: "rgba(0, 0, 0, 0.3)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
          }}
          value={filter.createdTo ?? ""}
          onChange={(e) => set("createdTo", e.target.value || undefined)}
        />
      </div>

      {/* Due Range */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Due From
        </label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 focus:border-violet-400 focus:shadow-lg hover:border-violet-300"
          style={{
            ...BORDER,
            background: "rgba(0, 0, 0, 0.3)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
          }}
          value={filter.dueFrom ?? ""}
          onChange={(e) => set("dueFrom", e.target.value || undefined)}
        />
      </div>

      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Due To
        </label>
        <input
          type="datetime-local"
          className="w-full border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-all duration-200 focus:border-violet-400 focus:shadow-lg hover:border-violet-300"
          style={{
            ...BORDER,
            background: "rgba(0, 0, 0, 0.3)",
            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
          }}
          value={filter.dueTo ?? ""}
          onChange={(e) => set("dueTo", e.target.value || undefined)}
        />
      </div>

      {/* Client Review */}
      <div className="mb-4">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Client Review
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.clientReviewStatus ?? ""} 
            onChange={(e) => set("clientReviewStatus", e.target.value as ClientReviewStatus | "")}
          >
            <option value="" style={{ background: "#1a1d2e" }}>All</option>
            <option value="NONE" style={{ background: "#1a1d2e" }}>None</option>
            <option value="ACCEPTED" style={{ background: "#1a1d2e" }}>Accepted</option>
            <option value="REJECTED" style={{ background: "#1a1d2e" }}>Rejected</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>

      {/* Sort */}
      <div className="mb-0">
        <label className="text-violet-200 mb-2 block font-medium" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Sort By
        </label>
        <div className="relative">
          <select 
            className={SELECT_CLS} 
            style={{ 
              ...BORDER, 
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)"
            }} 
            value={filter.sortBy ?? "newest"} 
            onChange={(e) => set("sortBy", e.target.value as WorkItemFilter["sortBy"])}
          >
            <option value="newest" style={{ background: "#1a1d2e" }}>Newest first</option>
            <option value="oldest" style={{ background: "#1a1d2e" }}>Oldest first</option>
            <option value="due_soon" style={{ background: "#1a1d2e" }}>Due soon</option>
            <option value="priority" style={{ background: "#1a1d2e" }}>Priority</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
