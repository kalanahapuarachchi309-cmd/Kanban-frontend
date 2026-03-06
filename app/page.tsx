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
} from "./lib/api/services";
import { connectNotificationSocket } from "./lib/ws/notifications";

const COLUMNS: { status: WorkItemStatus; title: string; accent: string }[] = [
  { status: "BUG_LIST",    title: "Bug List",    accent: "#ef4444" },
  { status: "IN_PROGRESS", title: "In Progress", accent: "#f97316" },
  { status: "QA_FIX",      title: "QA Fix",      accent: "#f59e0b" },
  { status: "DONE",        title: "Done",        accent: "#22c55e" },
  { status: "PUBLISHED",   title: "Published",   accent: "#6366f1" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { user, isAuth, isLoading: authLoading } = useAuth();
  
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientReviewLoadingId, setClientReviewLoadingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    try {
      setIsLoading(true);
      setError(null);

      const backendFilter = {
        ...filter,
        assignedTo: filter.assignedTo === "unassigned" ? "" : filter.assignedTo,
      };

      const [projectsData, usersData, notificationsData] = await Promise.all([
        getProjects().catch((err) => {
          console.error("[Home] Failed to load projects", err);
          return [];
        }),
        canLoadUsers ? getUsers().catch((err) => {
          console.error("[Home] Failed to load users", err);
          return [];
        }) : Promise.resolve([]),
        getNotifications().catch((err) => {
          console.error("[Home] Failed to load notifications", err);
          return [];
        }),
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
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data");
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
    } catch (err: any) {
      setError(err?.message || "Failed to submit client review");
    } finally {
      setClientReviewLoadingId(null);
    }
  };

  const hasFilter = Object.values(filter).some((v) => v !== "" && v !== undefined && v !== "newest");

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0d0f14" }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0d0f14" }}>
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d0f14" }}>
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
          <div className="flex flex-1 gap-3 overflow-x-auto overflow-y-hidden pb-2">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                title={col.title}
                accentColor={col.accent}
                items={filtered.filter((i) => i.status === col.status)}
                currentRole={currentRole}
                onClientReview={handleClientReview}
                clientReviewLoadingId={clientReviewLoadingId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}