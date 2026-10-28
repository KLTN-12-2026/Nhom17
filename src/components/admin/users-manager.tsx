"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";

export interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  phone_number?: string;
  role: "admin" | "instructor" | "student";
  status: "active" | "disabled";
  is_active?: boolean;
  createdAt?: string | Date;
}

interface UsersManagerProps {
  initialUsers: ManagedUser[];
  currentAdminId: string;
}

export default function UsersManager({ initialUsers, currentAdminId }: UsersManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Danh sách và bộ lọc
  const users = initialUsers;
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // State Toast thông báo
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // State Modal Thêm mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: "",
    role: "student" as "admin" | "instructor" | "student",
    status: "active" as "active" | "disabled",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // State Modal Chỉnh sửa / Phân quyền
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone_number: "",
    password: "",
    role: "student" as "admin" | "instructor" | "student",
    status: "active" as "active" | "disabled",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // State Modal Xác nhận Xóa
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Hiển thị Toast tự tắt sau 3.5 giây
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };


  // Lọc danh sách người dùng phía Client
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone_number && u.phone_number.includes(q));

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const student = users.filter((u) => u.role === "student").length;
    const instructor = users.filter((u) => u.role === "instructor").length;
    const admin = users.filter((u) => u.role === "admin").length;
    const active = users.filter((u) => u.status === "active").length;
    const disabled = users.filter((u) => u.status === "disabled").length;
    return { student, instructor, admin, active, disabled, total: users.length };
  }, [users]);

  // Xử lý tạo mới tài khoản (POST)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo tài khoản");
      }

      showToast("success", `Tạo tài khoản [${data.user.name}] thành công!`);
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone_number: "",
        password: "",
        role: "student",
        status: "active",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setCreateLoading(false);
    }
  };

  // Mở modal sửa
  const openEditModal = (u: ManagedUser) => {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      phone_number: u.phone_number || "",
      password: "",
      role: u.role,
      status: u.status,
    });
    setEditError("");
  };

  // Xử lý cập nhật thông tin & phân quyền (PATCH)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setEditLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        phone_number: editForm.phone_number,
        role: editForm.role,
        status: editForm.status,
      };

      if (editForm.password && editForm.password.trim().length > 0) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể cập nhật tài khoản");
      }

      showToast("success", `Đã cập nhật thông tin cho [${data.user.name}]!`);
      setEditingUser(null);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setEditLoading(false);
    }
  };

  // Xử lý nhanh Khóa / Mở khóa tài khoản (PATCH status)
  const handleToggleStatus = async (u: ManagedUser) => {
    if (u._id === currentAdminId && u.status === "active") {
      showToast("error", "Ràng buộc an ninh: Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }

    const nextStatus = u.status === "active" ? "disabled" : "active";
    const actionLabel = nextStatus === "active" ? "Mở khóa" : "Khóa";

    try {
      const res = await fetch(`/api/admin/users/${u._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Không thể ${actionLabel} tài khoản`);
      }

      showToast("success", `Đã ${actionLabel.toLowerCase()} tài khoản [${u.name}] thành công!`);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Thao tác thất bại");
    }
  };

  // Xử lý Xóa tài khoản (DELETE)
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;

    if (deletingUser._id === currentAdminId) {
      showToast("error", "Ràng buộc an ninh: Bạn không thể tự xóa tài khoản của chính mình!");
      setDeletingUser(null);
      return;
    }

    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${deletingUser._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể xóa tài khoản");
      }

      showToast("success", data.message || `Đã xóa tài khoản [${deletingUser.name}]!`);
      setDeletingUser(null);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Lỗi khi xóa tài khoản");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold text-white transition-all transform animate-bounce">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-600 border border-emerald-400"
                : "bg-rose-600 border border-rose-400"
            }`}
          >
            <span>{toast.type === "success" ? "✓" : "⚠"}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 3 Metric Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setRoleFilter(roleFilter === "student" ? "all" : "student")}
          className={`p-4 rounded-2xl border text-left transition shadow-sm ${
            roleFilter === "student"
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Học Viên (Student)
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
              🎓
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.student}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {roleFilter === "student" ? "Đang lọc theo Học viên • Bấm để bỏ" : "Bấm để lọc danh sách"}
          </div>
        </button>

        <button
          onClick={() => setRoleFilter(roleFilter === "instructor" ? "all" : "instructor")}
          className={`p-4 rounded-2xl border text-left transition shadow-sm ${
            roleFilter === "instructor"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Giảng Viên (Instructor)
            </span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
              👨‍🏫
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.instructor}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            {roleFilter === "instructor" ? "Đang lọc theo Giảng viên • Bấm để bỏ" : "Bấm để lọc danh sách"}
          </div>
        </button>

        <button
          onClick={() => setRoleFilter(roleFilter === "admin" ? "all" : "admin")}
          className={`p-4 rounded-2xl border text-left transition shadow-sm ${
            roleFilter === "admin"
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quản Trị Viên (Admin)
            </span>
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-xs">
              👑
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.admin}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            {roleFilter === "admin" ? "Đang lọc theo Quản trị • Bấm để bỏ" : "Bấm để lọc danh sách"}
          </div>
        </button>
      </div>

      {/* Action Toolbar: Search, Filters, Add Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Dropdown & Add Button */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="all">Tất cả trạng thái ({stats.total})</option>
            <option value="active">● Đang hoạt động ({stats.active})</option>
            <option value="disabled">● Đã bị khóa ({stats.disabled})</option>
          </select>

          <button
            onClick={() => {
              setIsCreateOpen(true);
              setCreateError("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold hover:from-rose-700 hover:to-pink-700 active:scale-95 transition shadow-sm shadow-rose-500/25 shrink-0"
          >
            <span>+</span>
            <span>Thêm Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{stats.total}</strong> tài khoản
            {isPending && <span className="ml-2 text-rose-500 animate-pulse font-medium">Đang đồng bộ...</span>}
          </div>
          {(searchQuery || roleFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Tài Khoản / Họ Tên</th>
                <th className="py-3 px-4">Liên Hệ</th>
                <th className="py-3 px-4">Vai Trò</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ngày Tạo</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u._id === currentAdminId;

                  const roleBadgeStyles = {
                    admin: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800",
                    instructor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
                    student: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
                  };

                  const roleLabels = {
                    admin: "Quản trị viên",
                    instructor: "Giảng viên",
                    student: "Học viên",
                  };

                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "Mới đây";

                  return (
                    <tr
                      key={u._id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        u.status === "disabled" ? "opacity-60 bg-slate-50/40 dark:bg-slate-900/40" : ""
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs shrink-0">
                          {u.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{u.name}</span>
                            {isCurrentAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold uppercase">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u._id}</div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-700 dark:text-slate-300">{u.email}</div>
                        {u.phone_number ? (
                          <div className="text-[11px] text-slate-400 font-mono">{u.phone_number}</div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa có SĐT</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
                            roleBadgeStyles[u.role] || roleBadgeStyles.student
                          }`}
                        >
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Đã bị khóa
                          </span>
                        )}
                      </td>

                      {/* Created date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">{createdDate}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Sửa / Phân quyền */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                            title="Chỉnh sửa thông tin & Phân quyền"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Nút Khóa / Mở Khóa */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrentAdmin && u.status === "active"}
                            className={`p-1.5 rounded-lg border transition ${
                              u.status === "active"
                                ? isCurrentAdmin
                                  ? "opacity-30 cursor-not-allowed border-slate-200 text-slate-400"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100"
                            }`}
                            title={
                              isCurrentAdmin && u.status === "active"
                                ? "Không thể tự khóa tài khoản của mình"
                                : u.status === "active"
                                ? "Khóa tài khoản vi phạm"
                                : "Mở khóa tài khoản"
                            }
                          >
                            {u.status === "active" ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>

                          {/* Nút Xóa */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrentAdmin}
                            className={`p-1.5 rounded-lg border transition ${
                              isCurrentAdmin
                                ? "opacity-30 cursor-not-allowed border-slate-200 text-slate-400"
                                : "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100"
                            }`}
                            title={
                              isCurrentAdmin
                                ? "Không thể tự xóa tài khoản của mình"
                                : "Xóa tài khoản"
                            }
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: THÊM TÀI KHOẢN MỚI ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Thêm Tài Khoản Mới
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Tạo tài khoản và phân quyền trực tiếp cho Giảng viên hoặc Học viên trong hệ thống.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                ⚠ {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ Và Tên *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ví dụ: ThS. Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Địa Chỉ Email *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="name@organization.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    value={createForm.phone_number}
                    onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                    placeholder="0905..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mật Khẩu Khởi Tạo *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phân Quyền (Vai Trò) *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        role: e.target.value as "admin" | "instructor" | "student",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="student">🎓 Học viên</option>
                    <option value="instructor">👨‍🏫 Giảng viên</option>
                    <option value="admin">👑 Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng Thái Ban Đầu *
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        status: e.target.value as "active" | "disabled",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="active">🟢 Đang hoạt động</option>
                    <option value="disabled">🔴 Khóa tài khoản</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {createLoading ? "Đang tạo..." : "Xác Nhận Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỈNH SỬA & PHÂN QUYỀN ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Cập Nhật & Phân Quyền
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Tài khoản: <strong className="text-slate-800 dark:text-slate-200 font-mono">{editingUser.email}</strong>
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                ⚠ {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ Và Tên
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số Điện Thoại
                </label>
                <input
                  type="text"
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  placeholder="Chưa cập nhật SĐT"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vai Trò (Phân Quyền)
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        role: e.target.value as "admin" | "instructor" | "student",
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="student">🎓 Học viên</option>
                    <option value="instructor">👨‍🏫 Giảng viên</option>
                    <option value="admin">👑 Quản trị viên</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng Thái
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as "active" | "disabled",
                      })
                    }
                    disabled={editingUser._id === currentAdminId}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
                  >
                    <option value="active">🟢 Đang hoạt động</option>
                    <option value="disabled">🔴 Đã bị khóa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đổi Mật Khẩu Mới (Tùy chọn)
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Để trống nếu không muốn đổi mật khẩu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {editLoading ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: XÁC NHẬN XÓA TÀI KHOẢN ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
              Xác Nhận Xóa Tài Khoản?
            </h3>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-bold">{deletingUser.name}</strong> (
              <span className="font-mono">{deletingUser.email}</span>)? Hành động này không thể hoàn tác.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {deleteLoading ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
