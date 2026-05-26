"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { grades, subjects as tutoringSubjects } from "@/lib/site-config";
import {
  getOfferedSubjectsForGrade,
  subjectDisplayName,
} from "@/lib/curriculum/subjects";
import type { PackageSelectionSlot } from "@/lib/onboarding/sessions";
import toast from "react-hot-toast";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function ChildProfileForm({
  sessionId,
  slot,
  packageInfo,
  onSaved,
}: {
  sessionId: string;
  slot: number;
  packageInfo: PackageSelectionSlot;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preferredDays, setPreferredDays] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const gradeNum = parseInt(grade, 10);
  const offered = useMemo(
    () => (gradeNum ? getOfferedSubjectsForGrade(gradeNum) : []),
    [gradeNum],
  );

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((s) => s !== subjectId);
      }
      if (prev.length >= 4) {
        toast.error("Maximum 4 subjects");
        return prev;
      }
      return [...prev, subjectId];
    });
  };

  const toggleDay = (day: string) => {
    setPreferredDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    if (!schoolName.trim()) {
      toast.error("School name is required");
      return;
    }
    if (!grade || gradeNum < 6 || gradeNum > 12) {
      toast.error("Select a valid grade");
      return;
    }
    if (selectedSubjects.length < 1) {
      toast.error("Select at least one subject");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/onboarding/save-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          learnerSlot: slot,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth,
          schoolName: schoolName.trim(),
          grade: gradeNum,
          subjects: selectedSubjects,
          preferredDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not save profile");
        return;
      }
      toast.success(`Child ${slot} saved`);
      onSaved(json.learnerId as string);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm font-medium text-[hsl(210,100%,25%)]">
        Child {slot} — {packageInfo.package_name}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`fn-${slot}`}>First name</Label>
          <Input
            id={`fn-${slot}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`ln-${slot}`}>Last name</Label>
          <Input
            id={`ln-${slot}`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`dob-${slot}`}>Date of birth</Label>
          <Input
            id={`dob-${slot}`}
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`school-${slot}`}>School</Label>
          <Input
            id={`school-${slot}`}
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label>Grade</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {grades.map((g) => (
                <SelectItem key={g} value={String(g)}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {offered.length > 0 ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Subjects (max 4)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {offered.map((sub) => {
              if (!sub.id) return null;
              const checked = selectedSubjects.includes(sub.id);
              return (
                <label
                  key={sub.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSubject(sub.id)}
                  />
                  {subjectDisplayName(sub)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : grade ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Select subjects from: {tutoringSubjects.join(", ")}
        </p>
      ) : null}

      <fieldset className="mt-4">
        <legend className="text-sm font-medium">
          Preferred days (optional)
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <Checkbox
                checked={preferredDays.includes(day)}
                onCheckedChange={() => toggleDay(day)}
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" className="mt-6 w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          `Save child ${slot}`
        )}
      </Button>
    </form>
  );
}
