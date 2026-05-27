"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import {
  createBrowserClient,
  isBrowserSupabaseConfigured,
} from "@/lib/supabase/client";
import { signInWithPassword } from "@/app/actions/auth-actions";
import {
  finalizeTutorSignup,
  registerTutorAuth,
  uploadTutorSignupDocument,
} from "@/lib/tutor/actions";
import { TUTOR_SIGNUP_DOCUMENTS } from "@/lib/tutor/constants";
import { provinces, subjects as tutoringSubjects } from "@/lib/site-config";
import type { TutorDocumentType } from "@/lib/types/database";

type DocKey = TutorDocumentType;

export function TutorSignupClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [popiaAccepted, setPopiaAccepted] = useState(false);
  const [files, setFiles] = useState<Partial<Record<DocKey, File>>>({});
  const [pending, startTransition] = useTransition();

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Signed in");
      router.push("/tutor");
      router.refresh();
    });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!province) {
      toast.error("Please select a province");
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error("Select at least one subject you can tutor");
      return;
    }
    if (!popiaAccepted) {
      toast.error("Please accept the privacy notice");
      return;
    }

    for (const doc of TUTOR_SIGNUP_DOCUMENTS) {
      if (doc.required && !files[doc.type]) {
        toast.error(`Please upload: ${doc.label}`);
        return;
      }
    }

    if (!isBrowserSupabaseConfigured()) {
      toast.error("Registration is not available right now.");
      return;
    }

    startTransition(async () => {
      const supabase = createBrowserClient();
      const normalizedEmail = email.trim().toLowerCase();

      const authResult = await registerTutorAuth({
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      if (!authResult.ok) {
        toast.error(authResult.error);
        return;
      }

      const userId = authResult.userId;

      const uploadedDocs: {
        documentType: TutorDocumentType;
        storagePath: string;
        fileName: string;
      }[] = [];

      for (const doc of TUTOR_SIGNUP_DOCUMENTS) {
        const file = files[doc.type];
        if (!file) continue;

        const formData = new FormData();
        formData.set("file", file);

        const uploadResult = await uploadTutorSignupDocument({
          userId,
          email: normalizedEmail,
          documentType: doc.type,
          formData,
        });

        if (!uploadResult.ok) {
          toast.error(`Could not upload ${doc.label}: ${uploadResult.error}`);
          return;
        }

        uploadedDocs.push({
          documentType: doc.type,
          storagePath: uploadResult.storagePath,
          fileName: uploadResult.fileName,
        });
      }

      const result = await finalizeTutorSignup({
        userId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        province,
        subjects: selectedSubjects,
        documents: uploadedDocs,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const serverSignIn = await signInWithPassword(
        normalizedEmail,
        password,
      );
      if (!serverSignIn.ok) {
        const { error: clientSignInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
        if (clientSignInError) {
          toast.error("Application saved. Please sign in to continue.");
          setMode("signin");
          return;
        }
      }

      toast.success("Application submitted");
      router.replace("/tutor");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="[font-family:var(--font-dm-serif),serif] text-3xl text-[hsl(210,100%,25%)]">
        {mode === "signup" ? "Apply to tutor" : "Tutor sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Join the Ilithiyana tutor team. Upload your documents and we will review your application."
          : "Sign in to check vetting status or access your dashboard."}
      </p>

      <form
        onSubmit={mode === "signup" ? handleSignUp : handleSignIn}
        className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
      >
        {mode === "signup" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tfn">First name</Label>
                <Input
                  id="tfn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tln">Last name</Label>
                <Input
                  id="tln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tphone">Mobile number</Label>
              <Input
                id="tphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tprovince">Province</Label>
              <select
                id="tprovince"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                required
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select province</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div role="group" aria-labelledby="tutor-subjects-label">
              <p id="tutor-subjects-label" className="text-sm font-medium">
                Subjects you can tutor
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select all subjects you are qualified to teach.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tutoringSubjects.map((subject) => {
                  const selected = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      aria-pressed={selected}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSubject(subject);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-[#1B6CA8] bg-[#1B6CA8] text-white"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}

        <div>
          <Label htmlFor="temail">Email</Label>
          <Input
            id="temail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="tpw">Password</Label>
          <PasswordInput
            id="tpw"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1"
          />
        </div>

        {mode === "signup" ? (
          <>
            <fieldset className="space-y-3 border-t border-border pt-4">
              <legend className="text-sm font-medium">Documents</legend>
              {TUTOR_SIGNUP_DOCUMENTS.map((doc) => (
                <div key={doc.type}>
                  <Label htmlFor={`doc-${doc.type}`}>
                    {doc.label}
                    {doc.required ? " *" : ""}
                  </Label>
                  <Input
                    id={`doc-${doc.type}`}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-1"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setFiles((prev) => ({
                        ...prev,
                        [doc.type]: file,
                      }));
                    }}
                  />
                </div>
              ))}
            </fieldset>
            <div className="flex items-start gap-3 text-sm">
              <input
                id="tutor-popia"
                type="checkbox"
                checked={popiaAccepted}
                onChange={(e) => setPopiaAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-input accent-[#1B6CA8]"
              />
              <Label
                htmlFor="tutor-popia"
                className="cursor-pointer font-normal leading-snug"
              >
                I agree to the processing of my personal information in line
                with POPIA and the{" "}
                <Link href="/privacy" className="text-primary underline">
                  privacy policy
                </Link>
                .
              </Label>
            </div>
          </>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "signup" ? "Submitting…" : "Signing in…"}
            </>
          ) : mode === "signup" ? (
            "Submit application"
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already applied?{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New tutor?{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode("signup")}
            >
              Apply now
            </button>
          </>
        )}
        {" · "}
        <Link href="/" className="hover:underline">
          Back to site
        </Link>
      </p>
    </div>
  );
}
