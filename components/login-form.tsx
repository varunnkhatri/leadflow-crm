"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to sign in. Please try again.");

      // Do a real browser navigation after the server has set the Supabase
      // cookies. This guarantees /protected receives the new session.
      window.location.replace(result.redirectTo || "/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
      setIsLoading(false);
    }
  };

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
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/forgot-password" className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Forgot password?</Link>
                </div>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account? <Link href="/auth/sign-up" className="font-medium text-foreground underline underline-offset-4">Create one</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
