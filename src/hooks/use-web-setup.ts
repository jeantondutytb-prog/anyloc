"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_WEB_SETUP_STATE,
  getCurrentWebSetupStep,
  isWebSetupComplete,
  WEB_SETUP_METADATA_KEY,
  WEB_SETUP_STORAGE_KEY,
  writeWebSetupState,
  type WebSetupState,
  type WebSetupStepId,
} from "@/lib/web-setup";

async function readRemoteCompletion() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.user_metadata?.[WEB_SETUP_METADATA_KEY] === true;
  } catch {
    return false;
  }
}

async function persistRemoteCompletion() {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { [WEB_SETUP_METADATA_KEY]: true },
    });
  } catch {
    // Local storage remains the source of truth on this device.
  }
}

const webSetupListeners = new Set<() => void>();

function emitWebSetupChange() {
  for (const listener of webSetupListeners) {
    listener();
  }
}

function subscribeWebSetup(onStoreChange: () => void) {
  webSetupListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    webSetupListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getWebSetupSnapshot() {
  return window.localStorage.getItem(WEB_SETUP_STORAGE_KEY);
}

function getWebSetupServerSnapshot() {
  return null;
}

function persistLocal(next: WebSetupState) {
  writeWebSetupState(next);
  emitWebSetupChange();
}

export function useWebSetup({ preview = false }: { preview?: boolean } = {}) {
  const raw = useSyncExternalStore(
    subscribeWebSetup,
    getWebSetupSnapshot,
    getWebSetupServerSnapshot
  );
  const stored = useMemo((): WebSetupState => {
    if (!raw) {
      return DEFAULT_WEB_SETUP_STATE;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WebSetupState> & {
        steps?: Partial<WebSetupState["steps"]>;
      };
      return {
        completed: parsed.completed === true,
        steps: {
          phone: parsed.steps?.phone === true,
          homescreen: parsed.steps?.homescreen === true,
          shortcut: parsed.steps?.shortcut === true,
          apps: parsed.steps?.apps === true,
        },
      };
    } catch {
      return DEFAULT_WEB_SETUP_STATE;
    }
  }, [raw]);

  const [previewState, setPreviewState] = useState(DEFAULT_WEB_SETUP_STATE);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const hydrated = preview || isClient;
  const state = preview ? previewState : stored;

  useEffect(() => {
    if (preview || stored.completed) {
      return;
    }

    let cancelled = false;

    void readRemoteCompletion().then((completed) => {
      if (!completed || cancelled) {
        return;
      }

      persistLocal({
        completed: true,
        steps: {
          phone: true,
          homescreen: true,
          shortcut: true,
          apps: true,
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [preview, stored.completed]);

  const persist = useCallback((next: WebSetupState) => {
    if (preview) {
      setPreviewState(next);
      return;
    }

    persistLocal(next);
  }, [preview]);

  const completeStep = useCallback((step: WebSetupStepId) => {
    const current = preview ? previewState : stored;
    if (current.steps[step]) {
      return;
    }

    persist({
      ...current,
      steps: {
        ...current.steps,
        [step]: true,
      },
    });
  }, [persist, preview, previewState, stored]);

  const completeSetup = useCallback(() => {
    persist({
      completed: true,
      steps: {
        phone: true,
        homescreen: true,
        shortcut: true,
        apps: true,
      },
    });
    if (!preview) {
      void persistRemoteCompletion();
    }
  }, [persist, preview]);

  const resetSetup = useCallback(() => {
    persist(DEFAULT_WEB_SETUP_STATE);
  }, [persist]);

  const currentStep = useMemo(
    () => getCurrentWebSetupStep(state.steps),
    [state.steps]
  );

  return {
    hydrated,
    state,
    currentStep,
    completeStep,
    completeSetup,
    resetSetup,
    isComplete: isWebSetupComplete(state),
  };
}
