"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/sign-in");
            router.refresh();
          },
        },
      });
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Admin Dashboard</CardTitle>
          <CardDescription>
            {isPending
              ? "Loading admin profile..."
              : `Welcome, Admin ${session?.user?.name || ""}!`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          {session?.user && (
            <div className="rounded-md bg-muted p-4 space-y-1 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {session.user.name}
              </p>
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {session.user.email}
              </p>
              <p>
                <span className="font-semibold">Role:</span>{" "}
                <span className="capitalize font-semibold text-primary">
                  {session.user.role || "admin"}
                </span>
              </p>
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full mt-4"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
