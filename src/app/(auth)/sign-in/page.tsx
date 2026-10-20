"use client";

import { useForm } from "@tanstack/react-form";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isQuickLoggingIn, setIsQuickLoggingIn] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        });

        if (error) {
          toast.error(
            error.message ||
              "Failed to sign in. Please verify your credentials.",
          );
          return;
        }

        toast.success("Welcome back! Signed in successfully.");
        const session = await authClient.getSession();
        const role = session?.data?.user?.role;

        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected authentication error occurred";
        toast.error(message);
      }
    },
  });

  const handleQuickDemoLogin = async () => {
    try {
      setIsQuickLoggingIn(true);
      form.setFieldValue("email", "demo@demo.com");
      form.setFieldValue("password", "demo123@#");

      const { error } = await authClient.signIn.email({
        email: "demo@demo.com",
        password: "demo123@#",
      });

      if (error) {
        toast.error(
          error.message ||
            "Failed to sign in with demo credentials. Please verify your credentials.",
        );
        return;
      }

      toast.success("Welcome back! Signed in with Demo Account.");
      const session = await authClient.getSession();
      const role = session?.data?.user?.role;

      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected authentication error occurred";
      toast.error(message);
    } finally {
      setIsQuickLoggingIn(false);
    }
  };

  return (
    <Card className="w-full shadow-xl border-border/80 bg-card/95 backdrop-blur-xs transition-all">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary-text border border-primary/30">
          <KeyRound className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Sign In to CashPilot
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground max-w-xs mx-auto">
          Enter your authorized enterprise credentials to access your financial
          telemetry and liquidity forecasts.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-3.5"
        >
          {/* Email Field */}
          <form.Field
            name="email"
            validators={{
              onChange: z
                .string()
                .email("Please enter a valid business email address"),
            }}
          >
            {(field) => {
              const errors = field.state.meta.errors;
              return (
                <div className="space-y-1">
                  <Label
                    htmlFor={field.name}
                    className="text-xs font-semibold text-foreground"
                  >
                    Corporate Email Address
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
                      placeholder="finance@yourcompany.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  {errors && errors.length > 0 ? (
                    <p className="text-[11px] text-destructive font-medium">
                      {errors
                        .map((err) =>
                          typeof err === "string" ? err : err?.message,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          {/* Password Field */}
          <form.Field
            name="password"
            validators={{
              onChange: z
                .string()
                .min(6, "Password must be at least 6 characters"),
            }}
          >
            {(field) => {
              const errors = field.state.meta.errors;
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={field.name}
                      className="text-xs font-semibold text-foreground"
                    >
                      Access Password
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="pl-9 pr-9 text-xs h-9"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors && errors.length > 0 ? (
                    <p className="text-[11px] text-destructive font-medium">
                      {errors
                        .map((err) =>
                          typeof err === "string" ? err : err?.message,
                        )
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="w-full h-9 mt-1 text-xs font-medium bg-primary text-black hover:bg-primary/90 gap-1.5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span>Sign In to Financial Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {/* Quick Demo Access Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground font-mono">
              Or Quick Demo Access
            </span>
          </div>
        </div>

        {/* Quick Demo Login Button */}
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleQuickDemoLogin}
            disabled={isQuickLoggingIn}
            className="w-full h-9 text-xs font-semibold border-primary/40 bg-primary/10 hover:bg-primary/20 text-foreground gap-2 transition-all shadow-xs cursor-pointer"
          >
            {isQuickLoggingIn ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-text" />
                <span>Signing in as demo@demo.com...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-primary-text" />
                <span>Quick Demo Login</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono px-1">
            <span>Email: demo@demo.com</span>
            <span>Pass: demo123@#</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 py-3.5 bg-muted/10 rounded-b-2xl">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/sign-up"
            className="text-primary-text font-semibold hover:underline"
          >
            Create an enterprise account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
