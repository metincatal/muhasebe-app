import { create } from "zustand";

interface Organization {
  id: string;
  name: string;
  type: "individual" | "corporate";
  defaultCurrency: string;
}

interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  email: string;
}

interface AuthState {
  user: UserProfile | null;
  organization: Organization | null;
  role: "admin" | "accountant" | "viewer" | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void;
  setRole: (role: "admin" | "accountant" | "viewer" | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  role: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  setRole: (role) => set({ role }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, organization: null, role: null, isLoading: false }),
}));
