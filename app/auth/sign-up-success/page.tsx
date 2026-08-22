import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-xl shadow-black/5">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950/40">
              ✓
            </div>
            <CardTitle className="text-2xl">Account created</CardTitle>
            <CardDescription>
              Check your email to confirm your LeadFlow CRM account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Once you confirm your email, come back here and sign in to your
              CRM dashboard.
            </p>
            <Button asChild className="h-11 w-full">
              <Link href="/auth/login">Go to sign in</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try again
              from the sign-in page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
