/**
 * Shared permission types
 * Used by both hooks and config to avoid circular dependencies
 */
export type UserRole = "console_manager" | "admin" | "team_leader" | "viewer" | "manager" | "user";
