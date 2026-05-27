"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { provinces, subjects } from "@/lib/site-config";
import { TUTOR_SIGNUP_DOCUMENTS } from "@/lib/tutor/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { signInWithPassword } from "@/app/actions/auth-actions";
import {
  finalizeTutorSignup,
  registerTutorAuth,
  uploadTutorSignupDocument,
} from "@/lib/tutor/actions";
import type { TutorDocumentType } from "@/lib/types/database";

export function TutorSignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [files, setFiles] = useState<Partial<Record<TutorDocumentType, File>>>(
    {},
  );

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (!province || selectedSubjects.length < 1) {
        toast.error("Select province and at least one subject.");
        return;
      }

      for (const doc of TUTOR_SIGNUP_DOCUMENTS) {
        if (doc.required && !files[doc.type]) {
          toast.error(`Upload: ${doc.label}`);
          return;
        }
      }

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
      const supabase = createBrowserSupabaseClient();

      const uploaded: {
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
          toast.error(
            `Could not upload ${doc.label}: ${uploadResult.error}`,
          );
          return;
        }

        uploaded.push({
          documentType: doc.type,
          storagePath: uploadResult.storagePath,
          fileName: uploadResult.fileName,
        });
      }

      const result = await finalizeTutorSignup({
        userId,
        email: normalizedEmail,
        firstName,
        lastName,
        phone,
        province,
        subjects: selectedSubjects,
        documents: uploaded,
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
          return;
        }
      }

      toast.success("Application submitted");
      router.push("/tutor");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label>Province</Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div role="group" aria-labelledby="signup-subjects-label">
        <Label id="signup-subjects-label" className="mb-2 block">
          Subjects you can tutor
        </Label>
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => {
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
      <div className="space-y-3">
        <Label>Documents</Label>
        {TUTOR_SIGNUP_DOCUMENTS.map((doc) => (
          <div key={doc.type}>
            <Label htmlFor={doc.type} className="text-sm font-normal">
              {doc.label}
              {doc.required ? " *" : ""}
            </Label>
            <Input
              id={doc.type}
              type="file"
              accept=".pdf,image/*"
              className="mt-1"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFiles((prev) => ({
                  ...prev,
                  [doc.type]: file ?? undefined,
                }));
              }}
            />
          </div>
        ))}
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#1B6CA8] hover:bg-[#1B6CA8]/90"
      >
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
