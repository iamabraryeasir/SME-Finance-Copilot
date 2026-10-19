"use client";

import { useForm } from "@tanstack/react-form";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserPlus,
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

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await authClient.signUp.email({
          name: value.name,
          email: value.email,
          password: value.password,
        });

        if (error) {
          toast.error(
            error.message || "Failed to create account. Please try again.",
          );
          return;
        }

        toast.success("Enterprise account created successfully!");
        router.push("/dashboard");
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected registration error occurred";
        toast.error(message);
      }
    },
  });

  return (
    <Card className="w-full shadow-xl border-border/80 bg-card/95 backdrop-blur-xs transition-all">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary-text border border-primary/30">
          <UserPlus className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
          Create Enterprise Account
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground max-w-xs mx-auto">
          Deploy deterministic cash forecasting and agentic financial guardrails
          for your enterprise.
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
          {/* Full Name Field */}
          <form.Field
            name="name"
            validators={{
              onChange: z
                .string()
                .min(2, "Full name must be at least 2 characters"),
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
                    Full Name / Enterprise Contact
                  </Label>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="name"
                      placeholder="Anisur Rahman"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="pl-9 text-xs h-9"
                    />
                    <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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

          {/* Business Email Field */}
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
                    <span className="text-[10px] text-muted-foreground">
                      Min. 6 characters
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id={field.name}
                      name={field.name}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
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
                    Provisioning Account...
                  </>
                ) : (
                  <>
                    <span>Create Enterprise Account</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 py-3.5 bg-muted/10 rounded-b-2xl">
        <p className="text-xs text-muted-foreground">
          Already have an authorized account?{" "}
          <Link
            href="/sign-in"
            className="text-primary-text font-semibold hover:underline"
          >
            Sign in to console
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
