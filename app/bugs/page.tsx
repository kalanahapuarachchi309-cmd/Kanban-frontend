"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../lib/auth-context";
import { addComment, assignWorkItem, changeWorkItemStatus, createWorkItem, deleteWorkItem, getDeveloperUsers, getProjectMembers, getProjects, getWorkItems, publishWorkItem, updateWorkItem } from "../lib/api/services";
import type { Priority, Project, ProjectMember, Role, User, WorkItem, WorkItemType } from "../types";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function toLocalDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function BugsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuth, isLoading: authLoading } = useAuth();

  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [allDevelopers, setAllDevelopers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<WorkItem[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<number | "">("");
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [markingDoneItemId, setMarkingDoneItemId] = useState<number | null>(null);
  const [publishingItemId, setPublishingItemId] = useState<number | null>(null);
  const [publishingAllDone, setPublishingAllDone] = useState(false);
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
  const [dueAt, setDueAt] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
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
      const maybeResponse = err as { response?: { data?: { message?: string } }; message?: string };
      if (maybeResponse.response?.data?.message) {
        return maybeResponse.response.data.message;
      }
      if (maybeResponse.message) {
        return maybeResponse.message;
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
      getDeveloperUsers().catch(() => []),
    ])
      .then(([bugsData, members, developersData]) => {
        setBugs(bugsData);
        setProjectMembers(members);
        setAllDevelopers(developersData);
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

  const doneItems = useMemo(
    () => bugs.filter((item) => item.status === "DONE"),
    [bugs]
  );

  const developers = useMemo(
    () => {
      const map = new Map<number, User>();

      allDevelopers
        .filter((developer) => developer.role === "DEVELOPER" && developer.isActive !== false)
        .forEach((developer) => {
          map.set(developer.id, developer);
        });

      if (map.size === 0) {
        projectMembers
          .filter((member) => {
            const memberUser = member.user;
            if (!memberUser) return false;
            if (memberUser.role !== "DEVELOPER") return false;
            return memberUser.isActive !== false;
          })
          .forEach((member) => {
            if (member.user?.id != null) {
              map.set(member.user.id, member.user);
            }
          });
      }

      return Array.from(map.values()).sort((a, b) => a.username.localeCompare(b.username));
    },
    [allDevelopers, projectMembers]
  );

  const loadBugIntoFields = (bug: WorkItem) => {
    setSelectedBugId(bug.id);
    setSelectedDeveloperId(bug.assignedTo?.id ?? "");
    setItemType(bug.type);
    setTitle(bug.title || "");
    setDescription(bug.description || "");
    setPriority(bug.priority);
    setDueAt(toLocalDateTimeInput(bug.dueAt));
    setDurationHours("");
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

  const assignToDeveloper = async () => {
    if (!selectedItem) {
      setError("Select an item first.");
      return;
    }
    if (!selectedDeveloperId) {
      setError("Select a developer first.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const updated = await assignWorkItem(selectedItem.id, Number(selectedDeveloperId));
      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(`Assigned ${updated.type === "FEATURE" ? "feature" : "bug"} to ${updated.assignedTo?.username || "developer"}.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteItem = async (item: WorkItem) => {
    const confirmed = window.confirm(`Delete ${item.type === "FEATURE" ? "feature" : "bug"} ${item.type === "FEATURE" ? `FEATURE-${item.id}` : `BUG-${item.id}`}?`);
    if (!confirmed) return;

    try {
      setDeletingItemId(item.id);
      setError(null);
      setSuccess(null);
      await deleteWorkItem(item.id, item.projectId);
      setBugs((prev) => prev.filter((current) => current.id !== item.id));
      if (selectedBugId === item.id) {
        setSelectedBugId(null);
        setSelectedDeveloperId("");
      }
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} deleted successfully.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingItemId(null);
    }
  };

  const onApproveAndDone = async (item: WorkItem) => {
    if (item.status === "DONE" || item.status === "PUBLISHED") return;

    try {
      setMarkingDoneItemId(item.id);
      setError(null);
      setSuccess(null);

      const updated = await changeWorkItemStatus(item.id, "DONE");
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} approved by QA and moved to DONE. Check Home board DONE field.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setMarkingDoneItemId(null);
    }
  };

  const onPublishItem = async (item: WorkItem) => {
    if (item.status === "PUBLISHED") return;
    if (item.status !== "DONE") {
      setError("Only DONE items can be published.");
      return;
    }

    try {
      setPublishingItemId(item.id);
      setError(null);
      setSuccess(null);

      const updated = await publishWorkItem(item.id);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} published successfully. Check Home page Published section.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPublishingItemId(null);
    }
  };

  const onPublishAllDone = async () => {
    if (!activeProjectId) {
      setError("Please select a project first.");
      return;
    }
    if (doneItems.length === 0) {
      setError("No DONE items available to publish in this project.");
      return;
    }

    try {
      setPublishingAllDone(true);
      setError(null);
      setSuccess(null);

      const results = await Promise.allSettled(doneItems.map((item) => publishWorkItem(item.id)));
      const publishedItems = results
        .filter((result): result is PromiseFulfilledResult<WorkItem> => result.status === "fulfilled")
        .map((result) => result.value);

      if (publishedItems.length > 0) {
        const updatedMap = new Map<number, WorkItem>(publishedItems.map((item) => [item.id, item]));
        setBugs((prev) => prev.map((item) => updatedMap.get(item.id) || item));
      }

      const successCount = publishedItems.length;
      const failCount = results.length - successCount;
      if (failCount === 0) {
        setSuccess(`Published ${successCount} DONE item(s) successfully. Home Published section is updated for this project.`);
      } else {
        setSuccess(`Published ${successCount} item(s). ${failCount} item(s) failed to publish.`);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPublishingAllDone(false);
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
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });

      setBugs((prev) => [created, ...prev]);
      setSelectedBugId(null);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueAt("");
      setDurationHours("");
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
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs text-gray-300">DONE items in selected project: {doneItems.length}</span>
            <button
              type="button"
              onClick={onPublishAllDone}
              disabled={publishingAllDone || doneItems.length === 0}
              className="px-3 py-2 rounded text-xs text-white disabled:opacity-60"
              style={{ background: "#7c3aed" }}
            >
              {publishingAllDone ? "Publishing..." : "Publish All DONE"}
            </button>
          </div>
        )}

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
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              />
              <input
                type="number"
                min={1}
                step={1}
                value={durationHours}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setDurationHours("");
                    return;
                  }
                  const hours = Number(value);
                  if (Number.isNaN(hours) || hours <= 0) {
                    setDurationHours("");
                    return;
                  }
                  setDurationHours(hours);
                  const calculated = new Date(Date.now() + hours * 60 * 60 * 1000);
                  setDueAt(toLocalDateTimeInput(calculated.toISOString()));
                }}
                placeholder="Duration (hours)"
                className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              />
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
              Assign Item to Developer
            </div>
            <div className="flex gap-3 mb-4">
              <select
                value={selectedDeveloperId}
                onChange={(e) => setSelectedDeveloperId(e.target.value ? Number(e.target.value) : "")}
                className="flex-1 px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
              >
                <option value="">Select developer</option>
                {developers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={assignToDeveloper}
                disabled={submitting || !selectedDeveloperId}
                className="px-4 py-2 rounded text-white disabled:opacity-50"
                style={{ background: "#3b82f6" }}
              >
                Assign
              </button>
            </div>

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
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Due At</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created At</th>
                {canCreate && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orderedBugs.length === 0 ? (
                <tr>
                  <td colSpan={canCreate ? 10 : 9} className="px-4 py-5 text-gray-400">
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
                    <td className="px-4 py-3">{bug.assignedTo?.username || "Unassigned"}</td>
                    <td className="px-4 py-3">{bug.dueAt ? new Date(bug.dueAt).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{bug.createdBy?.username}</td>
                    <td className="px-4 py-3">{new Date(bug.createdAt).toLocaleString()}</td>
                    {canCreate && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApproveAndDone(bug);
                            }}
                            disabled={markingDoneItemId === bug.id || bug.status === "DONE" || bug.status === "PUBLISHED"}
                            className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                            style={{ background: "#16a34a" }}
                          >
                            {markingDoneItemId === bug.id ? "Moving..." : bug.status === "DONE" || bug.status === "PUBLISHED" ? "Done" : "Approve & Done"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPublishItem(bug);
                            }}
                            disabled={publishingItemId === bug.id || bug.status === "PUBLISHED" || bug.status !== "DONE"}
                            className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                            style={{ background: "#7c3aed" }}
                          >
                            {publishingItemId === bug.id ? "Publishing..." : bug.status === "PUBLISHED" ? "Published" : "Publish"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(bug);
                            }}
                            disabled={deletingItemId === bug.id}
                            className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                            style={{ background: "#ef4444" }}
                          >
                            {deletingItemId === bug.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    )}
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
