"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.push("/protected");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    const supabase = createClient();
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;
      setSuccess("Confirmation email sent. Check your inbox and spam folder.");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Could not resend confirmation email");
    } finally {
      setIsResending(false);
    }
  };

  const needsConfirmation =
    error?.toLowerCase().includes("email not confirmed") ||
    error?.toLowerCase().includes("email_not_confirmed");

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 shadow-xl shadow-black/5">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your LeadFlow CRM account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <p>{needsConfirmation ? "Your email hasn't been confirmed yet." : error}</p>
                  {needsConfirmation && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="mt-2 font-medium underline underline-offset-4 hover:no-underline disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Resend confirmation email"}
                    </button>
                  )}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                  {success}
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
