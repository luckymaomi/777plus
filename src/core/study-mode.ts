import type { StudyMode } from "../types";

export const STUDY_MODE_STORAGE_KEY = "777plus-study-mode";

export function resolveStudyMode(value: string | null): StudyMode {
  return value === "super" ? "super" : "normal";
}
