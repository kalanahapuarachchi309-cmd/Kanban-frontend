"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../lib/auth-context";
import { addComment, assignWorkItem, changeWorkItemStatus, createBug, createWorkItem, deleteWorkItem, getBugs, getComments, getDeveloperUsers, getMyAssignedWorkItems, getProjectMembers, getProjects, getWorkItemAttachments, getWorkItems, publishWorkItem, submitClientReview, updateWorkItem, uploadWorkItemAttachment } from "../lib/api/services";
import type { Priority, Project, ProjectMember, Role, User, WorkItem, WorkItemType } from "../types";
import type { AttachmentDto, Comment as ProcessComment } from "../lib/api/services";

const PRIORITY_OPTIONS: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function getPriorityBadge(priority: Priority) {
  const configs = {
    CRITICAL: { emoji: "🔴", bg: "#7f1d1d", border: "#ef4444", text: "#fca5a5" },
    HIGH: { emoji: "🟠", bg: "#7c2d12", border: "#f97316", text: "#fdba74" },
    MEDIUM: { emoji: "🟡", bg: "#713f12", border: "#eab308", text: "#fde047" },
    LOW: { emoji: "🟢", bg: "#14532d", border: "#22c55e", text: "#86efac" },
  };
  const config = configs[priority];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.text }}
    >
      <span>{config.emoji}</span>
      <span>{priority}</span>
    </span>
  );
}

function getStatusBadge(status: string) {
  const configs: Record<string, { emoji: string; bg: string; border: string; text: string; label: string }> = {
    BUG_LIST: { emoji: "📋", bg: "#1e293b", border: "#475569", text: "#cbd5e1", label: "Bug List" },
    IN_PROGRESS: { emoji: "⚙️", bg: "#7c2d12", border: "#ea580c", text: "#fdba74", label: "In Progress" },
    QA_FIX: { emoji: "🔍", bg: "#164e63", border: "#0891b2", text: "#67e8f9", label: "QA Fix" },
    DONE: { emoji: "✅", bg: "#14532d", border: "#16a34a", text: "#86efac", label: "Done" },
    PUBLISHED: { emoji: "🚀", bg: "#581c87", border: "#a855f7", text: "#e9d5ff", label: "Published" },
  };
  const config = configs[status] || configs.BUG_LIST;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.text }}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}

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
    if (toStatus === "IN_PROGRESS") {
      const canStartProgress =
        canManage || (isDeveloperRole && !!user && item.assignedTo?.id === user.id);

      if (!canStartProgress) {
        setError("Only QA/PM, ADMIN, or the assigned developer can start progress.");
        return;
      }
      if (item.status !== "BUG_LIST") {
        setError("Start Progress is available only for BUG_LIST items.");
        return;
      }
    }

    if (toStatus === "QA_FIX") {
      if (!isDeveloperRole || !user || item.assignedTo?.id !== user.id) {
        setError("Only the assigned developer can move item to QA_FIX.");
        return;
      }
      if (item.status !== "IN_PROGRESS") {
      setError("QA Fix is available only for IN_PROGRESS items.");
      return;
      }
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
    if (selectedItem.status !== "QA_FIX" && selectedItem.status !== "BUG_LIST") {
      setError("Progress action is allowed only for BUG_LIST or QA_FIX items.");
      return;
    }
    if (!qaFeedback.trim()) {
      setError("Please add description before moving to progress.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const feedbackText = qaFeedback.trim();
      const feedbackPrefix = "[QA/PM Feedback] ";
      const progressNotePrefix = "[QA/PM Progress Note] ";
      const notePrefix = selectedItem.status === "BUG_LIST" ? progressNotePrefix : feedbackPrefix;
      const cleanedDescription = (selectedItem.description || "")
        .split("\n")
        .filter((line) => !line.startsWith(feedbackPrefix) && !line.startsWith(progressNotePrefix))
        .join("\n")
        .trim();
      const nextDescription = cleanedDescription
        ? `${notePrefix}${feedbackText}\n${cleanedDescription}`
        : `${notePrefix}${feedbackText}`;

      await updateWorkItem(selectedItem.id, { description: nextDescription });
      await addComment(
        selectedItem.id,
        selectedItem.status === "BUG_LIST"
          ? `QA/PM moved to progress: ${feedbackText}`
          : `QA feedback: ${feedbackText}`
      );
      const updated = await changeWorkItemStatus(selectedItem.id, "IN_PROGRESS");

      setBugs((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setQaFeedback("");
      setSuccess(
        selectedItem.status === "BUG_LIST"
          ? "Bug moved to In Progress with QA/PM description."
          : "Bug sent back to In Progress with QA description."
      );
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
    if (item.status !== "IN_PROGRESS" && item.status !== "QA_FIX") {
      setError("Approve & Done is only allowed for IN_PROGRESS or QA_FIX items.");
      return;
    }

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
    <div className="flex h-screen overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0f14 0%, #1a1d2e 50%, #0d0f14 100%)" }}>
      <Sidebar
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        projects={projects}
        currentRole={currentRole}
        onRoleChange={() => {}}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🐛 Bug & Feature Management</h1>
          <p className="text-gray-400 text-sm">Track, assign, and manage your project work items</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-900/20 border border-green-500/30 text-green-300 text-sm flex items-center gap-2">
            <span className="text-lg">✓</span>
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 backdrop-blur-xl shadow-2xl" style={{ background: "rgba(19, 22, 30, 0.7)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.15)" }}>
            <label className="text-xs font-semibold text-gray-300 block mb-2 uppercase tracking-wide">📁 Project</label>
            <select
              value={activeProjectId ?? ""}
              onChange={(e) => setActiveProjectId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all"
              style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
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
              <p className="mt-2 text-xs text-amber-400 bg-amber-900/10 px-2 py-1 rounded">💡 No projects found. Contact admin.</p>
            )}
          </div>

          <div className="rounded-xl p-4 backdrop-blur-xl shadow-2xl" style={{ background: "rgba(19, 22, 30, 0.7)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.15)" }}>
            <label className="text-xs font-semibold text-gray-300 block mb-2 uppercase tracking-wide">🔍 Type Filter</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | WorkItemType)}
              disabled={isClientRole}
              className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all disabled:opacity-50"
              style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
            >
              <option value="BUG">🐛 Bugs</option>
              <option value="FEATURE">✨ Features</option>
              <option value="ALL">📋 All Items</option>
            </select>
          </div>

          {!isClientRole && (
            <div className="rounded-xl p-4 backdrop-blur-xl shadow-2xl" style={{ background: "rgba(19, 22, 30, 0.7)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.15)" }}>
              <label className="text-xs font-semibold text-gray-300 block mb-2 uppercase tracking-wide">👤 Assigned To</label>
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
                className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all disabled:opacity-50"
                style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
              >
                {isDeveloperRole ? (
                  <option value={user?.id ?? ""}>My assigned items</option>
                ) : (
                  <>
                    <option value="ALL">All developers</option>
                    <option value="UNASSIGNED">⚪ Unassigned</option>
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
        </div>

        {canManage && (
          <div className="mb-6 p-4 rounded-xl backdrop-blur-xl flex items-center justify-between shadow-2xl" style={{ background: "rgba(124, 58, 237, 0.15)", border: "1px solid rgba(167, 139, 250, 0.3)", boxShadow: "0 8px 32px 0 rgba(124, 58, 237, 0.2)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <div className="text-sm font-semibold text-white">Ready to Publish</div>
                <div className="text-xs text-gray-400">{doneItems.length} DONE items in selected project</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onPublishAllDone}
              disabled={publishingAllDone || doneItems.length === 0}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition-all transform hover:scale-105"
              style={{ background: "#7c3aed" }}
            >
              {publishingAllDone ? "Publishing..." : "🚀 Publish All DONE"}
            </button>
          </div>
        )}

        {canCreateBug && (
          <form
            onSubmit={onCreateBug}
            className="mb-6 p-6 rounded-2xl backdrop-blur-xl shadow-2xl"
            style={{ background: "rgba(26, 29, 41, 0.6)", border: "1px solid rgba(139, 92, 246, 0.3)", boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.2)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{isClientRole ? "📝" : "➕"}</span>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isClientRole ? "Report New Bug" : (itemType === "FEATURE" ? "Create New Feature" : "Create New Bug")}
                </h3>
                {isClientRole && (
                  <p className="text-xs text-cyan-400 mt-0.5">Report issues you've discovered in this project</p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {canManage ? (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-300 block mb-1.5">Type</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as WorkItemType)}
                    className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all"
                    style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                  >
                    <option value="BUG">🐛 Bug</option>
                    <option value="FEATURE">✨ Feature</option>
                  </select>
                </div>
              ) : (
                <div className="md:col-span-2 px-4 py-2.5 rounded-lg bg-indigo-900/20 text-white border border-indigo-500/30 text-sm flex items-center gap-2">
                  <span>🐛</span>
                  <span className="font-medium">Type: BUG</span>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={itemType === "FEATURE" ? "Enter feature title..." : "Enter bug title..."}
                  className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all placeholder:text-gray-500"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description..."
                  className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all placeholder:text-gray-500 resize-none"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p === "CRITICAL" ? "🔴 CRITICAL" : p === "HIGH" ? "🟠 HIGH" : p === "MEDIUM" ? "🟡 MEDIUM" : "🟢 LOW"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">⏱️ Calculate Due Date (hours from now)</label>
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
                  placeholder="e.g., 24 hours"
                  className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all placeholder:text-gray-500"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-all transform hover:scale-[1.02]"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                >
                  {submitting ? "⏳ Adding..." : canManage ? (itemType === "FEATURE" ? "✨ Add Feature" : "🐛 Add Bug") : "📤 Report Bug"}
                </button>
              </div>
            </div>
          </form>
        )}

        {canReassign && selectedItem && (
          <div
            className="mb-6 p-6 rounded-2xl backdrop-blur-xl shadow-2xl"
            style={{ background: "rgba(30, 41, 58, 0.6)", border: "1px solid rgba(139, 92, 246, 0.3)", boxShadow: "0 8px 32px 0 rgba(59, 130, 246, 0.2)" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">👨‍💼</span>
              <div>
                <h3 className="text-lg font-bold text-white">QA/PM Management</h3>
                <p className="text-xs text-gray-400">
                  Selected: {selectedItem.type === "FEATURE" ? `✨ FEATURE-${selectedItem.id}` : `🐛 BUG-${selectedItem.id}`} 
                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{
                    background: selectedItem.status === "DONE" ? "#16a34a20" : selectedItem.status === "IN_PROGRESS" ? "#ea580c20" : "#3b82f620",
                    color: selectedItem.status === "DONE" ? "#86efac" : selectedItem.status === "IN_PROGRESS" ? "#fdba74" : "#93c5fd",
                    border: `1px solid ${selectedItem.status === "DONE" ? "#16a34a40" : selectedItem.status === "IN_PROGRESS" ? "#ea580c40" : "#3b82f640"}`
                  }}>
                    {selectedItem.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-300 block mb-2">👤 Assign / Reassign Developer</label>
              <div className="flex gap-3">
                <select
                  value={selectedDeveloperId}
                  onChange={(e) => setSelectedDeveloperId(e.target.value ? Number(e.target.value) : "")}
                  className="flex-1 px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all"
                  style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
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
                  className="px-5 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: "#2563eb" }}
                >
                  ✓ Assign
                </button>
                <button
                  type="button"
                  onClick={reassignDeveloper}
                  disabled={submitting || !selectedDeveloperId}
                  className="px-5 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: "#3b82f6" }}
                >
                  ↻ Reassign
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">📝 QA Feedback / Progress Note</label>
              <textarea
                value={qaFeedback}
                onChange={(e) => setQaFeedback(e.target.value)}
                placeholder={
                  selectedItem.status === "BUG_LIST"
                    ? "Write QA/PM note before sending to progress..."
                    : "If developer fix is not correct, write QA description here..."
                }
                className="w-full px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all placeholder:text-gray-500 resize-none mb-3"
                style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
                rows={3}
              />
              <button
                type="button"
                onClick={sendBackToProgress}
                disabled={
                  submitting ||
                  !qaFeedback.trim() ||
                  (selectedItem.status !== "QA_FIX" && selectedItem.status !== "BUG_LIST")
                }
                className="w-full px-4 py-3 rounded-lg text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ background: "#f97316" }}
              >
                {selectedItem.status === "BUG_LIST" ? "▶️ Send To Progress" : "↩️ Send Back to In Progress"}
              </button>
            </div>
          </div>
        )}

        {isDeveloperRole && selectedItem && (
          <div
            className="mb-6 p-6 rounded-2xl backdrop-blur-xl shadow-2xl"
            style={{ background: "rgba(22, 78, 99, 0.6)", border: "1px solid rgba(34, 211, 238, 0.3)", boxShadow: "0 8px 32px 0 rgba(6, 182, 212, 0.2)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚙️</span>
              <div>
                <h3 className="text-lg font-bold text-white">Developer Process Steps</h3>
                <p className="text-xs text-gray-400">
                  {selectedItem.type === "FEATURE" ? `✨ FEATURE-${selectedItem.id}` : `🐛 BUG-${selectedItem.id}`} - {selectedItem.title}
                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{
                    background: selectedItem.status === "IN_PROGRESS" ? "#ea580c20" : "#3b82f620",
                    color: selectedItem.status === "IN_PROGRESS" ? "#fdba74" : "#93c5fd",
                    border: `1px solid ${selectedItem.status === "IN_PROGRESS" ? "#ea580c40" : "#3b82f640"}`
                  }}>
                    {selectedItem.status}
                  </span>
                </p>
              </div>
            </div>

            {processEntries.length === 0 ? (
              <div className="px-4 py-3 bg-black/20 rounded-lg border border-dashed border-white/10 text-center mb-4">
                <span className="text-gray-500 text-sm">📋 No process steps added yet</span>
              </div>
            ) : (
              <div className="mb-4 max-h-60 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3 scrollbar-cyan">
                {processEntries.map((entry, index) => (
                  <div key={entry.id} className="text-sm text-gray-200 py-2 px-3 rounded-lg mb-2 last:mb-0 bg-cyan-900/10 border border-cyan-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs flex items-center justify-center font-bold">{index + 1}</span>
                      <span className="text-cyan-300 font-semibold">{entry.user?.username}</span>
                      <span className="text-xs text-gray-500 ml-auto">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-300 pl-8">{entry.message.replace("[PROCESS] ", "")}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={processStepInput}
                onChange={(e) => setProcessStepInput(e.target.value)}
                placeholder="Add process step (only available during IN_PROGRESS)"
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting}
                className="flex-1 px-3 py-2.5 rounded-xl backdrop-blur-sm text-white outline-none transition-all disabled:opacity-50 placeholder:text-gray-500"
                style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.2)" }}
              />
              <button
                type="button"
                onClick={addProcessStep}
                disabled={!isDeveloperAssignedSelected || selectedItem.status !== "IN_PROGRESS" || processSubmitting || !processStepInput.trim()}
                className="px-5 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ background: "#0ea5e9" }}
              >
                {processSubmitting ? "⏳ Saving..." : "➕ Add Step"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl" style={{ background: "rgba(19, 22, 30, 0.7)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.15)" }}>
          <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>Work Items Overview</span>
              <span className="ml-auto text-sm font-normal text-gray-400">
                {filteredBugs.length} item{filteredBugs.length !== 1 ? "s" : ""}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ background: "#1a1e2e" }}>
                <tr className="text-left text-gray-300 border-b-2 border-white/20">
                  <th className="px-4 py-3 font-semibold">Item ID</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Assigned To</th>
                  <th className="px-4 py-3 font-semibold">Due At</th>
                  <th className="px-4 py-3 font-semibold">Created By</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  {canShowActionsColumn && <th className="px-4 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredBugs.length === 0 ? (
                  <tr>
                    <td colSpan={canShowActionsColumn ? 10 : 9} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-5xl opacity-30">📭</span>
                        <span className="text-gray-400 text-base">No items match current filters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBugs.map((bug, index) => (
                    <tr
                      key={bug.id}
                      onClick={() => loadBugIntoFields(bug)}
                      className="border-b border-white/5 text-gray-200 cursor-pointer transition-all hover:bg-white/5"
                      style={{
                        background: selectedBugId === bug.id 
                          ? "rgba(99,102,241,0.2)" 
                          : index % 2 === 0 
                          ? "rgba(255,255,255,0.02)" 
                          : "transparent",
                      }}
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs px-2 py-1 rounded" style={{
                          background: bug.type === "FEATURE" ? "#581c8720" : "#7f1d1d20",
                          color: bug.type === "FEATURE" ? "#e9d5ff" : "#fca5a5",
                          border: `1px solid ${bug.type === "FEATURE" ? "#a855f740" : "#ef444440"}`
                        }}>
                          {bug.type === "FEATURE" ? `✨ FEATURE-${bug.id}` : `🐛 BUG-${bug.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-medium">{bug.type === "FEATURE" ? "Feature" : "Bug"}</span>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <div className="font-medium truncate" title={bug.title}>{bug.title}</div>
                      </td>
                      <td className="px-4 py-4">{getPriorityBadge(bug.priority)}</td>
                      <td className="px-4 py-4">{getStatusBadge(bug.status)}</td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        {canReassign ? (
                          <select
                            value={bug.assignedTo?.id ?? ""}
                            onChange={(e) => onInlineAssignDeveloper(bug, e.target.value ? Number(e.target.value) : "")}
                            disabled={inlineAssigningItemId === bug.id}
                            className="min-w-[150px] px-2.5 py-1.5 rounded-xl backdrop-blur-sm text-white text-xs outline-none transition-all disabled:opacity-50"
                            style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(139, 92, 246, 0.2)", boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)" }}
                          >
                            <option value="">⚪ Unassigned</option>
                            {developers.map((developer) => (
                              <option key={developer.id} value={developer.id}>
                                👤 {developer.username}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs">{bug.assignedTo?.username ? `👤 ${bug.assignedTo.username}` : "⚪ Unassigned"}</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {bug.dueAt ? (
                          <span className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{new Date(bug.dueAt).toLocaleString()}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs">{bug.createdBy?.username}</td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">{new Date(bug.createdAt).toLocaleString()}</td>
                      {canShowActionsColumn && (
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isDeveloperRole && bug.assignedTo?.id === user?.id && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveBugStatus(bug, "IN_PROGRESS");
                                  }}
                                  disabled={statusUpdatingItemId === bug.id || bug.status !== "BUG_LIST"}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#ea580c" }}
                                >
                                  {statusUpdatingItemId === bug.id && bug.status === "BUG_LIST" ? "⏳" : "▶️"} Start
                                  </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveBugStatus(bug, "QA_FIX");
                                  }}
                                  disabled={statusUpdatingItemId === bug.id || bug.status !== "IN_PROGRESS"}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#0284c7" }}
                                >
                                  {statusUpdatingItemId === bug.id && bug.status === "IN_PROGRESS" ? "⏳" : "🔍"} QA Fix
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
                                  disabled={
                                    markingDoneItemId === bug.id ||
                                    bug.status === "DONE" ||
                                    bug.status === "PUBLISHED" ||
                                    (bug.status !== "IN_PROGRESS" && bug.status !== "QA_FIX")
                                  }
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#16a34a" }}
                                >
                                  {markingDoneItemId === bug.id
                                    ? "⏳"
                                    : bug.status === "DONE" || bug.status === "PUBLISHED"
                                    ? "✅"
                                    : "✓"}{" "}
                                  {bug.status === "DONE" || bug.status === "PUBLISHED" ? "Done" : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPublishItem(bug);
                                  }}
                                  disabled={publishingItemId === bug.id || bug.status === "PUBLISHED" || bug.status !== "DONE"}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#7c3aed" }}
                                >
                                  {publishingItemId === bug.id ? "⏳" : bug.status === "PUBLISHED" ? "🚀" : "📤"} Publish
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(bug);
                                  }}
                                  disabled={deletingItemId === bug.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#ef4444" }}
                                >
                                  {deletingItemId === bug.id ? "⏳" : "🗑️"} Delete
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
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#16a34a" }}
                                >
                                  {clientReviewingItemId === bug.id ? "⏳" : "✓"} Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    submitClientReviewForBug(bug, "REJECTED");
                                  }}
                                  disabled={clientReviewingItemId === bug.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-all whitespace-nowrap"
                                  style={{ background: "#dc2626" }}
                                >
                                  ✗ Reject
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
        </div>

        {isClientRole && (
          <div
            className="mt-6 p-6 rounded-2xl backdrop-blur-xl shadow-2xl"
            style={{ background: "rgba(19, 78, 74, 0.6)", border: "1px solid rgba(45, 212, 191, 0.3)", boxShadow: "0 8px 32px 0 rgba(20, 184, 166, 0.2)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📎</span>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Bug Attachments</h3>
                <p className="text-xs text-gray-400">
                  {selectedItem
                    ? `Selected: 🐛 BUG-${selectedItem.id} - ${selectedItem.title}`
                    : "⚠️ Select a bug from the table above to upload attachments"}
                </p>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-xl backdrop-blur-sm border border-dashed" style={{ background: "rgba(0, 0, 0, 0.2)", borderColor: "rgba(139, 92, 246, 0.3)" }}>
              <div className="flex gap-3">
                <label className="flex-1 px-4 py-3 rounded-xl backdrop-blur-sm text-white transition-all cursor-pointer" style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📁</span>
                    <span className="text-sm">{attachmentFile ? attachmentFile.name : "Choose an image file..."}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!selectedItem || uploadingAttachment}
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={uploadClientAttachment}
                  disabled={!selectedItem || !attachmentFile || uploadingAttachment}
                  className="px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-40 hover:opacity-90 transition-all"
                  style={{ background: "#0ea5e9" }}
                >
                  {uploadingAttachment ? "⏳ Uploading..." : "📤 Upload"}
                </button>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">📂 Saved Attachments</h4>
              {selectedAttachments.length > 0 && (
                <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                  {selectedAttachments.length} file{selectedAttachments.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {selectedAttachments.length === 0 ? (
              <div className="px-4 py-8 bg-black/20 rounded-lg border border-dashed border-white/10 text-center">
                <span className="text-4xl opacity-30 block mb-2">📭</span>
                <span className="text-gray-500 text-sm">No attachments saved for this bug yet</span>
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border shadow-lg backdrop-blur-sm scrollbar-cyan" style={{ borderColor: "rgba(139, 92, 246, 0.2)" }}>
                <table className="w-full text-sm">
                  <thead style={{ background: "rgba(0, 0, 0, 0.4)" }}>
                    <tr className="text-left text-gray-300 border-b border-white/10">
                      <th className="px-4 py-3 font-semibold">Preview</th>
                      <th className="px-4 py-3 font-semibold">File Name</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAttachments.map((attachment, index) => (
                      <tr 
                        key={attachment.id} 
                        className="border-b border-white/5 text-gray-200 hover:bg-white/5 transition-colors"
                        style={{ background: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}
                      >
                        <td className="px-4 py-3">
                          {isImageAttachment(attachment.fileType) ? (
                            <img
                              src={attachment.url}
                              alt={attachment.originalName}
                              className="h-12 w-12 rounded-lg object-cover border-2 border-white/10 hover:border-teal-500/50 transition-all cursor-pointer shadow-md"
                              onClick={() => setPreviewAttachment(attachment)}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center">
                              <span className="text-xl">📄</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-xs">{attachment.originalName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded bg-teal-900/30 text-teal-300 border border-teal-500/30">
                            {attachment.fileType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {new Date(attachment.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (isImageAttachment(attachment.fileType)) {
                                setPreviewAttachment(attachment);
                                return;
                              }
                              window.open(attachment.url, "_blank", "noopener,noreferrer");
                            }}
                            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all"
                            style={{ background: "#2563eb" }}
                          >
                            👁️ View
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
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-2xl p-4 animate-fadeIn" style={{ background: "rgba(0, 0, 0, 0.8)" }}>
            <div className="max-w-5xl w-full rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl" style={{ background: "rgba(19, 22, 30, 0.9)", border: "2px solid rgba(139, 92, 246, 0.3)", boxShadow: "0 20px 60px 0 rgba(139, 92, 246, 0.3)" }}>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🖼️</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate max-w-md" title={previewAttachment.originalName}>
                      {previewAttachment.originalName}
                    </h3>
                    <p className="text-xs text-gray-400">{previewAttachment.fileType}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all"
                  style={{ background: "#ef4444" }}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-6 bg-black/40">
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.originalName}
                  className="w-full max-h-[75vh] object-contain rounded-lg border-2 border-white/10 shadow-2xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
