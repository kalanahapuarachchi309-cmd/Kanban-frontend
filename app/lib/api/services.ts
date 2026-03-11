import axios from "axios";
import { apiClient } from "./config";
import type {
  WorkItem,
  User,
  Project,
  ProjectMember,
  Notification,
  WorkItemFilter,
  WorkItemStatus,
  ClientReviewStatus,
  Role,
} from "../../types";

type RawUser = Partial<User> & {
  active?: boolean;
};

function normalizeUser(raw: unknown): User {
  const user = typeof raw === "object" && raw !== null ? (raw as RawUser) : {};
  return {
    ...user,
    isActive:
      typeof user.isActive === "boolean"
        ? user.isActive
        : typeof user.active === "boolean"
        ? user.active
        : true,
  } as User;
}

function normalizeUsers(raw: unknown): User[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => normalizeUser(item));
}

function isNotificationAccessError(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);
}

function isOptionalResourceError(error: unknown): boolean {
  return axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const response = await apiClient.get<Project[]>(`/api/projects?_ts=${Date.now()}`, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    return response.data;
  } catch (error) {
    if (isOptionalResourceError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await apiClient.post<Project>("/api/projects", data);
  return response.data;
}

export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
  const response = await apiClient.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
  return response.data;
}

export async function addProjectMember(projectId: number, userId: number, role: Role): Promise<void> {
  await apiClient.post(`/api/projects/${projectId}/members`, { userId, role });
}

export async function addProjectMembers(projectId: number, userIds: number[], role: Role): Promise<ProjectMember[]> {
  const response = await apiClient.post<ProjectMember[]>(`/api/projects/${projectId}/members/bulk`, {
    userIds,
    role,
  });
  return response.data;
}

// ─── Work Items ───────────────────────────────────────────────────────────────

export interface CreateWorkItemRequest {
  type: "BUG" | "FEATURE";
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignedTo?: number;
  dueAt?: string;
}

export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueAt?: string;
}

export interface CreateBugRequest {
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assignedTo?: number;
  dueAt?: string;
}

function toFilterParams(filter?: WorkItemFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (!filter) return params;

  if (filter.type) params.set("type", filter.type);
  if (filter.status) params.set("status", filter.status);
  if (filter.priority) params.set("priority", filter.priority);
  if (filter.assignedTo && filter.assignedTo !== "unassigned") params.set("assignedTo", String(filter.assignedTo));
  if (filter.createdBy) params.set("createdBy", String(filter.createdBy));
  if (filter.createdFrom) params.set("createdFrom", filter.createdFrom);
  if (filter.createdTo) params.set("createdTo", filter.createdTo);
  if (filter.dueFrom) params.set("dueFrom", filter.dueFrom);
  if (filter.dueTo) params.set("dueTo", filter.dueTo);
  if (filter.clientReviewStatus) params.set("clientReviewStatus", filter.clientReviewStatus);
  if (filter.textSearch) params.set("search", filter.textSearch);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);

  return params;
}

export async function getWorkItems(projectId: number, filter?: WorkItemFilter): Promise<WorkItem[]> {
  const params = toFilterParams(filter);
  const query = params.toString();
  const url = query
    ? `/api/projects/${projectId}/work-items?${query}`
    : `/api/projects/${projectId}/work-items`;
  const response = await apiClient.get<WorkItem[]>(url);
  return response.data;
}

export async function getMyAssignedWorkItems(projectId?: number): Promise<WorkItem[]> {
  const params = new URLSearchParams();
  if (typeof projectId === "number") {
    params.set("projectId", String(projectId));
  }
  const query = params.toString();
  const url = query ? `/api/work-items/my?${query}` : "/api/work-items/my";
  const response = await apiClient.get<WorkItem[]>(url);
  return response.data;
}

export async function getWorkItemById(id: number): Promise<WorkItem> {
  const response = await apiClient.get<WorkItem>(`/api/work-items/${id}`);
  return response.data;
}

export async function createWorkItem(projectId: number, data: CreateWorkItemRequest): Promise<WorkItem> {
  const response = await apiClient.post<WorkItem>(`/api/projects/${projectId}/work-items`, data);
  return response.data;
}

export async function getBugs(projectId: number): Promise<WorkItem[]> {
  const response = await apiClient.get<WorkItem[]>(`/api/projects/${projectId}/bugs`);
  return response.data;
}

export async function createBug(projectId: number, data: CreateBugRequest): Promise<WorkItem> {
  const response = await apiClient.post<WorkItem>(`/api/projects/${projectId}/bugs`, data);
  return response.data;
}

export async function updateWorkItem(id: number, data: UpdateWorkItemRequest): Promise<WorkItem> {
  const response = await apiClient.patch<WorkItem>(`/api/work-items/${id}`, data);
  return response.data;
}

export async function assignWorkItem(id: number, developerId: number): Promise<WorkItem> {
  const normalizedDeveloperId = Number(developerId);
  const response = await apiClient.patch<WorkItem>(`/api/work-items/${id}/assign`, {
    developerId: normalizedDeveloperId,
    userId: normalizedDeveloperId,
  });
  return response.data;
}

export async function changeWorkItemStatus(id: number, status: WorkItemStatus): Promise<WorkItem> {
  const response = await apiClient.patch<WorkItem>(`/api/work-items/${id}/status`, { status });
  return response.data;
}

export async function publishWorkItem(id: number): Promise<WorkItem> {
  const response = await apiClient.patch<WorkItem>(`/api/work-items/${id}/publish`);
  return response.data;
}

export async function submitClientReview(id: number, reviewStatus: ClientReviewStatus): Promise<WorkItem> {
  const response = await apiClient.patch<WorkItem>(`/api/work-items/${id}/client-review`, { reviewStatus });
  return response.data;
}

export async function deleteWorkItem(id: number, _projectId?: number): Promise<void> {
  await apiClient.delete(`/api/work-items/${id}`);
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface CreateUserRequest {
  username: string;
  email: string;
  temporaryPassword?: string;
  role: "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";
}

export interface CreateUserByAdminResponse {
  user: User;
  emailWarning?: string;
  temporaryPassword?: string;
}

export interface AdminResetTemporaryPasswordResponse {
  userId: number;
  username: string;
  temporaryPassword: string;
}

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>("/api/users");
  return normalizeUsers(response.data);
}

export async function getDeveloperUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>('/api/users/developers');
  return normalizeUsers(response.data);
}

export async function getUserById(id: number): Promise<User> {
  const response = await apiClient.get<User>(`/api/users/${id}`);
  return normalizeUser(response.data);
}

export async function getCurrentUserProfile(): Promise<User> {
  const response = await apiClient.get<User>("/api/users/me");
  return normalizeUser(response.data);
}

export async function deactivateUser(id: number): Promise<User> {
  const response = await apiClient.patch<User>(`/api/users/${id}/deactivate`);
  return normalizeUser(response.data);
}

export async function activateUser(id: number): Promise<User> {
  const response = await apiClient.patch<User>(`/api/users/${id}/activate`);
  return normalizeUser(response.data);
}

export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/api/users/${id}`);
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<User>("/api/users", data);
  return normalizeUser(response.data);
}

/**
 * Create user by admin (can create any role including ADMIN)
 */
export async function createUserByAdmin(data: CreateUserRequest): Promise<CreateUserByAdminResponse> {
  const response = await apiClient.post<CreateUserByAdminResponse>("/api/users", data);
  return {
    ...response.data,
    user: response.data?.user ? normalizeUser(response.data.user) : response.data?.user,
  };
}

export async function resendPasswordSetupEmail(userId: number): Promise<void> {
  await apiClient.post(`/api/users/${userId}/resend-password-setup`);
}

export async function resetTemporaryPassword(userId: number): Promise<AdminResetTemporaryPasswordResponse> {
  const response = await apiClient.post<AdminResetTemporaryPasswordResponse>(
    `/api/users/${userId}/reset-temporary-password`
  );
  return response.data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  try {
    const response = await apiClient.get<Notification[]>("/api/notifications");
    return response.data;
  } catch (error) {
    if (isNotificationAccessError(error)) {
      return [];
    }
    throw error;
  }
}

export async function markNotificationAsRead(id: number): Promise<void> {
  try {
    await apiClient.patch(`/api/notifications/${id}/read`);
  } catch (error) {
    if (!isNotificationAccessError(error)) {
      throw error;
    }
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await apiClient.patch("/api/notifications/read-all");
  } catch (error) {
    if (!isNotificationAccessError(error)) {
      throw error;
    }
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  workItemId: number;
  user: User;
  message: string;
  createdAt: string;
}

export async function getComments(workItemId: number): Promise<Comment[]> {
  const response = await apiClient.get<Comment[]>(`/api/work-items/${workItemId}/comments`);
  return response.data;
}

export async function addComment(workItemId: number, message: string): Promise<Comment> {
  const response = await apiClient.post<Comment>(`/api/work-items/${workItemId}/comments`, { message });
  return response.data;
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export interface AttachmentDto {
  id: number;
  workItemId: number;
  url: string;
  publicId: string;
  fileType: string;
  originalName: string;
  createdAt: string;
}

export async function uploadWorkItemAttachment(workItemId: number, file: File): Promise<AttachmentDto> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<AttachmentDto>(
    `/api/work-items/${workItemId}/attachments/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
}

export async function getWorkItemAttachments(workItemId: number): Promise<AttachmentDto[]> {
  const response = await apiClient.get<AttachmentDto[]>(`/api/work-items/${workItemId}/attachments`);
  return response.data;
}
