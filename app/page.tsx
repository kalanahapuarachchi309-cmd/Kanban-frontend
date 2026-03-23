"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KanbanColumn from "./components/KanbanColumn";
import FilterPanel from "./components/FilterPanel";
import { WorkItem, WorkItemStatus, Role, Notification, WorkItemFilter, User, Project } from "./types";
import { useAuth } from "./lib/auth-context";
import {
  getWorkItems,
  getMyAssignedWorkItems,
  submitClientReview,
  getUsers,
  getNotifications,
  getProjects,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  assignWorkItem,
  changeWorkItemStatus,
  publishWorkItem,
  deleteWorkItem,
  getDeveloperUsers,
  createWorkItem,
  updateWorkItem,
} from "./lib/api/services";
import type { Priority, WorkItemType } from "./types";
import { connectNotificationSocket } from "./lib/ws/notifications";

const COLUMNS: { status: WorkItemStatus; title: string; accent: string }[] = [
  { status: "BUG_LIST",    title: "Bug List",    accent: "#f87171" },
  { status: "IN_PROGRESS", title: "In Progress", accent: "#fb923c" },
  { status: "QA_FIX",      title: "QA Fix",      accent: "#fbbf24" },
  { status: "DONE",        title: "Done",        accent: "#86efac" },
  { status: "PUBLISHED",   title: "Published",   accent: "#a78bfa" },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load data";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { user, isAuth, isLoading: authLoading } = useAuth();
  
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [clientReviewLoadingId, setClientReviewLoadingId] = useState<number | null>(null);
  const [statusUpdatingItemId, setStatusUpdatingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [publishingItemId, setPublishingItemId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for creating/editing work items
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemType, setNewItemType] = useState<WorkItemType>("BUG");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPriority, setNewItemPriority] = useState<Priority>("MEDIUM");
  const [newItemDueAt, setNewItemDueAt] = useState("");
  const [newItemDurationHours, setNewItemDurationHours] = useState<number | "">("");
  const [creatingItem, setCreatingItem] = useState(false);
  
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"Kanban" | "Table" | "List">("Kanban");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<WorkItemFilter>({ sortBy: "newest" });
  const currentRole = (user?.role || "DEVELOPER") as Role;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuth) {
      router.push("/login");
    }
  }, [authLoading, isAuth, router]);

  const fetchBoardData = useCallback(async () => {
    if (!isAuth || !user) return;
    const isDeveloper = user.role === "DEVELOPER";
    const isClient = user.role === "CLIENT";
    const canLoadUsers = user.role === "ADMIN";
    const canLoadDevelopers = user.role === "ADMIN" || user.role === "QA_PM";
    const canUseNotifications = user.role !== "CLIENT";
    try {
      setIsLoading(true);
      setError(null);

      const backendFilter = {
        ...filter,
        assignedTo: filter.assignedTo === "unassigned" ? "" : filter.assignedTo,
      };

      const [projectsData, usersData, notificationsData, developersData] = await Promise.all([
        getProjects().catch((err) => {
          console.error("[Home] Failed to load projects", err);
          return [];
        }),
        canLoadUsers ? getUsers().catch((err) => {
          console.error("[Home] Failed to load users", err);
          return [];
        }) : Promise.resolve([]),
        canUseNotifications ? getNotifications().catch(() => []) : Promise.resolve([]),
        canLoadDevelopers ? getDeveloperUsers().catch(() => []) : Promise.resolve([]),
      ]);

      const selectedProjectId =
        activeProjectId && projectsData.some((p) => p.id === activeProjectId)
          ? activeProjectId
          : projectsData[0]?.id ?? null;

      if (selectedProjectId !== activeProjectId) {
        setActiveProjectId(selectedProjectId);
      }

      const workItemsData = selectedProjectId
        ? isDeveloper
          ? await getMyAssignedWorkItems(selectedProjectId).catch((err) => {
              console.error("[Home] Failed to load developer assigned items", err);
              return [];
            })
          : isClient
          ? await getWorkItems(selectedProjectId, backendFilter).catch((err) => {
              console.error("[Home] Failed to load client work items", err);
              return [];
            })
          : await getWorkItems(selectedProjectId, backendFilter).catch((err) => {
              console.error("[Home] Failed to load work items", err);
              return [];
            })
        : [];

      setProjects(projectsData);
      setWorkItems(workItemsData);
      setUsers(usersData);
      setNotifications(notificationsData);
      setDevelopers(developersData);
    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAuth, user, activeProjectId, filter]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  useEffect(() => {
    if (!isAuth || !user) return;
    const isDeveloper = user.role === "DEVELOPER";
    const isClient = user.role === "CLIENT";
    const canUseNotifications = user.role !== "CLIENT";

    if (!canUseNotifications) return;

    const token = localStorage.getItem("jwt_token");
    if (!token) return;

    const cleanup = connectNotificationSocket(token, (incoming) => {
      setNotifications((prev) => [incoming, ...prev]);
      const shouldRefreshBoard =
        incoming.type === "STATUS_CHANGED" ||
        incoming.type === "ASSIGNMENT_CREATED" ||
        incoming.type === "COMMENT_ADDED" ||
        incoming.type === "DUE_NOW";

      if (shouldRefreshBoard && activeProjectId) {
        const backendFilter = {
          ...filter,
          assignedTo: filter.assignedTo === "unassigned" ? "" : filter.assignedTo,
        };
        if (isDeveloper) {
          getMyAssignedWorkItems(activeProjectId).then((data) => setWorkItems(data));
        } else if (isClient) {
          getWorkItems(activeProjectId, backendFilter).then((data) => setWorkItems(data));
        } else {
          getWorkItems(activeProjectId, backendFilter).then((data) => setWorkItems(data));
        }
      }
    });

    return cleanup;
  }, [isAuth, user, activeProjectId, filter]);

  const filtered = useMemo(() => workItems.filter((i) => {
    // CLIENT can view published items, own bugs, and rejected items sent back to BUG_LIST.
    if (currentRole === "CLIENT") {
      const isPublished = i.status === "PUBLISHED";
      const isOwnBug = i.type === "BUG" && i.createdBy.id === user?.id;
      const isRejectedBacklog = i.type === "BUG" && i.status === "BUG_LIST" && i.clientReviewStatus === "REJECTED";
      return isPublished || isOwnBug || isRejectedBacklog;
    }
    if (filter.assignedTo === "unassigned") return !i.assignedTo;
    return true;
  }), [workItems, filter.assignedTo, currentRole, user]);

  const handleMarkNotificationRead = async (id: number) => {
    await markNotificationAsRead(id).catch(() => null);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsAsRead().catch(() => null);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClientReview = async (id: number, reviewStatus: "ACCEPTED" | "REJECTED") => {
    if (currentRole !== "CLIENT") return;
    try {
      setClientReviewLoadingId(id);
      const updated = await submitClientReview(id, reviewStatus);
      setWorkItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setClientReviewLoadingId(null);
    }
  };

  const handleStatusChange = async (item: WorkItem, toStatus: "IN_PROGRESS" | "QA_FIX" | "DONE") => {
    const isDeveloperRole = currentRole === "DEVELOPER";
    const canManage = currentRole === "QA_PM" || currentRole === "ADMIN";

    if (toStatus === "IN_PROGRESS") {
      const canStartProgress = canManage || (isDeveloperRole && !!user && item.assignedTo?.id === user.id);
      if (!canStartProgress) return;
      if (item.status !== "BUG_LIST") return;
    }

    if (toStatus === "QA_FIX") {
      if (!isDeveloperRole || !user || item.assignedTo?.id !== user.id) return;
      if (item.status !== "IN_PROGRESS") return;
    }

    if (toStatus === "DONE") {
      if (!canManage) return;
      if (item.status !== "IN_PROGRESS" && item.status !== "QA_FIX") return;
    }

    try {
      setStatusUpdatingItemId(item.id);
      const updated = await changeWorkItemStatus(item.id, toStatus);
      setWorkItems((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setStatusUpdatingItemId(null);
    }
  };

  const handlePublish = async (item: WorkItem) => {
    const canManage = currentRole === "QA_PM" || currentRole === "ADMIN";
    if (!canManage) return;
    if (item.status !== "DONE") return;

    try {
      setPublishingItemId(item.id);
      const updated = await publishWorkItem(item.id);
      setWorkItems((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPublishingItemId(null);
    }
  };

  const handleDelete = async (item: WorkItem) => {
    const canManage = currentRole === "QA_PM" || currentRole === "ADMIN";
    if (!canManage) return;

    if (!window.confirm(`Delete ${item.type === "FEATURE" ? "feature" : "bug"} "${item.title}"?`)) return;

    try {
      setDeletingItemId(item.id);
      await deleteWorkItem(item.id, item.projectId);
      setWorkItems((prev) => prev.filter((current) => current.id !== item.id));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleAssign = async (item: WorkItem, developerId: number) => {
    const canReassign = currentRole === "QA_PM";
    if (!canReassign) return;
    if (item.assignedTo?.id === developerId) return;

    try {
      const updated = await assignWorkItem(item.id, developerId);
      setWorkItems((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleOpenAddModal = () => {
    // Reset form fields
    setEditingItemId(null);
    setNewItemType("BUG");
    setNewItemTitle("");
    setNewItemDescription("");
    setNewItemPriority("MEDIUM");
    setNewItemDueAt("");
    setNewItemDurationHours("");
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: WorkItem) => {
    // Load item data into form
    setEditingItemId(item.id);
    setNewItemType(item.type);
    setNewItemTitle(item.title);
    setNewItemDescription(item.description || "");
    setNewItemPriority(item.priority);
    setNewItemDueAt(item.dueAt ? toLocalDateTimeInput(item.dueAt) : "");
    setNewItemDurationHours("");
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setEditingItemId(null);
    setError(null);
  };

  const toLocalDateTimeInput = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId && !editingItemId) {
      setError("Please select a project first");
      return;
    }
    if (!newItemTitle.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setCreatingItem(true);
      setError(null);

      if (editingItemId) {
        // Update existing item
        const updated = await updateWorkItem(editingItemId, {
          title: newItemTitle,
          description: newItemDescription || undefined,
          priority: newItemPriority,
          dueAt: newItemDueAt || undefined,
        });
        setWorkItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        // Create new item
        const newItem = await createWorkItem(activeProjectId!, {
          type: newItemType,
          title: newItemTitle,
          description: newItemDescription || undefined,
          priority: newItemPriority,
          dueAt: newItemDueAt || undefined,
        });
        setWorkItems((prev) => [newItem, ...prev]);
      }

      handleCloseAddModal();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingItem(false);
    }
  };

  const hasFilter = Object.values(filter).some((v) => v !== "" && v !== undefined && v !== "newest");

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "linear-gradient(135deg, #0d0f14 0%, #1a1d2e 50%, #0d0f14 100%)" }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "linear-gradient(135deg, #0d0f14 0%, #1a1d2e 50%, #0d0f14 100%)" }}>
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuth || !user) {
    return null;
  }

  const currentProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0f14 0%, #1a1d2e 50%, #0d0f14 100%)" }}>
      <Sidebar
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        projects={projects}
        currentRole={currentRole}
        onRoleChange={() => {}} // Role changes happen via backend now
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          projectName={currentProject?.name || "Project"}
          notifications={notifications}
          showNotifications={currentRole !== "CLIENT"}
          onFilterToggle={() => setFilterOpen((v) => !v)}
          filterActive={filterOpen || hasFilter}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        />

        {/* Board area */}
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Filter panel */}
          {filterOpen && (
            <FilterPanel
              filter={filter}
              onChange={setFilter}
              onClose={() => setFilterOpen(false)}
              members={users}
            />
          )}

          {/* Kanban columns */}
          <div className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-2 scrollbar-thin">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                title={col.title}
                accentColor={col.accent}
                items={filtered.filter((i) => i.status === col.status)}
                currentRole={currentRole}
                currentUser={user}
                developers={developers}
                onAddItem={col.status === "BUG_LIST" ? handleOpenAddModal : undefined}
                onClientReview={handleClientReview}
                clientReviewLoadingId={clientReviewLoadingId}
                onStatusChange={handleStatusChange}
                onPublish={handlePublish}
                onDelete={handleDelete}
                onAssign={handleAssign}
                onEdit={handleOpenEditModal}
                statusUpdatingItemId={statusUpdatingItemId}
                publishingItemId={publishingItemId}
                deletingItemId={deletingItemId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Add Work Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={handleCloseAddModal}
          style={{ background: "rgba(0, 0, 0, 0.7)", animation: "fadeIn 0.2s ease-out" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl transform transition-all backdrop-blur-xl scrollbar-thin"
            style={{ 
              background: "rgba(30, 35, 48, 0.85)", 
              border: "1px solid rgba(139,92,246,0.3)",
              boxShadow: "0 20px 60px 0 rgba(139, 92, 246, 0.3)",
              animation: "slideUp 0.3s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}>
            
            <div className="sticky top-0 px-8 py-6 border-b border-white/5 backdrop-blur-xl rounded-t-3xl"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(99,102,241,0.08) 100%)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: editingItemId ? "rgba(139,92,246,0.15)" : "rgba(99,102,241,0.15)" }}>
                    {editingItemId ? "✏️" : "➕"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {editingItemId 
                        ? `Edit ${newItemType === "FEATURE" ? "Feature" : "Bug"}` 
                        : (newItemType === "FEATURE" ? "Create New Feature" : "Create New Bug")}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-medium">
                      {editingItemId ? "Update work item details" : "Add a new work item to the project"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-400 hover:text-white transition-all duration-200 p-2.5 hover:bg-white/10 rounded-xl group"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateWorkItem} className="p-8">
              {error && (
                <div className="mb-5 px-4 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-3 animate-slideDown">
                  <span className="text-xl">⚠️</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-5">
                {!editingItemId && (
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider">Type</label>
                    <select
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value as WorkItemType)}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 font-medium"
                      style={{ backdropFilter: "blur(10px)" }}
                    >
                      <option value="BUG">🐛 Bug</option>
                      <option value="FEATURE">✨ Feature</option>
                    </select>
                  </div>
                )}
                {editingItemId && (
                  <div className="px-5 py-4 rounded-2xl text-white border border-purple-400/20 text-sm flex items-center gap-3"
                    style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.1) 100%)" }}>
                    <span className="text-2xl">{newItemType === "FEATURE" ? "✨" : "🐛"}</span>
                    <div className="flex-1">
                      <span className="font-bold">Type: {newItemType}</span>
                      <span className="ml-3 text-xs text-gray-400 font-medium">ID: #{editingItemId}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider">Title *</label>
                  <input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder={newItemType === "FEATURE" ? "Enter feature title..." : "Enter bug title..."}
                    className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 placeholder:text-gray-500 font-medium"
                    style={{ backdropFilter: "blur(10px)" }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider">Description</label>
                  <textarea
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Provide detailed description..."
                    className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 placeholder:text-gray-500 resize-none font-medium"
                    style={{ backdropFilter: "blur(10px)" }}
                    rows={4}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider">Priority</label>
                    <select
                      value={newItemPriority}
                      onChange={(e) => setNewItemPriority(e.target.value as Priority)}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 font-medium"
                      style={{ backdropFilter: "blur(10px)" }}
                    >
                      <option value="LOW">🟢 Low</option>
                      <option value="MEDIUM">🟡 Medium</option>
                      <option value="HIGH">🟠 High</option>
                      <option value="CRITICAL">🔴 Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider">Due Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newItemDueAt}
                      onChange={(e) => setNewItemDueAt(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 font-medium"
                      style={{ backdropFilter: "blur(10px)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-2.5 uppercase tracking-wider flex items-center gap-2">
                    <span>⏱️</span>
                    <span>Calculate Due Date (hours from now)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={newItemDurationHours}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setNewItemDurationHours("");
                        return;
                      }
                      const hours = Number(value);
                      if (Number.isNaN(hours) || hours <= 0) {
                        setNewItemDurationHours("");
                        return;
                      }
                      setNewItemDurationHours(hours);
                      const calculated = new Date(Date.now() + hours * 60 * 60 * 1000);
                      setNewItemDueAt(toLocalDateTimeInput(calculated.toISOString()));
                    }}
                    placeholder="e.g., 24 hours"
                    className="w-full px-4 py-3.5 rounded-xl bg-black/20 text-white outline-none border border-white/10 hover:border-purple-400/30 focus:border-purple-400/50 transition-all duration-200 placeholder:text-gray-500 font-medium"
                    style={{ backdropFilter: "blur(10px)" }}
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    disabled={creatingItem}
                    className="flex-1 px-5 py-4 rounded-xl text-white font-bold disabled:opacity-50 hover:opacity-80 transition-all duration-200 border border-white/10"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingItem || !newItemTitle.trim()}
                    className="flex-1 px-5 py-4 rounded-xl text-white font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-95"
                    style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
                  >
                    {creatingItem 
                      ? (editingItemId ? "⏳ Updating..." : "⏳ Creating...") 
                      : editingItemId 
                      ? "💾 Save Changes" 
                      : (newItemType === "FEATURE" ? "✨ Add Feature" : "🐛 Add Bug")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
