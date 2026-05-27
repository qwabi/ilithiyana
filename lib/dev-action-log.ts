/**
 * Dev-only action logging (console). No-op in production.
 */

export type DevActionLogPayload = {
  location: string;
  message: string;
  data?: Record<string, unknown>;
};

export function isDevActionLogEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** Log to dev console only. Do not pass secrets or raw PII. */
export function devActionLog(payload: DevActionLogPayload): void {
  if (!isDevActionLogEnabled()) return;
  console.info(
    `[dev-action] ${payload.location} — ${payload.message}`,
    payload.data ?? {}
  );
}

export async function withDevActionLog<T>(
  action: string,
  location: string,
  run: () => Promise<T>,
  input?: Record<string, unknown>
): Promise<T> {
  devActionLog({
    location,
    message: `${action}:start`,
    data: { action, ...(input ? { input } : {}) },
  });
  try {
    const result = await run();
    const summary =
      result && typeof result === 'object' && 'ok' in result
        ? { ok: (result as { ok: boolean }).ok }
        : { ok: true };
    devActionLog({
      location,
      message: `${action}:ok`,
      data: { action, ...summary },
    });
    return result;
  } catch (e) {
    devActionLog({
      location,
      message: `${action}:error`,
      data: {
        action,
        error: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}
