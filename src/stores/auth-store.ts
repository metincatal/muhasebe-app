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

export interface Membership {
  orgId: string;
  orgName: string;
  orgType: "individual" | "corporate";
  defaultCurrency: string;
  role: "admin" | "accountant" | "viewer";
}

interface AuthState {
  user: UserProfile | null;
  organization: Organization | null;
  role: "admin" | "accountant" | "viewer" | null;
  memberships: Membership[];
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setOrganization: (org: Organization | null) => void;
  setRole: (role: "admin" | "accountant" | "viewer" | null) => void;
  setMemberships: (memberships: Membership[]) => void;
  setActiveMembership: (orgId: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  organization: null,
  role: null,
  memberships: [],
  isLoading: true,
  setUser: (user) => set({ user }),
  setOrganization: (organization) => set({ organization }),
  setRole: (role) => set({ role }),
  setMemberships: (memberships) => set({ memberships }),
  setActiveMembership: (orgId) => {
    const membership = get().memberships.find((m) => m.orgId === orgId);
    if (!membership) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("lastUsedOrgId", orgId);
    }
    set({
      organization: {
        id: membership.orgId,
        name: membership.orgName,
        type: membership.orgType,
        defaultCurrency: membership.defaultCurrency,
      },
      role: membership.role,
    });
  },
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ user: null, organization: null, role: null, memberships: [], isLoading: false }),
}));
