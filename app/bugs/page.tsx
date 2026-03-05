"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../lib/auth-context";
import { addComment, changeWorkItemStatus, createWorkItem, getProjectMembers, getProjects, getWorkItems, updateWorkItem } from "../lib/api/services";
import type { Priority, Project, Role, WorkItem, WorkItemType } from "../types";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function BugsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuth, isLoading: authLoading } = useAuth();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bugs, setBugs] = useState<WorkItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [projectRole, setProjectRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [itemType, setItemType] = useState<WorkItemType>("BUG");
  const [typeFilter, setTypeFilter] = useState<"ALL" | WorkItemType>("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [qaFeedback, setQaFeedback] = useState("");

  const currentRole = (user?.role || "DEVELOPER") as Role;
  const activeRole = projectRole || currentRole;
  const canCreate =
    currentRole === "QA_PM" ||
    currentRole === "ADMIN" ||
    activeRole === "QA_PM" ||
    activeRole === "ADMIN";
  const canView = activeRole !== "CLIENT";

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err !== null) {
      const maybeResponse = err as { response?: { data?: { message?: string } } };
      if (maybeResponse.response?.data?.message) {
        return maybeResponse.response.data.message;
      }
    }
    return "Request failed";
  };

  useEffect(() => {
    if (!authLoading && !isAuth) {
      router.push("/login");
    }
  }, [authLoading, isAuth, router]);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "FEATURE" || typeParam === "BUG") {
      setTypeFilter(typeParam);
    } else if (typeParam === "ALL") {
      setTypeFilter("ALL");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isAuth || !user || !canView) return;

    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const projectsData = await getProjects();
        setProjects(projectsData);

        setActiveProjectId((prev) => {
          if (projectsData.length === 0) return null;
          if (prev && projectsData.some((p) => p.id === prev)) return prev;
          return projectsData[0].id;
        });
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [isAuth, user, canView]);

  useEffect(() => {
    if (!isAuth || !user || !canView || !activeProjectId) return;
    Promise.all([
      getWorkItems(activeProjectId, typeFilter === "ALL" ? undefined : { type: typeFilter }),
      getProjectMembers(activeProjectId).catch(() => []),
    ])
      .then(([bugsData, members]) => {
        setBugs(bugsData);
        const me = members.find((member) => member.user?.id === user.id);
        setProjectRole(me?.role || null);
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, [activeProjectId, isAuth, user, canView, typeFilter]);

  const orderedBugs = useMemo(
    () => [...bugs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bugs]
  );

  const selectedItem = useMemo(
    () => bugs.find((item) => item.id === selectedBugId),
    [bugs, selectedBugId]
  );

  const loadBugIntoFields = (bug: WorkItem) => {
    setSelectedBugId(bug.id);
    setItemType(bug.type);
    setTitle(bug.title || "");
    setDescription(bug.description || "");
    setPriority(bug.priority);
    setQaFeedback("");
    setSuccess(`Loaded ${bug.type === "FEATURE" ? "feature" : "bug"} #${bug.id} into fields.`);
    setError(null);
  };

  const sendBackToProgress = async () => {
    if (!selectedItem) {
      setError("Select a bug first.");
      return;
    }
    if (!qaFeedback.trim()) {
      setError("Please add QA description before sending back.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const feedbackText = qaFeedback.trim();
      const feedbackPrefix = "[QA/PM Feedback] ";
      const cleanedDescription = (selectedItem.description || "")
        .split("\n")
        .filter((line) => !line.startsWith(feedbackPrefix))
        .join("\n")
        .trim();
      const nextDescription = cleanedDescription
        ? `${feedbackPrefix}${feedbackText}\n${cleanedDescription}`
        : `${feedbackPrefix}${feedbackText}`;

      await updateWorkItem(selectedItem.id, { description: nextDescription });
      await addComment(selectedItem.id, `QA feedback: ${feedbackText}`);
      const updated = await changeWorkItemStatus(selectedItem.id, "IN_PROGRESS");

      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setQaFeedback("");
      setSuccess("Bug sent back to In Progress with QA description.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateBug = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    if (!activeProjectId) {
      setError("Please select a project first.");
      return;
    }
    if (!title.trim()) {
      setError("Bug title is required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const created = await createWorkItem(activeProjectId, {
        type: itemType,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });

      setBugs((prev) => [created, ...prev]);
      setSelectedBugId(null);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setItemType("BUG");
      setSuccess(`${created.type === "FEATURE" ? "Feature" : "Bug"} added to bug list successfully.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: "#0d0f14" }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuth || !user) {
    return null;
  }

  if (!canView) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "#0d0f14" }}>
        <Sidebar
          activeProjectId={activeProjectId}
          onSelectProject={setActiveProjectId}
          projects={projects}
          currentRole={currentRole}
          onRoleChange={() => {}}
        />
        <div className="flex-1 flex items-center justify-center text-red-300 text-lg">
          You are not allowed to view bug list.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d0f14" }}>
      <Sidebar
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        projects={projects}
        currentRole={currentRole}
        onRoleChange={() => {}}
      />

      <div className="flex-1 overflow-auto p-6">
        <h1 className="text-2xl font-semibold text-white mb-4">Bug List</h1>

        {error && <div className="mb-4 text-sm text-red-300">{error}</div>}
        {success && <div className="mb-4 text-sm text-green-300">{success}</div>}

        <div className="mb-4 max-w-xs">
          <label className="text-xs text-gray-400 block mb-1">Project</label>
          <select
            value={activeProjectId ?? ""}
            onChange={(e) => setActiveProjectId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
          >
            <option value="" disabled>
              {projects.length === 0 ? "No projects available" : "Select project"}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p className="mt-2 text-xs text-amber-300">No projects found. Ask admin to add a project or add you as a project member.</p>
          )}
        </div>

        <div className="mb-4 max-w-xs">
          <label className="text-xs text-gray-400 block mb-1">Filter</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "ALL" | WorkItemType)}
            className="w-full px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
          >
            <option value="BUG">Bugs</option>
            <option value="FEATURE">Features</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {canCreate && (
          <form
            onSubmit={onCreateBug}
            className="mb-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="grid gap-3">
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as WorkItemType)}
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              >
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature</option>
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={itemType === "FEATURE" ? "Feature title" : "Bug title"}
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
                rows={3}
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded text-white"
                style={{ background: "#6366f1", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "Adding..." : itemType === "FEATURE" ? "Add Feature" : "Add Bug"}
              </button>
            </div>
          </form>
        )}

        {canCreate && selectedItem && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-sm text-gray-200 mb-2">
              QA Check: {selectedItem.type === "FEATURE" ? `FEATURE-${selectedItem.id}` : `BUG-${selectedItem.id}`} ({selectedItem.status})
            </div>
            <textarea
              value={qaFeedback}
              onChange={(e) => setQaFeedback(e.target.value)}
              placeholder="If developer fix is not correct, write QA description here..."
              className="w-full px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10 mb-3"
              rows={3}
            />
            <button
              type="button"
              onClick={sendBackToProgress}
              disabled={submitting || !qaFeedback.trim()}
              className="px-4 py-2 rounded text-white disabled:opacity-50"
              style={{ background: "#f97316" }}
            >
              Send Back to In Progress
            </button>
          </div>
        )}

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="px-4 py-3">Item ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created At</th>
              </tr>
            </thead>
            <tbody>
              {orderedBugs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-gray-400">
                    No bugs yet.
                  </td>
                </tr>
              ) : (
                orderedBugs.map((bug) => (
                  <tr
                    key={bug.id}
                    onClick={() => loadBugIntoFields(bug)}
                    className="border-b border-white/5 text-gray-200 cursor-pointer"
                    style={{
                      background: selectedBugId === bug.id ? "rgba(99,102,241,0.16)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3">{bug.type === "FEATURE" ? `FEATURE-${bug.id}` : `BUG-${bug.id}`}</td>
                    <td className="px-4 py-3">{bug.type}</td>
                    <td className="px-4 py-3">{bug.title}</td>
                    <td className="px-4 py-3">{bug.priority}</td>
                    <td className="px-4 py-3">{bug.status}</td>
                    <td className="px-4 py-3">{bug.createdBy?.username}</td>
                    <td className="px-4 py-3">{new Date(bug.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
