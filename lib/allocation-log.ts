/** Structured logs for class enrollment + schedule creation (all environments). */

export function allocationLog(
  message: string,
  data?: Record<string, unknown>
): void {
  if (data && Object.keys(data).length > 0) {
    console.info(`[allocation] ${message}`, data);
  } else {
    console.info(`[allocation] ${message}`);
  }
}
