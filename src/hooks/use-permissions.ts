import { useAuthStore } from "@/stores/auth-store";

export function usePermissions() {
  const role = useAuthStore((s) => s.role);
  return {
    canWrite: role === "admin" || role === "accountant",
    canManageMembers: role === "admin",
    isViewer: role === "viewer",
  };
}
