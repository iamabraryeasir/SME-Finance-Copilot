"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AdminUser } from "@/types/admin";

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ban Modal state
  const [banModalUser, setBanModalUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  const fetchUsers = useCallback(
    async (currentPage = 1, searchQuery = "") => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set("page", currentPage.toString());
        params.set("limit", limit.toString());
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setUsersList(json.data.users);
          setTotalCount(json.data.totalCount);
          setTotalPages(json.data.totalPages || 1);
        }
      } catch {
        toast.error("Failed to load user directory");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchUsers(page, userSearch);
  }, [fetchUsers, page, userSearch]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers(page, userSearch);
    toast.success("User directory refreshed");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserSearch(val);
    setPage(1); // Reset to page 1 on search
  };

  const handleOpenBanModal = (user: AdminUser) => {
    setBanModalUser(user);
    setBanReason("");
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    try {
      setIsSubmittingBan(true);
      const res = await fetch(`/api/admin/users/${banModalUser.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banned: true,
          reason: banReason.trim() || "Violation of platform terms",
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`User ${banModalUser.email} has been banned.`);
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === banModalUser.id
              ? {
                  ...u,
                  banned: true,
                  banReason: banReason.trim() || "Violation of platform terms",
                }
              : u,
          ),
        );
        setBanModalUser(null);
      } else {
        toast.error(json.message || "Failed to ban user");
      }
    } catch {
      toast.error("Network error while attempting to ban user");
    } finally {
      setIsSubmittingBan(false);
    }
  };

  const handleUnban = async (user: AdminUser) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: false }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`User ${user.email} has been unbanned.`);
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, banned: false, banReason: null } : u,
          ),
        );
      } else {
        toast.error(json.message || "Failed to unban user");
      }
    } catch {
      toast.error("Network error while attempting to unban user");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Users & SME Tenants Directory
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono px-2 py-0.5 bg-primary/10 text-primary-text border-primary/30"
            >
              Tenancy Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Read-only directory of all onboarded businesses, ledger sizes,
            reserve thresholds, and access status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by name, email..."
              value={userSearch}
              onChange={handleSearchChange}
              className="pl-8 text-xs h-9 rounded-xl"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-2 h-9 rounded-xl text-xs border-border bg-card hover:bg-muted font-mono"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Sync"}</span>
          </Button>
        </div>
      </div>

      {isLoading && usersList.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary-text" />
          <p className="text-xs font-mono">Loading tenant directory...</p>
        </div>
      ) : (
        <Card className="border border-border shadow-2xs">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-text" />
                Active SME Tenants
              </span>
              <Badge variant="outline" className="text-[11px] font-mono">
                {totalCount} Total Tenants
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Complete registry of business entities excluding system
              administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {usersList.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No users found matching search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-medium">User / Contact</th>
                      <th className="py-3 px-4 font-medium">Company Profile</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">
                        Invoices
                      </th>
                      <th className="py-3 px-4 font-medium text-right">
                        Alerts
                      </th>
                      <th className="py-3 px-4 font-medium">Telegram</th>
                      <th className="py-3 px-4 font-medium">Joined</th>
                      <th className="py-3 px-4 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {usersList.map((user) => (
                      <tr
                        key={user.id}
                        className={`hover:bg-muted/30 transition-colors ${
                          user.banned ? "bg-destructive/5" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">
                            {user.companyName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Reserve: {user.currency}{" "}
                            {user.minReserveThreshold.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.banned ? (
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="border-destructive/40 bg-destructive/10 text-destructive text-[10px] font-mono gap-1"
                              >
                                <Ban className="h-3 w-3" /> Banned
                              </Badge>
                              {user.banReason && (
                                <p className="text-[9px] text-destructive/80 font-mono truncate max-w-xs">
                                  {user.banReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">
                          {user.stats.invoicesCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {user.stats.alertsCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              {user.stats.alertsCount} active
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {user.isTelegramLinked ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1"
                            >
                              <Send className="h-2.5 w-2.5" />
                              Linked
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Unlinked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(user.joinedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {user.banned ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnban(user)}
                              className="h-7 px-2.5 text-xs font-mono border-border hover:bg-muted"
                            >
                              Unban
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenBanModal(user)}
                              className="h-7 px-2.5 text-xs font-mono text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Ban
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="p-4 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, totalCount)} of {totalCount} users
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="px-2 font-medium text-foreground">
                    Page {page} of {totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ban User Confirmation Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-semibold text-sm">Ban SME Tenant</h3>
              </div>
              <button
                type="button"
                onClick={() => setBanModalUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Banning this user will immediately revoke all active sessions
                  and block any further financial operations or copilot
                  interactions.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground block text-[10px] font-mono">
                  TARGET USER
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {banModalUser.name} ({banModalUser.email})
                </p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  Company: {banModalUser.companyName}
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="banReasonInput"
                  className="text-foreground block text-xs font-medium"
                >
                  Reason for Ban
                </label>
                <Input
                  id="banReasonInput"
                  type="text"
                  placeholder="e.g., Suspicious financial activity, Terms violation..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBanModalUser(null)}
                disabled={isSubmittingBan}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmBan}
                disabled={isSubmittingBan}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {isSubmittingBan ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Banning...
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5" />
                    Confirm Ban
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
