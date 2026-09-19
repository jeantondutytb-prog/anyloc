"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  INSTALL_WIZARD_EVENT,
  INSTALL_WIZARD_SESSION_KEY,
  readInstallWizardSession,
  writeInstallWizardSession,
  type InstallWizardSession,
} from "@/lib/dashboard-onboarding";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(INSTALL_WIZARD_EVENT, onStoreChange);
  return () => window.removeEventListener(INSTALL_WIZARD_EVENT, onStoreChange);
}

function getSnapshot() {
  return window.sessionStorage.getItem(INSTALL_WIZARD_SESSION_KEY);
}

export function useInstallWizardSession() {
  useSyncExternalStore(subscribe, getSnapshot, () => null);
  const session = readInstallWizardSession();

  const patch = useCallback((partial: Partial<InstallWizardSession>) => {
    const current = readInstallWizardSession();
    const platform = partial.platform ?? current?.platform;
    if (!platform) {
      return;
    }

    writeInstallWizardSession({
      step: partial.step ?? current?.step ?? 1,
      platform,
      downloaded: partial.downloaded ?? current?.downloaded ?? false,
      passwordGate: partial.passwordGate ?? current?.passwordGate ?? false,
      iosInstallConfirmed:
        partial.iosInstallConfirmed ?? current?.iosInstallConfirmed ?? false,
    });
  }, []);

  return { session, patch };
}
