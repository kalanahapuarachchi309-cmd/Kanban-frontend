"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import {
  getUsers,
  createUserByAdmin,
  createProject,
  getProjects,
  addProjectMember,
  getProjectMembers,
  deactivateUser,
  activateUser,
} from "../lib/api/services";
import type { User, Project, ProjectMember } from "../types";

type Role = "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";

interface CreateUserForm {
  username: string;
  email: string;
  temporaryPassword: string;
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
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [memberForm, setMemberForm] = useState<{ userId: number | ""; role: Role }>({
    userId: "",
    role: "DEVELOPER",
  });

  const [formData, setFormData] = useState<CreateUserForm>({
    username: "",
    email: "",
    temporaryPassword: "",
    role: "DEVELOPER",
  });

  useEffect(() => {
    if (user?.role === "ADMIN") {
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

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [usersData, projectsData] = await Promise.all([
        getUsers(),
        getProjects(),
      ]);

      setUsers(usersData);
      setProjects(projectsData);

      if (projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
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
      await createUserByAdmin({
        ...formData,
        username: normalizedUsername,
        email: normalizedEmail,
      });
      setSuccess(`User ${normalizedUsername} created. Password setup link has been sent by email.`);
      setFormData({
        username: "",
        email: "",
        temporaryPassword: "",
        role: "DEVELOPER",
      });
      setShowCreateUserForm(false);
      fetchInitialData();
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      const isConflict = err.response?.status === 409;
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

    if (!selectedProjectId || !memberForm.userId) {
      setError("Please select a project and user.");
      return;
    }

    try {
      setIsAddingMember(true);
      await addProjectMember(selectedProjectId, memberForm.userId, memberForm.role);
      setSuccess("User added to project successfully.");
      setMemberForm({ userId: "", role: "DEVELOPER" });
      const members = await getProjectMembers(selectedProjectId);
      setProjectMembers(members);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add user to project");
    } finally {
      setIsAddingMember(false);
    }
  };

  const toggleUserStatus = async (target: User) => {
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="h-screen overflow-y-auto p-6" style={{ background: "#0d0f14" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm">Manage users and system settings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateUserForm(!showCreateUserForm)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {showCreateUserForm ? "Cancel" : "+ Create User"}
            </button>
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

            <select
              value={memberForm.userId}
              onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value ? Number(e.target.value) : "" })}
              className="px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
              ))}
            </select>

            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as Role })}
              className="px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button
              type="submit"
              disabled={isAddingMember}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white rounded transition-colors"
            >
              {isAddingMember ? "Adding..." : "Add Member"}
            </button>
          </form>

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
        </div>

        {/* Create User Form */}
        {showCreateUserForm && (
          <div className="mb-6 p-6 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
            <h2 className="text-lg font-semibold text-white mb-4">Create New User</h2>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Temporary Password</label>
                  <input
                    type="password"
                    value={formData.temporaryPassword}
                    onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Min 6 characters"
                  />
                </div>
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
                        {u.id !== user.id && (
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              u.isActive
                                ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                            }`}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
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
      </div>
    </div>
  );
}
