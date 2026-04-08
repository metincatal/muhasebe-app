import { create } from "zustand";

interface UpdateState {
  showUpdate: boolean;
  currentVersion: string | null;
  newVersion: string | null;
  isSameBuild: boolean; // versiyon aynı ama build hash farklı
  setUpdateAvailable: (cv: string | null, nv: string | null) => void;
  dismiss: () => void;
  remindLater: () => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  showUpdate: false,
  currentVersion: null,
  newVersion: null,
  isSameBuild: false,
  setUpdateAvailable: (currentVersion, newVersion) =>
    set({
      showUpdate: true,
      currentVersion,
      newVersion,
      isSameBuild: !!currentVersion && currentVersion === newVersion,
    }),
  dismiss: () => set({ showUpdate: false }),
  remindLater: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "update_snooze_until",
        String(Date.now() + 60 * 60 * 1000) // 1 saat
      );
    }
    set({ showUpdate: false });
  },
}));
