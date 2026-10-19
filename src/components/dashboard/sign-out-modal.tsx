"use client";

import { Loader2, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignOutModal({ isOpen, onClose }: SignOutModalProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSigningOut) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSigningOut, onClose]);

  if (!isOpen || !mounted) return null;

  const handleConfirmSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            onClose();
            router.push("/sign-in");
            router.refresh();
          },
          onError: () => {
            toast.error("Failed to sign out. Please try again.");
            setIsSigningOut(false);
          },
        },
      });
    } catch {
      toast.error("Failed to sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CP";

  const isAdmin = session?.user?.role === "admin";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-dialog-title"
    >
      {/* Clickable Backdrop */}
      <button
        type="button"
        aria-label="Close dialog backdrop"
        onClick={() => {
          if (!isSigningOut) onClose();
        }}
        className="fixed inset-0 w-full h-full border-0 bg-transparent cursor-default"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <LogOut className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="signout-dialog-title"
                className="font-semibold text-sm text-foreground leading-none"
              >
                Sign Out
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Confirm session termination
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSigningOut}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Are you sure you want to sign out of your account? You will need to
            sign in again to access your workspace.
          </p>

          {/* User Profile Summary */}
          {session?.user && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-2xs">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-foreground text-xs truncate">
                    {session.user.name}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono px-1 py-0 uppercase"
                  >
                    {isAdmin ? "Admin" : "Owner"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSigningOut}
            className="h-8 text-xs rounded-xl border-border hover:bg-muted font-medium"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirmSignOut}
            disabled={isSigningOut}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5 shadow-2xs"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
