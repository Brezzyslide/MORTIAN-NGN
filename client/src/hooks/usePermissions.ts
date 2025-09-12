import { useAuth } from "./useAuth";

export type UserRole = "console_manager" | "admin" | "team_leader" | "viewer" | "manager" | "user";

// Sprint 5: Role-based permission system with legacy mapping
export function usePermissions() {
  const { user } = useAuth();

  // Map legacy roles to new Sprint 5 role definitions
  const mapLegacyRole = (role?: string): string => {
    if (!role) return "viewer";
    
    const roleMapping: { [key: string]: string } = {
      'manager': 'admin',        // Legacy manager becomes admin
      'user': 'viewer',          // Legacy user becomes viewer
      'admin': 'admin',          // New admin role
      'team_leader': 'team_leader', // Keep team_leader as is
      'viewer': 'viewer',        // New viewer role
      'console_manager': 'console_manager' // Keep console_manager as is
    };
    return roleMapping[role] || role;
  };

  const normalizedRole = mapLegacyRole(user?.role);

  // Permission checking functions
  const permissions = {
    // Full system access
    canManageCompanies: () => normalizedRole === 'console_manager',
    
    // Admin/Manager permissions (full access within tenant)
    canManageUsers: () => normalizedRole === 'admin',
    canCreateProjects: () => normalizedRole === 'admin',
    canEditProjectBudgets: () => normalizedRole === 'admin',
    canManageFundAllocations: () => normalizedRole === 'admin',
    canManageFundTransfers: () => normalizedRole === 'admin',
    canResetUserPasswords: () => normalizedRole === 'admin',
    canUpdateUserRoles: () => normalizedRole === 'admin',
    canUpdateUserStatus: () => normalizedRole === 'admin',
    canImportData: () => normalizedRole === 'admin',
    
    // Team Leader permissions (operational access)
    canCreateCostAllocations: () => ['admin', 'team_leader'].includes(normalizedRole),
    canCreateTransactions: () => ['admin', 'team_leader'].includes(normalizedRole),
    canCreateLineItems: () => ['admin', 'team_leader'].includes(normalizedRole),
    canCreateMaterials: () => ['admin', 'team_leader'].includes(normalizedRole),
    canExportData: () => ['admin', 'team_leader'].includes(normalizedRole),
    
    // Viewer permissions (read-only access)
    canViewDashboard: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canViewAnalytics: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canViewProjects: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canViewTransactions: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canViewAuditLogs: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canViewAllocations: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    
    // Navigation permissions
    canAccessCostEntry: () => ['admin', 'team_leader'].includes(normalizedRole),
    canAccessUserManagement: () => normalizedRole === 'admin',
    canAccessPermissions: () => normalizedRole === 'admin',
    canAccessCompanyManagement: () => normalizedRole === 'console_manager',
  };

  // Helper functions
  const hasRole = (role: UserRole | UserRole[]) => {
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => mapLegacyRole(r) === normalizedRole);
  };

  const hasAnyRole = (roles: UserRole[]) => {
    return roles.some(role => mapLegacyRole(role) === normalizedRole);
  };

  const isAtLeastRole = (minRole: UserRole) => {
    const hierarchy = ['viewer', 'team_leader', 'admin', 'console_manager'];
    const userLevel = hierarchy.indexOf(normalizedRole);
    const minLevel = hierarchy.indexOf(mapLegacyRole(minRole));
    return userLevel >= minLevel;
  };

  return {
    user,
    normalizedRole,
    originalRole: user?.role,
    permissions,
    hasRole,
    hasAnyRole,
    isAtLeastRole,
    
    // Convenience properties
    isConsoleManager: normalizedRole === 'console_manager',
    isAdmin: normalizedRole === 'admin',
    isTeamLeader: normalizedRole === 'team_leader',
    isViewer: normalizedRole === 'viewer',
    
    // Sprint 5: Enhanced permission checking
    canWrite: () => ['admin', 'team_leader'].includes(normalizedRole),
    canRead: () => ['admin', 'team_leader', 'viewer'].includes(normalizedRole),
    canManage: () => ['admin'].includes(normalizedRole),
  };
}

// Protected component wrapper for conditional rendering
interface ProtectedComponentProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

export function ProtectedComponent({ 
  children, 
  requiredRoles, 
  requiredPermission,
  fallback = null 
}: ProtectedComponentProps) {
  const { hasAnyRole, permissions } = usePermissions();

  // Check role-based access
  if (requiredRoles && !hasAnyRole(requiredRoles)) {
    return fallback;
  }

  // Check permission-based access
  if (requiredPermission) {
    const permissionMethod = permissions[requiredPermission as keyof typeof permissions] as () => boolean;
    if (permissionMethod && !permissionMethod()) {
      return fallback;
    }
  }

  return children;
}