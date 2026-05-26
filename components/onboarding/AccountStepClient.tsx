"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { startOnboardingAccount } from "@/app/actions/onboarding-actions";
import { createBrowserClient } from "@/lib/supabase/client";
import { provinces } from "@/lib/site-config";
import { LOCAL_STORAGE_SESSION_KEY } from "@/lib/onboarding/constants";
import toast from "react-hot-toast";

export function AccountStepClient() {
  const router = useRouter();
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentAddress, setParentAddress] = useState("");
  const [province, setProvince] = useState<string>("");
  const [password, setPassword] = useState("");
  const [popia, setPopia] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!province) {
      toast.error("Please select a province");
      return;
    }
    if (!popia) {
      toast.error("Please accept the privacy notice");
      return;
    }

    startTransition(async () => {
      // Step 1: create the account + onboarding session on the server
      const result = await startOnboardingAccount({
        parentFirstName,
        parentLastName,
        parentEmail,
        parentPhone,
        parentAddress,
        province,
        parentPassword: password,
        popiaConsent: true,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const sessionId = result.sessionId;

      // Step 2: sign in on the browser so the auth cookie is set
      const supabase = createBrowserClient();

      // Sign out any existing session first to avoid stale state
      await supabase.auth.signOut();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: parentEmail.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Account was created but sign-in failed — send to login with resume link
        toast.error(
          "Account created. Please sign in to continue."
        );
        router.push(
          `/login?from=${encodeURIComponent(`/onboarding/children?session_id=${sessionId}`)}`
        );
        return;
      }

      // Step 3: store session id locally for resilience
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, sessionId);

      // Step 4: wait one tick for the auth cookie to be written by the browser
      // before navigating — this prevents the race condition where the children
      // step server action runs before getUser() can read the new session.
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Step 5: navigate — use replace so back button goes to homepage not account
      router.replace(`/onboarding/children?session_id=${sessionId}`);
    });
  };

  return (
    <>
      <ProgressBar currentStep="account" />
      <StepHeader
        title="Create your parent account"
        description="Set up login details for your family enrolment. You can add children in the next step."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pfn">First name</Label>
            <Input
              id="pfn"
              value={parentFirstName}
              onChange={(e) => setParentFirstName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pln">Last name</Label>
            <Input
              id="pln"
              value={parentLastName}
              onChange={(e) => setParentLastName(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="province">Province</Label>
            <select
              id="province"
              name="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className={cn(
                "mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                !province && "text-muted-foreground",
              )}
            >
              <option value="" disabled>
                Select province
              </option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Home address</Label>
            <Input
              id="address"
              value={parentAddress}
              onChange={(e) => setParentAddress(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="pw">Password</Label>
            <PasswordInput
              id="pw"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              At least 8 characters
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={popia}
            onCheckedChange={(v) => setPopia(Boolean(v))}
          />
          <span>
            I agree to the{" "}
            <Link
              href="/privacy"
              className="text-primary underline"
              target="_blank"
            >
              privacy policy
            </Link>{" "}
            and processing of my information for enrolment (POPIA).
          </span>
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Continue to children"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login?from=/onboarding/children"
            className="text-primary underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </>
  );
}
