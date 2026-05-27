"use server";

import { headers } from "next/headers";
import {
  createServerSupabaseClient,
  createServiceClient,
} from "@/lib/supabase/server";
import {
  getIncompleteOnboardingSession,
  type OnboardingSessionRow,
} from "@/lib/onboarding/sessions";
import { devActionLog, withDevActionLog } from "@/lib/dev-action-log";

const LOG_LOC = "app/actions/onboarding-actions.ts";

async function appOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const origin = await appOrigin();

  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as T & { error?: string };

  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Request failed (${res.status})`,
    );
  }
  return data;
}

export async function startOnboardingAccount(raw: Record<string, unknown>) {
  return withDevActionLog(
    "startOnboardingAccount",
    LOG_LOC,
    async () => {
      try {
        const data = await postJson<{
          sessionId: string;
          userId: string;
          currentStep?: string;
        }>("/api/onboarding/start", raw);
        return { ok: true as const, ...data };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not start onboarding",
        };
      }
    },
    { keys: Object.keys(raw) },
  );
}

export async function saveOnboardingChildren(raw: {
  sessionId: string;
  childCount: number;
  selections: Array<{
    learner_slot: number;
    package_id: string;
    package_name: string;
    price_cents: number;
  }>;
}) {
  return withDevActionLog(
    "saveOnboardingChildren",
    LOG_LOC,
    async () => {
      const { persistOnboardingChildren } =
        await import("@/lib/onboarding/persist-children");
      const result = await persistOnboardingChildren(raw);
      if (!result.ok) {
        return { ok: false as const, error: result.error };
      }
      return { ok: true as const, sessionId: result.sessionId };
    },
    {
      sessionId: raw.sessionId,
      childCount: raw.childCount,
      packageIds: raw.selections.map((s) => s.package_id),
    },
  );
}

export async function initiateOnboardingPayment(sessionId: string) {
  return withDevActionLog(
    "initiateOnboardingPayment",
    LOG_LOC,
    async () => {
      try {
        const data = await postJson<{
          processUrl: string;
          fields: Record<string, string>;
        }>("/api/onboarding/initiate-payment", { sessionId });

        return {
          ok: true as const,
          processUrl: data.processUrl,
          fields: data.fields,
        };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not start payment",
        };
      }
    },
    { sessionId },
  );
}

export async function confirmOnboardingPayment(
  sessionId: string,
  payfastPaymentId?: string,
) {
  return withDevActionLog(
    "confirmOnboardingPayment",
    LOG_LOC,
    async () => {
      try {
        const data = await postJson<{ ok: boolean; result: unknown }>(
          "/api/onboarding/confirm-payment",
          { sessionId, payfastPaymentId },
        );
        return { ok: true as const, result: data.result };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not confirm payment",
        };
      }
    },
    { sessionId, hasPayfastPaymentId: Boolean(payfastPaymentId) },
  );
}

/** Alias used by SetupStepClient after PayFast return. */
export const confirmOnboardingPaymentAction = confirmOnboardingPayment;

export async function saveOnboardingChildProfile(raw: Record<string, unknown>) {
  return withDevActionLog(
    "saveOnboardingChildProfile",
    LOG_LOC,
    async () => {
      try {
        const data = await postJson<{
          ok: boolean;
          learnerId: string;
          created: boolean;
        }>("/api/onboarding/save-child", raw);
        return {
          ok: true as const,
          learnerId: data.learnerId,
          created: data.created,
        };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e.message : "Could not save child",
        };
      }
    },
    { keys: Object.keys(raw) },
  );
}

export async function completeOnboarding(raw: {
  sessionId: string;
  reportsAdded?: boolean;
}) {
  return withDevActionLog(
    "completeOnboarding",
    LOG_LOC,
    async () => {
      try {
        await postJson<{ ok: boolean }>("/api/onboarding/complete", raw);
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          error:
            e instanceof Error ? e.message : "Could not complete onboarding",
        };
      }
    },
    { sessionId: raw.sessionId, reportsAdded: raw.reportsAdded },
  );
}

export async function getOnboardingResume(userId: string, email: string) {
  return withDevActionLog(
    "getOnboardingResume",
    LOG_LOC,
    async () => {
      const supabase = createServiceClient();
      const session = await getIncompleteOnboardingSession(supabase, {
        userId,
        email,
      });
      return { session };
    },
    { userId, emailDomain: email.split("@")[1] ?? "" },
  );
}

export async function loadOnboardingSessionForUser(
  sessionId: string,
): Promise<{ session: OnboardingSessionRow } | { error: string }> {
  return withDevActionLog(
    "loadOnboardingSessionForUser",
    LOG_LOC,
    async () => {
      const authClient = createServerSupabaseClient();
      const {
        data: { user },
      } = await authClient.auth.getUser();

      const origin = await appOrigin();
      const requestHeaders = user ? await headers() : null;
      const res = await fetch(
        `${origin}/api/onboarding/session?id=${encodeURIComponent(sessionId)}`,
        {
          headers: requestHeaders
            ? { cookie: requestHeaders.get("cookie") ?? "" }
            : {},
          cache: "no-store",
        },
      );
      const data = (await res.json()) as {
        session?: OnboardingSessionRow;
        error?: string;
      };
      if (!res.ok || !data.session) {
        return { error: data.error ?? "Session not found" };
      }
      return { session: data.session };
    },
    { sessionId },
  );
}
