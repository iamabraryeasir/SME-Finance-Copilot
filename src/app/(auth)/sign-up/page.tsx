"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
          toast.error(error.message || "Failed to create account");
          return;
        }

        toast.success("Account created successfully!");
        router.push("/dashboard");
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast.error(message);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Create an Account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your details below to register a new user account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field
              name="name"
              validators={{
                onChange: z
                  .string()
                  .min(2, "Name must be at least 2 characters"),
              }}
            >
              {(field) => {
                const errors = field.state.meta.errors;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Full Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="name"
                      placeholder="Jane Doe"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {errors && errors.length > 0 ? (
                      <p className="text-xs text-destructive">
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

            <form.Field
              name="email"
              validators={{
                onChange: z
                  .string()
                  .email("Please enter a valid email address"),
              }}
            >
              {(field) => {
                const errors = field.state.meta.errors;
                return (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Email</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {errors && errors.length > 0 ? (
                      <p className="text-xs text-destructive">
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
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>Password</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {errors && errors.length > 0 ? (
                      <p className="text-xs text-destructive">
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
                  className="w-full mt-2"
                >
                  {isSubmitting ? "Creating account..." : "Sign Up"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-primary-text font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
