import type { AppState } from '../types';

const STORAGE_KEY = 'dad-to-be-pwa/v1';

export const emptyAppState: AppState = {
  profile: null,
  tasks: [],
  milestones: [],
};

export function loadAppState() {
  if (typeof window === 'undefined') {
    return emptyAppState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyAppState;
    }

    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== 'object') {
      return emptyAppState;
    }

    return {
      profile: parsed.profile ?? null,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
    };
  } catch {
    return emptyAppState;
  }
}

export function saveAppState(state: AppState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
