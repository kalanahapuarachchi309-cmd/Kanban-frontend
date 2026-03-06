"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import {
  getUsers,
  getDeveloperUsers,
  createUserByAdmin,
  createProject,
  getProjects,
  addProjectMembers,
  getProjectMembers,
  deactivateUser,
  activateUser,
  deleteUser,
  resendPasswordSetupEmail,
  resetTemporaryPassword,
} from "../lib/api/services";
import type { User, Project, ProjectMember } from "../types";

type Role = "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";

interface CreateUserForm {
  username: string;
  email: string;
  role: Role;
}

const ROLE_OPTIONS = [
  { value: "ADMIN" as Role, label: "Admin", color: "#ef4444" },
  { value: "QA_PM" as Role, label: "QA / PM", color: "#f59e0b" },
  { value: "DEVELOPER" as Role, label: "Developer", color: "#6366f1" },
  { value: "CLIENT" as Role, label: "Client", color: "#22c55e" },
];

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#22c55e", "#3b82f6", "#f59e0b", "#14b8a6", "#ef4444"];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getInitials(username: string) {
  return username.substring(0, 2).toUpperCase();
}

export default function AdminPanel() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectMembersByProject, setProjectMembersByProject] = useState<Record<number, ProjectMember[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [resendingForUserId, setResendingForUserId] = useState<number | null>(null);
  const [resettingPasswordForUserId, setResettingPasswordForUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [showEmailConfigBadge, setShowEmailConfigBadge] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState<{ userIds: number[]; role: Role }>({
    userIds: [],
    role: "DEVELOPER",
  });

  const [formData, setFormData] = useState<CreateUserForm>({
    username: "",
    email: "",
    role: "DEVELOPER",
  });

  useEffect(() => {
    if (user?.role === "ADMIN" || user?.role === "QA_PM") {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectMembers([]);
      return;
    }

    getProjectMembers(selectedProjectId)
      .then((data) => setProjectMembers(data))
      .catch(() => setProjectMembers([]));
  }, [selectedProjectId]);

  const loadProjectMemberships = async (projectList: Project[]) => {
    if (projectList.length === 0) {
      setProjectMembersByProject({});
      return;
    }

    const entries = await Promise.all(
      projectList.map(async (project) => {
        try {
          const members = await getProjectMembers(project.id);
          return [project.id, members] as const;
        } catch {
          return [project.id, []] as const;
        }
      })
    );

    setProjectMembersByProject(Object.fromEntries(entries));
  };

  const shouldShowEmailConfigBadge = (message?: string) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes("smtp") ||
      normalized.includes("spring.mail") ||
      normalized.includes("app.email.from") ||
      normalized.includes("unable to send email") ||
      normalized.includes("authentication failed") ||
      normalized.includes("authentication error")
    );
  };

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const [usersData, projectsData] = await Promise.all([
        user?.role === "ADMIN" ? getUsers() : getDeveloperUsers(),
        getProjects(),
      ]);

      setUsers(usersData);
      setProjects(projectsData);
      await loadProjectMemberships(projectsData);

      if (projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;

      if (status === 401) {
        setError("Your session has expired. Please login again.");
      } else if (status === 403) {
        setError("You do not have permission to manage project membership.");
      } else if (status === 500) {
        setError(backendMessage || "Server error while loading users. Check backend logs for details.");
      } else {
        setError(backendMessage || "Failed to load admin data.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedUsername = formData.username.trim();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail) {
      setError("Username and email are required.");
      return;
    }

    const usernameExists = users.some(
      (u) => u.username.trim().toLowerCase() === normalizedUsername.toLowerCase()
    );
    if (usernameExists) {
      setError(`Username already exists: ${normalizedUsername}`);
      return;
    }

    const emailExists = users.some(
      (u) => u.email.trim().toLowerCase() === normalizedEmail
    );
    if (emailExists) {
      setError(`Email already exists: ${normalizedEmail}`);
      return;
    }

    try {
      setIsCreatingUser(true);
      const created = await createUserByAdmin({
        ...formData,
        username: normalizedUsername,
        email: normalizedEmail,
        temporaryPassword: Math.random().toString(36).slice(-10) + "A1",
      });
      if (created.emailWarning) {
        setSuccess(
          `User ${normalizedUsername} created successfully. Temporary password: ${created.temporaryPassword || "N/A"}`
        );
        setError(created.emailWarning);
        if (shouldShowEmailConfigBadge(created.emailWarning)) {
          setShowEmailConfigBadge(true);
        }
      } else {
        setSuccess(
          `User ${normalizedUsername} created successfully. Temporary password: ${created.temporaryPassword || "N/A"}`
        );
      }
      setFormData({
        username: "",
        email: "",
        role: "DEVELOPER",
      });
      setShowCreateUserForm(false);
      fetchInitialData();
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      const isConflict = err.response?.status === 409;
      if (shouldShowEmailConfigBadge(backendMessage)) {
        setShowEmailConfigBadge(true);
      }
      setError(
        backendMessage ||
          (isConflict
            ? "User already exists. Use a different username/email or activate existing user."
            : "Failed to create user")
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setIsCreatingProject(true);
      const created = await createProject(projectForm);
      setProjectForm({ name: "", description: "" });
      setSuccess(`Project ${created.name} created successfully!`);

      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
      await loadProjectMemberships(updatedProjects);
      setSelectedProjectId(created.id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedProjectId || memberForm.userIds.length === 0) {
      setError("Please select a project and at least one user.");
      return;
    }

    try {
      setIsAddingMember(true);
      const createdMembers = await addProjectMembers(selectedProjectId, memberForm.userIds, memberForm.role);
      const addedCount = createdMembers.length;
      const failedCount = memberForm.userIds.length - addedCount;

      if (addedCount > 0 && failedCount === 0) {
        setSuccess(`${addedCount} user(s) added to project successfully.`);
      } else if (addedCount > 0) {
        setSuccess(`${addedCount} user(s) added. ${failedCount} failed (already member or invalid).`);
      } else {
        setError("Failed to add selected users to project.");
      }

      setMemberForm({ userIds: [], role: "DEVELOPER" });
      const members = await getProjectMembers(selectedProjectId);
      setProjectMembers(members);
      setProjectMembersByProject((prev) => ({ ...prev, [selectedProjectId]: members }));

      // Keep project summary table in sync across all projects after bulk assignment.
      const refreshedProjects = await getProjects();
      setProjects(refreshedProjects);
      await loadProjectMemberships(refreshedProjects);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add user to project");
    } finally {
      setIsAddingMember(false);
    }
  };

  const toggleUserStatus = async (target: User) => {
    if (target.role === "ADMIN") {
      setError("Admin accounts cannot be activated/deactivated from this panel.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      if (target.isActive) {
        await deactivateUser(target.id);
        setSuccess(`User ${target.username} deactivated.`);
      } else {
        await activateUser(target.id);
        setSuccess(`User ${target.username} activated.`);
      }
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update user status");
    }
  };

  const handleResendSetupEmail = async (target: User) => {
    try {
      setError("");
      setSuccess("");
      setResendingForUserId(target.id);
      await resendPasswordSetupEmail(target.id);
      setSuccess(`Password setup email sent to ${target.email}.`);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      if (shouldShowEmailConfigBadge(backendMessage)) {
        setShowEmailConfigBadge(true);
      }
      setError(backendMessage || "Failed to resend password setup email");
    } finally {
      setResendingForUserId(null);
    }
  };

  const handleResetTemporaryPassword = async (target: User) => {
    setError("");
    setSuccess("");

    try {
      setResettingPasswordForUserId(target.id);
      const result = await resetTemporaryPassword(target.id);
      setSuccess(
        `Temporary password reset for ${result.username}. New temporary password: ${result.temporaryPassword}`
      );
      fetchInitialData();
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message;
      setError(backendMessage || "Failed to reset temporary password");
    } finally {
      setResettingPasswordForUserId(null);
    }
  };

  const handleDeleteUser = async (target: User) => {
    const confirmed = window.confirm(`Delete user ${target.username}? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setDeletingUserId(target.id);
      await deleteUser(target.id);
      setSuccess(`User ${target.username} deleted.`);
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (user?.role !== "ADMIN" && user?.role !== "QA_PM") {
    return null;
  }

  const isAdmin = user?.role === "ADMIN";
  const assignableRoleOptions = isAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((option) => option.value === "DEVELOPER");

  const assignedUserIds = new Set(projectMembers.map((member) => member.user.id));
  const roleUsers = users.filter((u) => u.role === memberForm.role);
  const selectableRoleUsersCount = roleUsers.filter(
    (u) => u.isActive !== false && !assignedUserIds.has(u.id)
  ).length;
  const selectedRoleLabel = ROLE_OPTIONS.find((option) => option.value === memberForm.role)?.label || memberForm.role;

  return (
    <div className="h-screen overflow-y-auto p-6" style={{ background: "#0d0f14" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{isAdmin ? "Admin Panel" : "QA/PM Panel"}</h1>
            <p className="text-gray-400 text-sm">
              {isAdmin ? "Manage users and system settings" : "Assign developers to projects"}
            </p>
            {showEmailConfigBadge && (
              <div className="mt-2 inline-flex items-center rounded border border-yellow-500/60 bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-300">
                Email not configured (SMTP authentication failed)
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {showCreateUserForm ? "Cancel" : "+ Create User"}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/50 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Create Project */}
        <div className="mb-6 p-6 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
          <h2 className="text-lg font-semibold text-white mb-4">Create Project</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Name</label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                placeholder="Optional project description"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingProject}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded transition-colors"
            >
              {isCreatingProject ? "Creating..." : "Create Project"}
            </button>
          </form>
        </div>

        {/* Add User To Project + Assign Role */}
        <div className="mb-6 p-6 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
          <h2 className="text-lg font-semibold text-white mb-4">Project Membership & Roles</h2>

          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
              className="px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

              <div className="px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm">
              <div className="text-xs text-gray-400 mb-2">Select {selectedRoleLabel} users ({memberForm.userIds.length} selected)</div>
              <div className="max-h-28 overflow-y-auto space-y-1">
                {roleUsers.map((u) => {
                  const checked = memberForm.userIds.includes(u.id);
                  const alreadyAssigned = assignedUserIds.has(u.id);
                  const inactive = u.isActive === false;
                  const disabled = alreadyAssigned || inactive;
                  return (
                    <label key={u.id} className={`flex items-center gap-2 text-sm ${disabled ? "text-gray-500" : "text-gray-200 cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => {
                          setMemberForm((prev) => ({
                            ...prev,
                            userIds: e.target.checked
                              ? [...prev.userIds, u.id]
                              : prev.userIds.filter((id) => id !== u.id),
                          }));
                        }}
                        className="accent-emerald-500"
                      />
                      <span>
                        {u.username} ({u.email})
                        {alreadyAssigned ? " - already assigned" : ""}
                        {inactive ? " - inactive" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as Role })}
              className="px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            >
              {assignableRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isAddingMember || memberForm.userIds.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded transition-colors"
            >
              {isAddingMember ? "Adding..." : "Add Member"}
            </button>
          </form>

          {selectableRoleUsersCount === 0 && selectedProjectId && (
            <p className="text-xs text-gray-400 mb-4">No available active {selectedRoleLabel} users for this project.</p>
          )}

          <div className="rounded border border-gray-700/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-xs font-medium text-gray-400">USERNAME</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">EMAIL</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">PROJECT ROLE</th>
                </tr>
              </thead>
              <tbody>
                {projectMembers.length === 0 ? (
                  <tr>
                    <td className="p-3 text-sm text-gray-500" colSpan={3}>No members for selected project.</td>
                  </tr>
                ) : (
                  projectMembers.map((pm) => (
                    <tr key={pm.id} className="border-b border-gray-700/40">
                      <td className="p-3 text-sm text-white">{pm.user.username}</td>
                      <td className="p-3 text-sm text-gray-300">{pm.user.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{
                          backgroundColor: (ROLE_OPTIONS.find((r) => r.value === pm.role)?.color || "#6366f1") + "20",
                          color: ROLE_OPTIONS.find((r) => r.value === pm.role)?.color || "#6366f1",
                        }}>
                          {ROLE_OPTIONS.find((r) => r.value === pm.role)?.label || pm.role}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded border border-gray-700/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-3 text-xs font-medium text-gray-400">PROJECT</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">QA/PM</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">DEVELOPERS</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-400">CLIENTS</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td className="p-3 text-sm text-gray-500" colSpan={4}>No projects available.</td>
                  </tr>
                ) : (
                  projects.map((project) => {
                    const members = project.id === selectedProjectId
                      ? projectMembers
                      : (projectMembersByProject[project.id] || []);
                    const qaPmMembers = members.filter((member) => member.role === "QA_PM");
                    const developerMembers = members.filter((member) => member.role === "DEVELOPER");
                    const clientMembers = members.filter((member) => member.role === "CLIENT");
                    return (
                      <tr key={project.id} className="border-b border-gray-700/40">
                        <td className="p-3 text-sm text-white">{project.name}</td>
                        <td className="p-3 text-sm text-gray-300">
                          {qaPmMembers.length === 0 ? (
                            "No QA/PM assigned"
                          ) : (
                            <div className="space-y-1">
                              {qaPmMembers.map((member) => (
                                <div key={`qa-${member.id}`}>{member.user.username}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-300">
                          {developerMembers.length === 0 ? (
                            "No developers assigned"
                          ) : (
                            <div className="space-y-1">
                              {developerMembers.map((member) => (
                                <div key={`dev-${member.id}`}>{member.user.username}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-300">
                          {clientMembers.length === 0 ? (
                            "No clients assigned"
                          ) : (
                            <div className="space-y-1">
                              {clientMembers.map((member) => (
                                <div key={`client-${member.id}`}>{member.user.username}</div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Create User Form */}
        {isAdmin && showCreateUserForm && (
          <div className="mb-6 p-6 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
            <h2 className="text-lg font-semibold text-white mb-4">Create New User</h2>
            <p className="text-sm text-gray-400 mb-4">
              Creating a user only saves the account. Use "Resend Setup Email" from the users list when needed.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded transition-colors"
              >
                {isCreatingUser ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        )}

        {/* Users List */}
        {isAdmin && (
        <div className="rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">All Users ({users.length})</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-xs font-medium text-gray-400">USERNAME</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-400">EMAIL</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-400">ROLE</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-400">STATUS</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-400">ACTIONS</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-400">CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                      <td className="p-4">
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3"
                            style={{ backgroundColor: u.avatarColor || getAvatarColor(u.id) }}
                          >
                            {u.initials || getInitials(u.username)}
                          </div>
                          <span className="text-white text-sm">{u.username}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-300 text-sm">{u.email}</td>
                      <td className="p-4">
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor:
                              ROLE_OPTIONS.find((r) => r.value === u.role)?.color + "20" || "#6366f120",
                            color: ROLE_OPTIONS.find((r) => r.value === u.role)?.color || "#6366f1",
                          }}
                        >
                          {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            u.isActive
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendSetupEmail(u)}
                            disabled={!u.isActive || resendingForUserId === u.id}
                            className="px-2 py-1 rounded text-xs font-medium transition-colors bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resendingForUserId === u.id ? "Sending..." : "Resend Setup Email"}
                          </button>

                          <button
                            onClick={() => handleResetTemporaryPassword(u)}
                            disabled={!u.isActive || u.role === "ADMIN" || resettingPasswordForUserId === u.id}
                            className="px-2 py-1 rounded text-xs font-medium transition-colors bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resettingPasswordForUserId === u.id ? "Resetting..." : "Reset Temp Password"}
                          </button>

                          {u.id !== user.id && (
                            <>
                              <button
                                onClick={() => toggleUserStatus(u)}
                                disabled={u.role === "ADMIN"}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  u.isActive
                                    ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                    : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {u.role === "ADMIN" ? "Protected" : u.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUserId === u.id || u.role === "ADMIN"}
                                className="px-2 py-1 rounded text-xs font-medium transition-colors bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingUserId === u.id ? "Deleting..." : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
