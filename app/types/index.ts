// ─── Roles ────────────────────────────────────────────────────────────────────
export type Role = "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";

// ─── Work Item ────────────────────────────────────────────────────────────────
export type WorkItemType = "BUG" | "FEATURE";

export type WorkItemStatus =
  | "BUG_LIST"
  | "IN_PROGRESS"
  | "QA_FIX"
  | "DONE"
  | "PUBLISHED"
  | "ACCEPTED";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ClientReviewStatus = "NONE" | "ACCEPTED" | "REJECTED";

export interface User {
  id: number;
  username: string;
  email: string;
  role: Role;
  initials: string;
  avatarColor: string;
  mustChangePassword?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  createdBy: User | number;
  color?: string;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  user: User;
  role: Role;
  createdAt?: string;
}

export interface WorkItem {
  id: number;
  projectId: number;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: Priority;
  createdBy: User;
  assignedTo?: User;
  dueAt?: string; // ISO date string
  publishedAt?: string;
  clientReviewStatus: ClientReviewStatus;
  commentCount?: number;
  attachmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  workItemId: number;
  user: User;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type:
    | "ASSIGNMENT_CREATED"
    | "STATUS_CHANGED"
    | "DUE_NOW"
    | "COMMENT_ADDED";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Filter ───────────────────────────────────────────────────────────────────
export interface WorkItemFilter {
  type?: WorkItemType | "";
  status?: WorkItemStatus | "";
  priority?: Priority | "";
  assignedTo?: number | "" | "unassigned";
  createdBy?: number | "";
  createdFrom?: string;
  createdTo?: string;
  dueFrom?: string;
  dueTo?: string;
  clientReviewStatus?: ClientReviewStatus | "";
  textSearch?: string;
  sortBy?: "newest" | "oldest" | "due_soon" | "priority";
}

// ─── Workflow rules ────────────────────────────────────────────────────────────
export const ALLOWED_TRANSITIONS: Record<
  WorkItemStatus,
  { to: WorkItemStatus; allowedRoles: Role[] }[]
> = {
  BUG_LIST: [{ to: "IN_PROGRESS", allowedRoles: ["DEVELOPER"] }],
  IN_PROGRESS: [{ to: "QA_FIX", allowedRoles: ["DEVELOPER"] }],
  QA_FIX: [
    { to: "DONE", allowedRoles: ["QA_PM"] },
    { to: "BUG_LIST", allowedRoles: ["QA_PM"] },
  ],
  DONE: [{ to: "PUBLISHED", allowedRoles: ["QA_PM"] }],
  PUBLISHED: [
    { to: "ACCEPTED", allowedRoles: ["CLIENT"] },
    { to: "BUG_LIST", allowedRoles: ["CLIENT"] }, // REJECTED
  ],
  ACCEPTED: [],
};
