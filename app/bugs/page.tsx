"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../lib/auth-context";
import { addComment, assignWorkItem, changeWorkItemStatus, createBug, createWorkItem, deleteWorkItem, getBugs, getComments, getDeveloperUsers, getMyAssignedWorkItems, getProjectMembers, getProjects, getWorkItemAttachments, getWorkItems, publishWorkItem, submitClientReview, updateWorkItem, uploadWorkItemAttachment } from "../lib/api/services";
import type { Priority, Project, ProjectMember, Role, User, WorkItem, WorkItemType } from "../types";
import type { AttachmentDto, Comment as ProcessComment } from "../lib/api/services";

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
  const [inlineAssigningItemId, setInlineAssigningItemId] = useState<number | null>(null);
  const [publishingAllDone, setPublishingAllDone] = useState(false);
  const [projectRole, setProjectRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [itemType, setItemType] = useState<WorkItemType>("BUG");
  const [typeFilter, setTypeFilter] = useState<"ALL" | WorkItemType>("BUG");
  const [assignedToFilter, setAssignedToFilter] = useState<number | "ALL" | "UNASSIGNED">("ALL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [durationHours, setDurationHours] = useState<number | "">("");
  const [qaFeedback, setQaFeedback] = useState("");
  const [processStepInput, setProcessStepInput] = useState("");
  const [processComments, setProcessComments] = useState<ProcessComment[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<AttachmentDto[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentDto | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [processSubmitting, setProcessSubmitting] = useState(false);
  const [statusUpdatingItemId, setStatusUpdatingItemId] = useState<number | null>(null);
  const [clientReviewingItemId, setClientReviewingItemId] = useState<number | null>(null);

  const currentRole = (user?.role || "DEVELOPER") as Role;
  const isDeveloperRole = currentRole === "DEVELOPER";
  const isClientRole = currentRole === "CLIENT";
  const activeRole = projectRole || currentRole;
  const canManage =
    currentRole === "QA_PM" ||
    currentRole === "ADMIN" ||
    activeRole === "QA_PM" ||
    activeRole === "ADMIN";
  const canClientCreateBug = isClientRole || activeRole === "CLIENT";
  const canCreateBug = canManage || canClientCreateBug;
  const canReassign = currentRole === "QA_PM" || activeRole === "QA_PM";
  const canView = true;
  const canShowActionsColumn = canManage || isDeveloperRole || isClientRole;

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "object" && err !== null) {
      const maybeResponse = err as {
        response?: { data?: { message?: string; errors?: string[] } };
        message?: string;
      };
      const backendErrors = maybeResponse.response?.data?.errors;
      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        return backendErrors[0];
      }
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

    const canLoadProjectMembers = !isClientRole;
    const canLoadDevelopers = currentRole === "ADMIN" || currentRole === "QA_PM";

    const loadItemsPromise = isDeveloperRole
      ? getMyAssignedWorkItems(activeProjectId).then((items) => {
          if (typeFilter === "ALL") return items;
          return items.filter((item) => item.type === typeFilter);
        })
      : isClientRole
      ? getBugs(activeProjectId)
      : getWorkItems(activeProjectId, typeFilter === "ALL" ? undefined : { type: typeFilter });

    Promise.all([
      loadItemsPromise,
      canLoadProjectMembers ? getProjectMembers(activeProjectId).catch(() => []) : Promise.resolve([]),
      canLoadDevelopers ? getDeveloperUsers().catch(() => []) : Promise.resolve([]),
    ])
      .then(([bugsData, members, developersData]) => {
        setBugs(bugsData);
        setProjectMembers(members);
        setAllDevelopers(developersData);
        const me = members.find((member) => member.user?.id === user.id);
        setProjectRole(me?.role || null);
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, [activeProjectId, isAuth, user, canView, typeFilter, isDeveloperRole, isClientRole]);

  useEffect(() => {
    if (!user) return;
    if (isDeveloperRole) {
      setAssignedToFilter(user.id);
    }
    if (isClientRole) {
      setTypeFilter("BUG");
    }
  }, [isDeveloperRole, isClientRole, user]);

  const orderedBugs = useMemo(
    () => [...bugs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bugs]
  );

  const filteredBugs = useMemo(() => {
    if (isDeveloperRole && user?.id) {
      return orderedBugs.filter((item) => item.assignedTo?.id === user.id);
    }
    if (assignedToFilter === "ALL") return orderedBugs;
    if (assignedToFilter === "UNASSIGNED") {
      return orderedBugs.filter((item) => !item.assignedTo?.id);
    }
    return orderedBugs.filter((item) => item.assignedTo?.id === assignedToFilter);
  }, [orderedBugs, assignedToFilter, isDeveloperRole, user]);

  const selectedItem = useMemo(
    () => bugs.find((item) => item.id === selectedBugId),
    [bugs, selectedBugId]
  );

  const isDeveloperAssignedSelected = !!(selectedItem && user && selectedItem.assignedTo?.id === user.id);

  const processEntries = useMemo(
    () => processComments.filter((comment) => comment.message?.startsWith("[PROCESS] ")),
    [processComments]
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

      projectMembers
        .filter((member) => {
          const memberUser = member.user;
          if (!memberUser) return false;
          if (member.role !== "DEVELOPER") return false;
          return memberUser.isActive !== false;
        })
        .forEach((member) => {
          if (member.user?.id != null) {
            map.set(member.user.id, member.user);
          }
        });

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
    setProcessStepInput("");
    setSuccess(`Loaded ${bug.type === "FEATURE" ? "feature" : "bug"} #${bug.id} into fields.`);
    setError(null);
  };

  useEffect(() => {
    if (!selectedItem) {
      setProcessComments([]);
      setSelectedAttachments([]);
      setAttachmentFile(null);
      return;
    }

    Promise.all([
      getComments(selectedItem.id).catch(() => []),
      getWorkItemAttachments(selectedItem.id).catch(() => []),
    ]).then(([comments, attachments]) => {
      setProcessComments(comments);
      setSelectedAttachments(attachments);
    });
  }, [selectedItem?.id]);

  const uploadClientAttachment = async () => {
    if (!isClientRole) {
      setError("Only CLIENT can upload bug attachments from this section.");
      return;
    }
    if (!selectedItem) {
      setError("Select a bug first from the table.");
      return;
    }
    if (!attachmentFile) {
      setError("Select an image file first.");
      return;
    }

    try {
      setUploadingAttachment(true);
      setError(null);
      setSuccess(null);

      const uploaded = await uploadWorkItemAttachment(selectedItem.id, attachmentFile);
      setSelectedAttachments((prev) => [uploaded, ...prev]);
      setAttachmentFile(null);
      setSuccess("Attachment uploaded and saved successfully.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingAttachment(false);
    }
  };

  const isImageAttachment = (fileType?: string) => {
    return !!fileType && fileType.startsWith("image/");
  };

  const addProcessStep = async () => {
    if (!selectedItem) {
      setError("Select a bug first.");
      return;
    }
    if (!isDeveloperRole || !isDeveloperAssignedSelected) {
      setError("Only the assigned developer can update process steps.");
      return;
    }
    if (selectedItem.status !== "IN_PROGRESS") {
      setError("Process steps can be added only while status is IN_PROGRESS.");
      return;
    }
    if (!processStepInput.trim()) {
      setError("Enter a process step first.");
      return;
    }

    try {
      setProcessSubmitting(true);
      setError(null);
      setSuccess(null);

      const created = await addComment(selectedItem.id, `[PROCESS] ${processStepInput.trim()}`);
      setProcessComments((prev) => [...prev, created]);
      setProcessStepInput("");
      setSuccess("Process step added.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setProcessSubmitting(false);
    }
  };

  const moveBugStatus = async (item: WorkItem, toStatus: "IN_PROGRESS" | "QA_FIX") => {
    if (!isDeveloperRole || !user || item.assignedTo?.id !== user.id) {
      setError("Only the assigned developer can update this bug status.");
      return;
    }

    if (toStatus === "IN_PROGRESS" && item.status !== "BUG_LIST") {
      setError("Start Progress is available only for BUG_LIST items.");
      return;
    }
    if (toStatus === "QA_FIX" && item.status !== "IN_PROGRESS") {
      setError("QA Fix is available only for IN_PROGRESS items.");
      return;
    }

    try {
      setStatusUpdatingItemId(item.id);
      setError(null);
      setSuccess(null);

      const updated = await changeWorkItemStatus(item.id, toStatus);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));

      if (toStatus === "IN_PROGRESS") {
        setSuccess(`Bug ${updated.id} moved to IN_PROGRESS.`);
      } else {
        setSuccess(`Bug ${updated.id} moved to QA_FIX and sent for QA review.`);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setStatusUpdatingItemId(null);
    }
  };

  const submitClientReviewForBug = async (item: WorkItem, reviewStatus: "ACCEPTED" | "REJECTED") => {
    if (!isClientRole) {
      setError("Only CLIENT can submit published item review.");
      return;
    }
    if (item.status !== "PUBLISHED") {
      setError("Client review is only allowed for PUBLISHED items.");
      return;
    }

    try {
      setClientReviewingItemId(item.id);
      setError(null);
      setSuccess(null);

      const updated = await submitClientReview(item.id, reviewStatus);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));

      if (reviewStatus === "REJECTED") {
        setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} moved back to BUG_LIST for rework.`);
      } else {
        setSuccess(`${item.type === "FEATURE" ? "Feature" : "Bug"} accepted successfully.`);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setClientReviewingItemId(null);
    }
  };

  const sendBackToProgress = async () => {
    if (!selectedItem) {
      setError("Select a bug first.");
      return;
    }
    if (selectedItem.status !== "QA_FIX") {
      setError("Send Back to In Progress is allowed only for QA_FIX items.");
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

  const applyAssignment = async (mode: "assign" | "reassign") => {
    if (!canReassign) {
      setError("Only QA/PM can reassign work items.");
      return;
    }
    if (!selectedItem) {
      setError("Select an item first.");
      return;
    }
    if (!selectedDeveloperId) {
      setError("Select a developer first.");
      return;
    }

    const alreadyAssigned = !!selectedItem.assignedTo;
    const selectedDeveloper = Number(selectedDeveloperId);

    if (mode === "reassign" && selectedItem.assignedTo?.id === selectedDeveloper) {
      setError("Select a different developer to reassign.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const updated = await assignWorkItem(selectedItem.id, selectedDeveloper);
      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  const verb = alreadyAssigned ? "Reassigned" : "Assigned";
      setSuccess(`${verb} ${updated.type === "FEATURE" ? "feature" : "bug"} to ${updated.assignedTo?.username || "developer"}.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const assignToDeveloper = async () => applyAssignment("assign");

  const reassignDeveloper = async () => applyAssignment("reassign");

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

  const onInlineAssignDeveloper = async (item: WorkItem, developerId: number | "") => {
    if (!canReassign) return;
    if (!developerId) return;
    if (item.assignedTo?.id === developerId) return;

    try {
      setInlineAssigningItemId(item.id);
      setError(null);
      setSuccess(null);

      const updated = await assignWorkItem(item.id, developerId);
      setBugs((prev) => prev.map((current) => (current.id === updated.id ? updated : current)));
      setSuccess(`${updated.type === "FEATURE" ? "Feature" : "Bug"} assigned to ${updated.assignedTo?.username || "developer"}.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setInlineAssigningItemId(null);
    }
  };

  const onCreateBug = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canCreateBug) return;
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

      const created = canManage
        ? await createWorkItem(activeProjectId, {
            type: itemType,
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          })
        : await createBug(activeProjectId, {
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
            disabled={isClientRole}
            className="w-full px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
          >
            <option value="BUG">Bugs</option>
            <option value="FEATURE">Features</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {!isClientRole && (
          <div className="mb-4 max-w-xs">
            <label className="text-xs text-gray-400 block mb-1">Assigned To</label>
            <select
              value={assignedToFilter}
              onChange={(e) => {
                if (isDeveloperRole) return;
                const value = e.target.value;
                if (value === "ALL" || value === "UNASSIGNED") {
                  setAssignedToFilter(value);
                  return;
                }
                setAssignedToFilter(Number(value));
              }}
              disabled={isDeveloperRole}
              className="w-full px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
            >
              {isDeveloperRole ? (
                <option value={user?.id ?? ""}>My assigned bugs</option>
              ) : (
                <>
                  <option value="ALL">All developers</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {developers.map((developer) => (
                    <option key={developer.id} value={developer.id}>
                      {developer.username}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        )}

        {canManage && (
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

        {canCreateBug && (
          <form
            onSubmit={onCreateBug}
            className="mb-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {isClientRole && (
              <div className="mb-3 text-sm text-cyan-300">
                Client Add Bug Section: Report a bug for this project.
              </div>
            )}
            <div className="grid gap-3">
              {canManage ? (
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as WorkItemType)}
                  className="px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10"
                >
                  <option value="BUG">Bug</option>
                  <option value="FEATURE">Feature</option>
                </select>
              ) : (
                <div className="px-3 py-2 rounded bg-black/20 text-white border border-white/10 text-sm">
                  Type: BUG
                </div>
              )}
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
                {submitting ? "Adding..." : canManage ? (itemType === "FEATURE" ? "Add Feature" : "Add Bug") : "Report Bug"}
              </button>
            </div>
          </form>
        )}

        {canReassign && selectedItem && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-sm text-gray-200 mb-2">
              Assign / Reassign Developer
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
                style={{ background: "#2563eb" }}
              >
                Assign
              </button>
              <button
                type="button"
                onClick={reassignDeveloper}
                disabled={submitting || !selectedDeveloperId}
                className="px-4 py-2 rounded text-white disabled:opacity-50"
                style={{ background: "#3b82f6" }}
              >
                Reassign
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
              disabled={submitting || !qaFeedback.trim() || selectedItem.status !== "QA_FIX"}
              className="px-4 py-2 rounded text-white disabled:opacity-50"
              style={{ background: "#f97316" }}
            >
              Send Back to In Progress
            </button>
          </div>
        )}

        {isDeveloperRole && selectedItem && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-sm text-gray-200 mb-2">
              Process List: {selectedItem.type === "FEATURE" ? `FEATURE-${selectedItem.id}` : `BUG-${selectedItem.id}`} ({selectedItem.status})
            </div>

            {processEntries.length === 0 ? (
              <div className="text-xs text-gray-400 mb-3">No process steps added yet.</div>
            ) : (
              <div className="mb-3 max-h-40 overflow-auto rounded border border-white/10 bg-black/20 p-2">
                {processEntries.map((entry) => (
                  <div key={entry.id} className="text-xs text-gray-200 py-1 border-b border-white/5 last:border-b-0">
                    <span className="text-indigo-300 font-medium">{entry.user?.username}:</span>{" "}
                    {entry.message.replace("[PROCESS] ", "")}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={processStepInput}
                onChange={(e) => setProcessStepInput(e.target.value)}
                placeholder="Add process step (only IN_PROGRESS)"
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting}
                className="flex-1 px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={addProcessStep}
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting || !processStepInput.trim()}
                className="px-4 py-2 rounded text-white disabled:opacity-60"
                style={{ background: "#0ea5e9" }}
              >
                {processSubmitting ? "Saving..." : "Add Step"}
              </button>
            </div>
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
                {canShowActionsColumn && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBugs.length === 0 ? (
                <tr>
                  <td colSpan={canShowActionsColumn ? 10 : 9} className="px-4 py-5 text-gray-400">
                    No items match current filters.
                  </td>
                </tr>
              ) : (
                filteredBugs.map((bug) => (
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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {canReassign ? (
                        <select
                          value={bug.assignedTo?.id ?? ""}
                          onChange={(e) => onInlineAssignDeveloper(bug, e.target.value ? Number(e.target.value) : "")}
                          disabled={inlineAssigningItemId === bug.id}
                          className="min-w-[150px] px-2 py-1 rounded bg-black/20 text-white outline-none border border-white/10 disabled:opacity-60"
                        >
                          <option value="">Unassigned</option>
                          {developers.map((developer) => (
                            <option key={developer.id} value={developer.id}>
                              {developer.username}
                            </option>
                          ))}
                        </select>
                      ) : (
                        bug.assignedTo?.username || "Unassigned"
                      )}
                    </td>
                    <td className="px-4 py-3">{bug.dueAt ? new Date(bug.dueAt).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3">{bug.createdBy?.username}</td>
                    <td className="px-4 py-3">{new Date(bug.createdAt).toLocaleString()}</td>
                    {canShowActionsColumn && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isDeveloperRole && bug.assignedTo?.id === user?.id && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBugStatus(bug, "IN_PROGRESS");
                                }}
                                disabled={statusUpdatingItemId === bug.id || bug.status !== "BUG_LIST"}
                                className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                                style={{ background: "#ea580c" }}
                              >
                                {statusUpdatingItemId === bug.id && bug.status === "BUG_LIST" ? "Starting..." : "Start Progress"}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveBugStatus(bug, "QA_FIX");
                                }}
                                disabled={statusUpdatingItemId === bug.id || bug.status !== "IN_PROGRESS"}
                                className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                                style={{ background: "#0284c7" }}
                              >
                                {statusUpdatingItemId === bug.id && bug.status === "IN_PROGRESS" ? "Submitting..." : "QA Fix"}
                              </button>
                            </>
                          )}

                          {canManage && (
                            <>
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
                            </>
                          )}

                          {isClientRole && bug.status === "PUBLISHED" && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  submitClientReviewForBug(bug, "ACCEPTED");
                                }}
                                disabled={clientReviewingItemId === bug.id}
                                className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                                style={{ background: "#16a34a" }}
                              >
                                {clientReviewingItemId === bug.id ? "Saving..." : "Accept"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  submitClientReviewForBug(bug, "REJECTED");
                                }}
                                disabled={clientReviewingItemId === bug.id}
                                className="px-3 py-1 rounded text-xs text-white disabled:opacity-60"
                                style={{ background: "#dc2626" }}
                              >
                                Reject to BUG_LIST
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isClientRole && (
          <div
            className="mt-6 p-4 rounded-xl"
            style={{ background: "#13161e", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-sm text-gray-100 mb-2">Upload Attachments</div>
            <div className="text-xs text-gray-400 mb-3">
              {selectedItem
                ? `Selected bug: BUG-${selectedItem.id} (${selectedItem.title})`
                : "Select a bug row first, then upload an image attachment."}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="file"
                accept="image/*"
                disabled={!selectedItem || uploadingAttachment}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="flex-1 px-3 py-2 rounded bg-black/20 text-white outline-none border border-white/10 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={uploadClientAttachment}
                disabled={!selectedItem || !attachmentFile || uploadingAttachment}
                className="px-4 py-2 rounded text-white disabled:opacity-60"
                style={{ background: "#0ea5e9" }}
              >
                {uploadingAttachment ? "Uploading..." : "Upload"}
              </button>
            </div>

            <div className="text-sm text-gray-200 mb-2">Saved Attachments (below table)</div>
            {selectedAttachments.length === 0 ? (
              <div className="text-xs text-gray-500">No attachments saved for this bug yet.</div>
            ) : (
              <div className="overflow-auto rounded border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-white/10">
                      <th className="px-3 py-2">Preview</th>
                      <th className="px-3 py-2">File Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAttachments.map((attachment) => (
                      <tr key={attachment.id} className="border-b border-white/5 text-gray-200">
                        <td className="px-3 py-2">
                          {isImageAttachment(attachment.fileType) ? (
                            <img
                              src={attachment.url}
                              alt={attachment.originalName}
                              className="h-10 w-10 rounded object-cover border border-white/10"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{attachment.originalName}</td>
                        <td className="px-3 py-2">{attachment.fileType}</td>
                        <td className="px-3 py-2">{new Date(attachment.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isImageAttachment(attachment.fileType)) {
                                setPreviewAttachment(attachment);
                                return;
                              }
                              window.open(attachment.url, "_blank", "noopener,noreferrer");
                            }}
                            className="px-3 py-1 rounded text-xs text-white"
                            style={{ background: "#2563eb" }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {previewAttachment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-w-4xl w-full rounded-xl border border-white/10 bg-[#13161e] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-200 truncate pr-4">{previewAttachment.originalName}</div>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-3 py-1 rounded text-xs text-white"
                  style={{ background: "#ef4444" }}
                >
                  Close
                </button>
              </div>
              <img
                src={previewAttachment.url}
                alt={previewAttachment.originalName}
                className="w-full max-h-[75vh] object-contain rounded border border-white/10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
