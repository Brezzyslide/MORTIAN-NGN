import type { UserRole } from "@/types/permissions";

/**
 * Centralized permission configuration
 * Define which roles can access specific features
 */
export const ROLE_PERMISSIONS = {
  // Fund management permissions
  FUND_ALLOCATION: ['admin', 'team_leader'] as UserRole[],
  FUND_TRANSFERS: ['admin', 'team_leader'] as UserRole[],
  
  // Project management permissions
  PROJECT_CREATION: ['admin'] as UserRole[],
  PROJECT_EDITING: ['admin'] as UserRole[],
  PROJECT_DELETION: ['admin'] as UserRole[],
  
  // Team management permissions
  TEAM_MANAGEMENT: ['admin', 'team_leader'] as UserRole[],
  TEAM_MEMBER_ASSIGNMENT: ['admin', 'team_leader'] as UserRole[],
  
  // Cost and revenue entry
  COST_ENTRY: ['admin', 'team_leader', 'user'] as UserRole[],
  REVENUE_ENTRY: ['admin', 'team_leader', 'user'] as UserRole[],
  
  // Budget amendments and change orders
  BUDGET_AMENDMENTS: ['admin', 'team_leader'] as UserRole[],
  CHANGE_ORDERS: ['admin', 'team_leader'] as UserRole[],
  
  // Approvals
  APPROVAL_ACTIONS: ['admin', 'team_leader'] as UserRole[],
  
  // User management
  USER_MANAGEMENT: ['admin'] as UserRole[],
  
  // Export functionality
  DATA_EXPORT: ['admin', 'team_leader', 'user'] as UserRole[],
  
  // Viewing permissions
  VIEW_ANALYTICS: ['admin', 'team_leader', 'user', 'viewer'] as UserRole[],
  VIEW_AUDIT_LOGS: ['admin', 'team_leader', 'user', 'viewer'] as UserRole[],
  VIEW_TRANSACTIONS: ['admin', 'team_leader', 'user', 'viewer'] as UserRole[],
} as const;

/**
 * Helper function to check if a role has permission for a specific feature
 */
export function hasPermission(userRole: UserRole | undefined, permission: keyof typeof ROLE_PERMISSIONS): boolean {
  if (!userRole) return false;
  return ROLE_PERMISSIONS[permission].includes(userRole);
}

/**
 * Helper function to check if a role matches any in a list
 */
export function hasAnyRole(userRole: UserRole | undefined, roles: UserRole[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}
