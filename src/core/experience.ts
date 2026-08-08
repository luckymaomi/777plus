export const MENG_NOTES_ID = "meng-key-points";

export function resolveExperienceId(candidate: string | undefined, jingId: string, fanId: string): string {
  return candidate === fanId || candidate === MENG_NOTES_ID ? candidate : jingId;
}
