import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { pdfExportService } from "./pdfExport";
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { 
  insertProjectSchema,
  insertFundAllocationSchema,
  insertTransactionSchema,
  insertFundTransferSchema,
  insertUserSchema,
  insertCompanySchema,
  insertLineItemSchema,
  insertMaterialSchema,
  insertCostAllocationSchema,
  insertMaterialAllocationSchema,
  insertApprovalWorkflowSchema,
  insertBudgetAmendmentSchema,
  insertChangeOrderSchema,
  insertProjectAssignmentSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  loginRequestSchema,
  adminCreateUserSchema,
  changePasswordSchema,
  createCompanyWithAdminSchema,
  companyPasswordChangeSchema,
  users,
  projectAssignments,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { 
  calcMaterialTotal,
  calcTotalCost,
  calcRemainingBudget,
  determineCostAllocationStatus,
  determineInitialCostAllocationStatus,
  calcBudgetVariance,
  calcBudgetImpact,
  generateBudgetAlertMessage,
  BUDGET_THRESHOLDS 
} from "./utils/calculations";
import { z } from "zod";

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to get user and tenantId from authenticated request
async function getUserData(req: any): Promise<{ userId: string; tenantId: string; user: any }> {
  // Handle manual login session
  if (req.user?.manualLogin) {
    // CRITICAL SECURITY FIX: Use systemContext=true during auth flow since we don't know tenantId yet
    const user = await storage.getUser(req.user.userId, '', true);
    if (!user) {
      throw new Error('User not found');
    }
    return { userId: req.user.userId, tenantId: user.companyId, user };
  }
  
  // Handle OIDC login session
  if (req.user?.claims?.sub) {
    const userId = req.user.claims.sub;
    // CRITICAL SECURITY FIX: Use systemContext=true during auth flow since we don't know tenantId yet
    const user = await storage.getUser(userId, '', true);
    if (!user) {
      throw new Error('User not found');
    }
    return { userId, tenantId: user.companyId, user };
  }
  
  throw new Error('No valid authentication found');
}

// Tenant context middleware - normalizes authentication and provides tenant context
function setTenantContext() {
  return async (req: any, res: any, next: any) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      
      // Map legacy roles to new roles for backward compatibility
      const normalizedRole = mapLegacyRole(user.role);
      
      // CRITICAL SECURITY: Set Postgres tenant context for RLS policies
      // This ensures all subsequent queries are automatically filtered by tenant
      await db.execute(sql`SELECT set_config('app.tenant', ${tenantId}, true)`);
      
      // Set tenant context for all subsequent operations
      req.tenant = {
        tenantId,
        role: normalizedRole,
        userId,
        isConsoleManager: normalizedRole === 'console_manager'
      };
      
      // Also attach enhanced user context for backward compatibility
      req.userContext = { 
        userId, 
        tenantId, 
        user,
        normalizedRole
      };
      
      next();
    } catch (error) {
      console.error('Tenant context error:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

// Sprint 5: Enhanced role-based authorization middleware
function authorize(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      // Use tenant context if available, fallback to getUserData
      const userRole = req.tenant?.role || req.userContext?.normalizedRole;
      const userStatus = req.userContext?.user?.status;
      
      if (!userRole) {
        return res.status(401).json({ message: 'Unauthorized - no user context' });
      }
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}` 
        });
      }
      
      // Verify user is active
      if (userStatus !== 'active') {
        return res.status(403).json({ message: 'Access denied. User account is not active.' });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

// Map legacy roles to new Sprint 5 role definitions
function mapLegacyRole(role: string): string {
  const roleMapping: { [key: string]: string } = {
    'manager': 'admin',      // Legacy manager becomes admin
    'user': 'user',          // Keep user as is (now has cost entry access)
    'admin': 'admin',        // New admin role
    'team_leader': 'team_leader', // Keep team_leader as is
    'viewer': 'viewer',      // New viewer role (read-only)
    'console_manager': 'console_manager' // Keep console_manager as is
  };
  return roleMapping[role] || role;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      
      // Handle manual login session
      if (req.user?.manualLogin) {
        // CRITICAL SECURITY FIX: Use systemContext=true during auth route since we don't know tenantId yet
        const user = await storage.getUser(req.user.userId, '', true);
        if (user) {
          return res.status(200).json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.companyId,
            status: user.status,
            mustChangePassword: user.mustChangePassword
          });
        }
      }
      
      // Handle OIDC login session
      if (req.isAuthenticated?.() && req.user?.claims?.sub) {
        // CRITICAL SECURITY FIX: Use systemContext=true during auth route since we don't know tenantId yet
        const user = await storage.getUser(req.user.claims.sub, '', true);
        if (user) {
          return res.status(200).json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.companyId,
            status: user.status,
            profileImageUrl: user.profileImageUrl
          });
        }
      }
      
      return res.status(200).json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Public endpoint to get available companies for login dropdown (sanitized)
  app.get('/api/auth/companies', async (req: any, res) => {
    try {
      // Add security headers and cache control
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      });
      
      // Use the dedicated public companies method that doesn't require authentication
      const companies = await storage.getPublicCompanies();
      
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies for login:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // User login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      // Add security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });

      const loginData = loginRequestSchema.parse(req.body);
      const { email, password } = loginData;

      // Find user by email
      const user = await storage.getUserByEmail(email, '', true);
      
      // Generic error message for security (don't reveal if email exists)
      const invalidCredentialsError = {
        message: "Invalid credentials or account not found"
      };

      if (!user) {
        // Create audit log for failed login attempt
        try {
          await storage.createAuditLog({
            userId: null,
            action: "login_failed_user_not_found",
            entityType: "auth",
            entityId: email,
            projectId: null,
            amount: null,
            tenantId: null,
            details: { 
              email,
              reason: "user_not_found",
              ip: req.ip || req.connection?.remoteAddress || 'unknown'
            },
          }, "system");
        } catch (auditError) {
          console.error("Failed to create audit log for failed login:", auditError);
        }
        
        return res.status(401).json(invalidCredentialsError);
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        try {
          await storage.createAuditLog({
            userId: user.id,
            action: "login_failed_account_locked",
            entityType: "auth",
            entityId: user.id,
            projectId: null,
            amount: null,
            tenantId: user.companyId,
            details: { 
              email,
              reason: "account_locked",
              lockedUntil: user.lockedUntil,
              ip: req.ip || req.connection?.remoteAddress || 'unknown'
            },
          }, user.tenantId);
        } catch (auditError) {
          console.error("Failed to create audit log for locked account:", auditError);
        }
        
        return res.status(423).json({ 
          message: "Account is temporarily locked due to multiple failed login attempts" 
        });
      }

      // Check if user is active
      if (user.status !== 'active') {
        try {
          await storage.createAuditLog({
            userId: user.id,
            action: "login_failed_account_inactive",
            entityType: "auth",
            entityId: user.id,
            projectId: null,
            amount: null,
            tenantId: user.companyId,
            details: { 
              email,
              reason: "account_inactive",
              status: user.status,
              ip: req.ip || req.connection?.remoteAddress || 'unknown'
            },
          }, user.tenantId);
        } catch (auditError) {
          console.error("Failed to create audit log for inactive account:", auditError);
        }
        
        return res.status(403).json({ 
          message: "Account is not active. Please contact your administrator." 
        });
      }

      // Verify password
      if (!user.passwordHash) {
        return res.status(401).json(invalidCredentialsError);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        // Increment failed login count
        await storage.incrementFailedLogins(user.id, user.tenantId);
        
        // Lock account after 5 failed attempts
        const maxFailedAttempts = 5;
        const lockDurationMinutes = 30;
        
        if ((user.failedLoginCount || 0) + 1 >= maxFailedAttempts) {
          const lockUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
          await storage.lockAccount(user.id, lockUntil, user.tenantId);
        }

        try {
          await storage.createAuditLog({
            userId: user.id,
            action: "login_failed_invalid_password",
            entityType: "auth",
            entityId: user.id,
            projectId: null,
            amount: null,
            tenantId: user.companyId,
            details: { 
              email,
              reason: "invalid_password",
              failedLoginCount: (user.failedLoginCount || 0) + 1,
              ip: req.ip || req.connection?.remoteAddress || 'unknown'
            },
          }, user.tenantId);
        } catch (auditError) {
          console.error("Failed to create audit log for invalid password:", auditError);
        }
        
        return res.status(401).json(invalidCredentialsError);
      }

      // Reset failed login count on successful login
      await storage.resetFailedLogins(user.id, user.tenantId);

      // Create audit log for successful login
      try {
        await storage.createAuditLog({
          userId: user.id,
          action: "login_successful",
          entityType: "auth",
          entityId: user.id,
          projectId: null,
          amount: null,
          tenantId: user.tenantId,
          details: { 
            email,
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, user.tenantId);
      } catch (auditError) {
        console.error("Failed to create audit log for successful login:", auditError);
      }

      // Set up user session
      req.user = {
        manualLogin: true,
        userId: user.id,
      };

      // Log the user in by saving session
      req.login(req.user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Failed to establish session" });
        }
        
        // Return success with additional info for password change requirement
        const response: any = { 
          success: true, 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            mustChangePassword: user.mustChangePassword
          }
        };
        
        res.json(response);
      });

    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Password change endpoint
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const passwordData = changePasswordSchema.parse(req.body);
      const { currentPassword, newPassword } = passwordData;

      // Get current user with proper tenant validation
      // CRITICAL SECURITY FIX: Use tenantId to prevent cross-tenant access
      const user = await storage.getUser(userId, tenantId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password with tenant validation
      await storage.setUserPassword(userId, newPasswordHash, tenantId, false);

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: userId,
          action: "password_changed",
          entityType: "auth",
          entityId: userId,
          projectId: null,
          amount: null,
          tenantId: user.tenantId,
          details: { 
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, user.tenantId);
      } catch (auditError) {
        console.error("Failed to create audit log for password change:", auditError);
      }

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Apply tenant context middleware to all authenticated API routes
  app.use('/api', isAuthenticated, setTenantContext());

  // Admin user management endpoints  
  app.post('/api/admin/users', authorize(['admin', 'console_manager']), async (req: any, res) => {
    try {
      const { userId, tenantId, user: currentUser } = await getUserData(req);
      const userData = adminCreateUserSchema.parse(req.body);

      // SECURITY FIX: tenantId is NEVER accepted from client - always use auth context
      const targetTenantId = tenantId; // Users can only be created in their own tenant
      
      // SECURITY: Implement strict role-based creation rules per specification
      const canCreateRole = (creatorRole: string, targetRole: string): boolean => {
        switch (creatorRole) {
          case 'console_manager':
            return ['admin', 'team_leader', 'user', 'viewer'].includes(targetRole);
          case 'admin':
            return ['team_leader', 'user', 'viewer'].includes(targetRole);
          default:
            return false; // Other roles cannot create users
        }
      };
      
      if (!canCreateRole(currentUser.role, userData.role)) {
        return res.status(403).json({ 
          message: `Access denied: Role '${currentUser.role}' cannot create users with role '${userData.role}'` 
        });
      }

      // Validate managerId if provided
      let validatedManagerId = null;
      if (userData.managerId) {
        // Verify manager exists and belongs to same tenant
        const manager = await storage.getUser(userData.managerId, targetTenantId);
        if (!manager) {
          return res.status(400).json({ message: "Manager not found or access denied" });
        }
        
        // Verify manager has appropriate role (team_leader or above)
        const managerRole = mapLegacyRole(manager.role);
        if (!['team_leader', 'admin', 'console_manager'].includes(managerRole)) {
          return res.status(400).json({ 
            message: "Only users with role 'team_leader' or above can be managers" 
          });
        }
        
        // Verify manager is active
        if (manager.status !== 'active') {
          return res.status(400).json({ message: "Cannot assign inactive user as manager" });
        }
        
        validatedManagerId = userData.managerId;
      }

      // Hash temporary password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(userData.temporaryPassword, saltRounds);

      // Create user with password - using companyId instead of tenantId
      const newUser = await storage.createUserWithPassword({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        companyId: targetTenantId, // CRITICAL: Use companyId field
        passwordHash,
        profileImageUrl: null,
        managerId: validatedManagerId,
      }, targetTenantId);

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: userId,
          action: "user_created",
          entityType: "user",
          entityId: newUser.id,
          projectId: null,
          amount: null,
          tenantId: targetTenantId,
          details: { 
            newUserEmail: userData.email,
            newUserRole: userData.role,
            createdBy: `${currentUser.firstName} ${currentUser.lastName}`,
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, targetTenantId);
      } catch (auditError) {
        console.error("Failed to create audit log for user creation:", auditError);
      }

      // Return user without password hash
      const { passwordHash: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505' && 'constraint' in error && typeof error.constraint === 'string' && error.constraint.includes('email')) {
        return res.status(409).json({ message: "Email address already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get('/api/admin/users', authorize(['admin', 'team_leader', 'console_manager']), async (req: any, res) => {
    try {
      const { tenantId, user: currentUser } = await getUserData(req);

      let users;
      if (currentUser.role === 'console_manager') {
        // Console managers can see users from all tenants
        const targetTenantId = req.query.tenantId as string || tenantId;
        users = await storage.getAllUsers(targetTenantId);
      } else {
        // Regular users can only see users in their own tenant
        users = await storage.getAllUsers(tenantId);
      }

      // Filter sensitive information
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
        managerId: user.managerId,
        tenantId: user.tenantId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id', authorize(['admin', 'console_manager']), async (req: any, res) => {
    try {
      const { userId: currentUserId, tenantId, user: currentUser } = await getUserData(req);
      const targetUserId = req.params.id;
      
      const updateSchema = z.object({
        role: z.enum(['admin', 'team_leader', 'user', 'viewer']).optional(),
        status: z.enum(['active', 'inactive', 'pending']).optional(),
        mustChangePassword: z.boolean().optional(),
        resetPassword: z.boolean().optional(),
        newPassword: z.string().min(8).max(255).optional(),
      });

      const updateData = updateSchema.parse(req.body);

      // Get target user to verify tenant access
      // CRITICAL SECURITY FIX: Console managers can access any user, regular admins only their tenant
      let targetUser;
      if (currentUser.role === 'console_manager') {
        // Console managers can access any user using systemContext
        targetUser = await storage.getUser(targetUserId, '', true);
      } else {
        // Regular admins can only access users in their own tenant
        targetUser = await storage.getUser(targetUserId, tenantId);
      }
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Security: Console managers can update any user, regular admins only users in their tenant
      if (currentUser.role !== 'console_manager' && targetUser.tenantId !== tenantId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Prevent users from modifying themselves in certain ways
      if (targetUserId === currentUserId) {
        if (updateData.status === 'inactive') {
          return res.status(400).json({ message: "Cannot deactivate your own account" });
        }
        if (updateData.role && updateData.role !== currentUser.role) {
          return res.status(400).json({ message: "Cannot change your own role" });
        }
      }

      let updatedUser = targetUser;
      const auditDetails: any = { 
        targetUserEmail: targetUser.email,
        updatedBy: `${currentUser.firstName} ${currentUser.lastName}`,
        changes: {},
        ip: req.ip || req.connection?.remoteAddress || 'unknown'
      };

      // Update role
      if (updateData.role && updateData.role !== targetUser.role) {
        updatedUser = await storage.updateUserRole(targetUserId, updateData.role, targetUser.tenantId) || updatedUser;
        auditDetails.changes.role = { from: targetUser.role, to: updateData.role };
      }

      // Update status
      if (updateData.status && updateData.status !== targetUser.status) {
        updatedUser = await storage.updateUserStatus(targetUserId, updateData.status, targetUser.tenantId) || updatedUser;
        auditDetails.changes.status = { from: targetUser.status, to: updateData.status };
      }

      // Update mustChangePassword flag
      if (updateData.mustChangePassword !== undefined && updateData.mustChangePassword !== targetUser.mustChangePassword) {
        updatedUser = await storage.setUserPassword(targetUserId, targetUser.passwordHash!, targetUser.tenantId, updateData.mustChangePassword) || updatedUser;
        auditDetails.changes.mustChangePassword = { from: targetUser.mustChangePassword, to: updateData.mustChangePassword };
      }

      // Reset password if requested
      if (updateData.resetPassword || updateData.newPassword) {
        const newPassword = updateData.newPassword || Math.random().toString(36).slice(-12) + 'A1!';
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        updatedUser = await storage.setUserPassword(targetUserId, passwordHash, targetUser.tenantId, true) || updatedUser;
        auditDetails.changes.passwordReset = true;
        auditDetails.temporaryPassword = updateData.resetPassword ? newPassword : '[provided by admin]';
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: currentUserId,
          action: "user_updated",
          entityType: "user",
          entityId: targetUserId,
          projectId: null,
          amount: null,
          tenantId: targetUser.tenantId,
          details: auditDetails,
        }, targetUser.tenantId);
      } catch (auditError) {
        console.error("Failed to create audit log for user update:", auditError);
      }

      // Return updated user without password hash, include temporary password if reset
      const { passwordHash: _, ...userResponse } = updatedUser;
      const response: any = userResponse;
      
      if (updateData.resetPassword && auditDetails.temporaryPassword && auditDetails.temporaryPassword !== '[provided by admin]') {
        response.temporaryPassword = auditDetails.temporaryPassword;
      }

      res.json(response);
    } catch (error) {
      console.error("User update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Company management routes (for console managers only)
  app.get('/api/companies', authorize(['console_manager']), async (req: any, res) => {
    try {
      const companies = await storage.getCompanies(req.tenant.role);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', authorize(['console_manager']), async (req: any, res) => {
    try {
      const { userId } = req.userContext;

      const requestData = createCompanyWithAdminSchema.parse(req.body);
      const { adminPassword, ...companyData } = requestData;

      // Create the company first
      const company = await storage.createCompany({
        ...companyData,
        createdBy: userId,
      }, req.tenant.tenantId, req.tenant.role);

      // Hash the admin password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

      // Create admin user for the company
      const adminUser = await storage.createUserWithPassword({
        email: companyData.email,
        firstName: 'Company',
        lastName: 'Admin',
        role: 'admin',
        tenantId: company.id,
        passwordHash,
        profileImageUrl: null,
        managerId: null,
      }, company.id);

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: userId,
          action: "company_created",
          entityType: "company",
          entityId: company.id,
          projectId: null,
          amount: null,
          tenantId: null, // Console manager action
          details: { 
            companyName: company.name,
            adminEmail: companyData.email,
            adminUserId: adminUser.id,
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, "system");
      } catch (auditError) {
        console.error("Failed to create audit log for company creation:", auditError);
      }
      
      res.json({ 
        ...company,
        adminUserId: adminUser.id 
      });
    } catch (error) {
      console.error("Error creating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505' && 'constraint' in error && typeof error.constraint === 'string' && error.constraint.includes('email')) {
        return res.status(409).json({ message: "Email address already exists" });
      }
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Update company (PATCH for partial updates)
  app.patch('/api/companies/:id', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const { userId } = req.userContext;
      const companyData = insertCompanySchema.omit({ createdBy: true }).partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, companyData, req.tenant.tenantId, req.tenant.role);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: userId,
          action: "company_updated",
          entityType: "company",
          entityId: company.id,
          projectId: null,
          amount: null,
          tenantId: null, // Console manager action
          details: { 
            companyName: company.name,
            updatedFields: Object.keys(companyData),
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, "system");
      } catch (auditError) {
        console.error("Failed to create audit log for company update:", auditError);
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Change company admin password
  app.post('/api/companies/:id/change-password', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const { userId } = req.userContext;
      const companyId = req.params.id;
      const { newPassword } = companyPasswordChangeSchema.parse(req.body);

      // Verify company exists
      const company = await storage.getCompany(companyId, req.tenant.tenantId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Find the admin user for this company (assuming email matches company email)
      const adminUser = await storage.getUserByEmail(company.email, companyId, true);
      if (!adminUser || adminUser.tenantId !== companyId) {
        return res.status(404).json({ message: "Company admin user not found" });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await storage.setUserPassword(adminUser.id, newPasswordHash, adminUser.tenantId, false);

      // Create audit log
      try {
        await storage.createAuditLog({
          userId: userId,
          action: "company_admin_password_changed",
          entityType: "company",
          entityId: companyId,
          projectId: null,
          amount: null,
          tenantId: null, // Console manager action
          details: { 
            companyName: company.name,
            adminEmail: company.email,
            adminUserId: adminUser.id,
            ip: req.ip || req.connection?.remoteAddress || 'unknown'
          },
        }, "system");
      } catch (auditError) {
        console.error("Failed to create audit log for company password change:", auditError);
      }

      res.json({ success: true, message: "Company admin password changed successfully" });
    } catch (error) {
      console.error("Company password change error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid password data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to change company admin password" });
    }
  });

  // Keep PUT for backward compatibility
  app.put('/api/companies/:id', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, companyData, req.tenant.tenantId, req.tenant.role);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const projects = await storage.getProjects(tenantId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId } = await getUserData(req);
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Project-specific analytics endpoint with role-based filtering
  app.get('/api/projects/:id/analytics', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId, userId, role } = req.tenant;
      const normalizedRole = role;
      
      // Check if user can access this project based on role and assignments
      const canAccess = await storage.canUserAccessProject(userId, projectId, tenantId, normalizedRole);
      if (!canAccess) {
        return res.status(403).json({ 
          message: "Access denied. You don't have permission to view analytics for this project." 
        });
      }
      
      // Get project analytics
      const analytics = await storage.getProjectAnalytics(projectId, tenantId);
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching project analytics:", error);
      if (error instanceof Error && error.message === 'Project not found') {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(500).json({ message: "Failed to fetch project analytics" });
    }
  });

  app.post('/api/projects', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const projectData = insertProjectSchema.parse({
        ...req.body,
        managerId: userId,
        tenantId,
      });

      const project = await storage.createProject(projectData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "project_created",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        amount: projectData.budget,
        tenantId,
        details: { title: project.title },
      }, tenantId);

      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Project assignment routes
  app.get('/api/projects/:projectId/team-leaders', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { tenantId } = req.tenant;
      
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format" });
      }
      
      // CRITICAL SECURITY: Verify project belongs to requesting tenant
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Get team leaders assigned to this specific project, filtered by tenant/role/status
      const teamLeaders = await storage.getAssignedTeamLeadersByProject(projectId, tenantId);
      res.json(teamLeaders);
    } catch (error) {
      console.error("Error fetching assigned team leaders:", error);
      res.status(500).json({ message: "Failed to fetch assigned team leaders" });
    }
  });

  app.get('/api/project-assignments', isAuthenticated, setTenantContext(), authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = req.tenant;
      const assignments = await storage.getProjectAssignments(tenantId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching project assignments:", error);
      res.status(500).json({ message: "Failed to fetch project assignments" });
    }
  });

  app.get('/api/project-assignments/:projectId', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { tenantId } = req.tenant;
      
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format" });
      }
      
      // CRITICAL SECURITY: Verify project belongs to requesting tenant
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const assignments = await storage.getProjectAssignmentsByProject(projectId, tenantId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching project assignments:", error);
      res.status(500).json({ message: "Failed to fetch project assignments" });
    }
  });

  app.post('/api/project-assignments', isAuthenticated, setTenantContext(), authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = req.tenant;
      
      const assignmentData = insertProjectAssignmentSchema.parse({
        ...req.body,
        assignedBy: userId,
        tenantId,
      });

      // CRITICAL SECURITY: Verify project belongs to requesting tenant before assignment
      const project = await storage.getProject(assignmentData.projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // CRITICAL SECURITY: Verify target user belongs to requesting tenant
      const targetUser = await storage.getUser(assignmentData.userId, tenantId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found or access denied" });
      }

      // Verify target user is a team leader and active
      if (targetUser.role !== 'team_leader') {
        return res.status(400).json({ message: "Only team leaders can be assigned to projects" });
      }
      if (targetUser.status !== 'active') {
        return res.status(400).json({ message: "Cannot assign inactive user to project" });
      }

      // Check if assignment already exists
      const existingAssignments = await storage.getProjectAssignmentsByProject(assignmentData.projectId, tenantId);
      const existingAssignment = existingAssignments.find(a => a.userId === assignmentData.userId);
      
      if (existingAssignment) {
        return res.status(400).json({ message: "User is already assigned to this project" });
      }

      const assignment = await storage.createProjectAssignment(assignmentData, tenantId);
      
      // Create comprehensive audit log
      await storage.createAuditLog({
        userId,
        action: "project_assignment_created",
        entityType: "project_assignment",
        entityId: assignment.id,
        projectId: assignment.projectId,
        tenantId,
        details: { 
          assignedUser: assignment.userId,
          assignedUserName: `${targetUser.firstName} ${targetUser.lastName}` || targetUser.email,
          projectTitle: project.title 
        },
      }, tenantId);

      res.json(assignment);
    } catch (error) {
      console.error("Error creating project assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project assignment" });
    }
  });

  app.delete('/api/project-assignments/:projectId/:userId', isAuthenticated, setTenantContext(), authorize(['admin']), async (req: any, res) => {
    try {
      const { userId: currentUserId, tenantId } = req.tenant;
      const { projectId, userId } = req.params;
      
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format" });
      }
      
      // Note: userId parameter can be varchar (user IDs) so don't validate as UUID
      if (!userId || userId.trim() === '') {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // CRITICAL SECURITY: Verify project belongs to requesting tenant
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // CRITICAL SECURITY: Verify user belongs to requesting tenant
      const targetUser = await storage.getUser(userId, tenantId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found or access denied" });
      }
      
      const success = await storage.deleteProjectAssignment(projectId, userId, tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "Project assignment not found" });
      }
      
      // Create comprehensive audit log
      await storage.createAuditLog({
        userId: currentUserId,
        action: "project_assignment_removed",
        entityType: "project_assignment",
        entityId: `${projectId}-${userId}`,
        projectId,
        tenantId,
        details: { 
          removedUser: userId,
          removedUserName: `${targetUser.firstName} ${targetUser.lastName}` || targetUser.email,
          projectTitle: project.title 
        },
      }, tenantId);

      res.json({ success: true, message: "Project assignment removed successfully" });
    } catch (error) {
      console.error("Error removing project assignment:", error);
      res.status(500).json({ message: "Failed to remove project assignment" });
    }
  });

  // Team hierarchy endpoint
  app.get('/api/projects/:id/team-hierarchy', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { id: projectId } = req.params;
      const { tenantId } = req.tenant;
      
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format" });
      }
      
      // CRITICAL SECURITY: Verify project belongs to requesting tenant
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // AUTHORIZATION FIX: If user is team_leader, verify they're assigned to this project
      if (req.tenant.role === 'team_leader') {
        const userAssignment = await db.select().from(projectAssignments)
          .where(and(
            eq(projectAssignments.projectId, projectId),
            eq(projectAssignments.userId, req.tenant.userId),
            eq(projectAssignments.tenantId, tenantId)
          ));
        
        if (userAssignment.length === 0) {
          return res.status(403).json({ message: "Access denied: not assigned to this project" });
        }
      }
      
      // Get all team leaders assigned to this project
      const leaders = await db.select().from(projectAssignments)
        .innerJoin(users, eq(users.id, projectAssignments.userId))
        .where(and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.tenantId, tenantId),
          eq(users.role, 'team_leader')
        ));

      // FUNCTIONAL FIX: For each team leader, find their subordinates that are also assigned to this project
      const hierarchy = await Promise.all(leaders.map(async (leader) => {
        const members = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            managerId: users.managerId,
            companyId: users.companyId,
            status: users.status
          })
          .from(projectAssignments)
          .innerJoin(users, eq(users.id, projectAssignments.userId))
          .where(and(
            eq(projectAssignments.projectId, projectId),
            eq(projectAssignments.tenantId, tenantId),
            eq(users.managerId, leader.users.id),
            eq(users.status, 'active')
          ));

        return {
          teamLeader: leader.users,
          members
        };
      }));

      res.json(hierarchy);
    } catch (error) {
      console.error("Error fetching team hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch team hierarchy" });
    }
  });

  // Fund allocation routes
  app.get('/api/fund-allocations', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const allocations = await storage.getFundAllocations(tenantId);
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching fund allocations:", error);
      res.status(500).json({ message: "Failed to fetch fund allocations" });
    }
  });

  app.post('/api/fund-allocations', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const allocationData = insertFundAllocationSchema.parse({
        ...req.body,
        fromUserId: userId,
        tenantId,
      });

      // CRITICAL FIX: Use atomic transaction-wrapped method to prevent race conditions,
      // precision errors, and ensure data consistency. This replaces the problematic
      // read-modify-write pattern with atomic SQL operations.
      const result = await storage.createFundAllocationWithBudgetUpdate(
        allocationData,
        {
          projectId: allocationData.projectId,
          userId: allocationData.toUserId,
          type: "allocation",
          amount: allocationData.amount,
          category: allocationData.category,
          description: allocationData.description || "Fund allocation",
          tenantId,
        },
        {
          userId,
          action: "fund_allocated",
          entityType: "fund_allocation",
          entityId: "", // Will be set to allocation.id in the atomic method
          projectId: allocationData.projectId,
          tenantId,
          details: { category: allocationData.category, toUser: allocationData.toUserId },
        },
        tenantId
      );

      res.json(result.allocation);
    } catch (error) {
      console.error("Error creating fund allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund allocation" });
    }
  });

  // Transaction routes (read access for all authenticated users with role-based filtering)
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      
      // Role-based filtering: 
      // - Admins see all tenant transactions
      // - Team leaders see only transactions allocated to them
      const transactions = await storage.getTransactions(tenantId, user.role === 'admin' ? undefined : userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId,
        tenantId,
      });

      const transaction = await storage.createTransaction(transactionData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "expense_submitted",
        entityType: "transaction",
        entityId: transaction.id,
        projectId: transaction.projectId,
        amount: transaction.amount,
        tenantId,
        details: { type: transaction.type, category: transaction.category },
      }, tenantId);

      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Fund transfer routes
  app.get('/api/fund-transfers', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const transfers = await storage.getFundTransfers(tenantId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching fund transfers:", error);
      res.status(500).json({ message: "Failed to fetch fund transfers" });
    }
  });

  app.post('/api/fund-transfers', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const transferData = insertFundTransferSchema.parse({
        ...req.body,
        fromUserId: userId,
        tenantId,
      });

      const transfer = await storage.createFundTransfer(transferData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "fund_transferred",
        entityType: "fund_transfer",
        entityId: transfer.id,
        projectId: transfer.projectId,
        amount: transfer.amount,
        tenantId,
        details: { fromUser: transfer.fromUserId, toUser: transfer.toUserId },
      }, tenantId);

      res.json(transfer);
    } catch (error) {
      console.error("Error creating fund transfer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transfer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund transfer" });
    }
  });

  // Analytics routes (read access for all authenticated users)
  app.get('/api/analytics/tenant', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const stats = await storage.getTenantStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching tenant stats:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/analytics/project/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId } = await getUserData(req);
      const stats = await storage.getProjectStats(projectId, tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ message: "Failed to fetch project analytics" });
    }
  });

  // New analytics endpoints for Sprint 4
  app.get('/api/analytics/budget-summary', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, user } = await getUserData(req);
      const normalizedRole = mapLegacyRole(user.role);
      const budgetSummary = await storage.getBudgetSummary(tenantId, normalizedRole, user.id);
      res.json(budgetSummary);
    } catch (error) {
      console.error("Error fetching budget summary:", error);
      res.status(500).json({ message: "Failed to fetch budget summary" });
    }
  });

  app.get('/api/analytics/labour-material-split', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { startDate, endDate, projectId, categories } = req.query;
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (projectId) filters.projectId = projectId as string;
      if (categories) {
        filters.categories = Array.isArray(categories) ? categories : [categories];
      }

      const normalizedRole = mapLegacyRole(req.userContext.user.role);
      const splitData = await storage.getLabourMaterialSplit(tenantId, filters, normalizedRole, req.userContext.userId);
      res.json(splitData);
    } catch (error) {
      console.error("Error fetching labour-material split:", error);
      res.status(500).json({ message: "Failed to fetch labour-material split" });
    }
  });

  app.get('/api/analytics/category-spending', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId, user } = await getUserData(req);
      const { startDate, endDate, projectId, categories } = req.query;
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (projectId) filters.projectId = projectId as string;
      if (categories) {
        filters.categories = Array.isArray(categories) ? categories : [categories];
      }

      const normalizedRole = mapLegacyRole(user.role);
      const categoryData = await storage.getCategorySpending(tenantId, filters, normalizedRole, user.id);
      res.json(categoryData);
    } catch (error) {
      console.error("Error fetching category spending:", error);
      res.status(500).json({ message: "Failed to fetch category spending" });
    }
  });

  app.get('/api/cost-allocations-filtered', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { 
        startDate, 
        endDate, 
        projectId, 
        changeOrderId,
        categories, 
        search, 
        page = 1, 
        limit = 10 
      } = req.query;
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (projectId) filters.projectId = projectId as string;
      if (changeOrderId) filters.changeOrderId = changeOrderId as string;
      if (categories) {
        filters.categories = Array.isArray(categories) ? categories : [categories];
      }
      if (search) filters.search = search as string;
      
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      filters.limit = limitNum;
      filters.offset = (pageNum - 1) * limitNum;

      const result = await storage.getCostAllocationsWithFilters(tenantId, filters);
      res.json({
        ...result,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.total / limitNum),
      });
    } catch (error) {
      console.error("Error fetching filtered cost allocations:", error);
      res.status(500).json({ message: "Failed to fetch cost allocations" });
    }
  });

  // Audit log routes
  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const logs = await storage.getAuditLogs(tenantId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // User hierarchy routes - Updated to support fetching subordinates by team leader ID
  app.get('/api/users/subordinates/:teamLeaderId', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { teamLeaderId } = req.params;
      
      if (!teamLeaderId || !isValidUUID(teamLeaderId)) {
        return res.status(400).json({ message: "Valid team leader ID is required" });
      }
      
      const subordinates = await storage.getSubordinates(teamLeaderId, tenantId);
      res.json(subordinates);
    } catch (error) {
      console.error("Error fetching subordinates:", error);
      res.status(500).json({ message: "Failed to fetch subordinates" });
    }
  });

  // Backwards compatibility: Get subordinates for current user
  app.get('/api/users/subordinates', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId: managerId, tenantId } = await getUserData(req);
      const subordinates = await storage.getSubordinates(managerId, tenantId);
      res.json(subordinates);
    } catch (error) {
      console.error("Error fetching subordinates:", error);
      res.status(500).json({ message: "Failed to fetch subordinates" });
    }
  });

  app.get('/api/users/team-leaders', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const teamLeaders = await storage.getUsersByRole("team_leader", tenantId);
      res.json(teamLeaders);
    } catch (error) {
      console.error("Error fetching team leaders:", error);
      res.status(500).json({ message: "Failed to fetch team leaders" });
    }
  });

  app.get('/api/users/team-leaders-with-hierarchy', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const teamLeadersWithHierarchy = await storage.getTeamLeadersWithHierarchy(tenantId);
      res.json(teamLeadersWithHierarchy);
    } catch (error) {
      console.error("Error fetching team leaders with hierarchy:", error);
      res.status(500).json({ message: "Failed to fetch team leaders with hierarchy" });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const users = await storage.getAllUsers(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      
      const userData = insertUserSchema.parse({
        ...req.body,
        tenantId,
      });

      const user = await storage.upsertUser(userData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_created",
        entityType: "user",
        entityId: user.id,
        tenantId,
        details: { email: user.email, role: user.role },
      }, tenantId);

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { role } = req.body;
      
      if (!['admin', 'team_leader', 'viewer'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Valid roles: admin, team_leader, viewer" });
      }

      const user = await storage.updateUserRole(req.params.id, role, tenantId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_role_updated",
        entityType: "user",
        entityId: user.id,
        tenantId,
        details: { newRole: role, email: user.email },
      }, tenantId);

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/status', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { status } = req.body;
      
      if (!['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUserStatus(req.params.id, status, tenantId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_status_updated",
        entityType: "user",
        entityId: user.id,
        tenantId,
        details: { newStatus: status, email: user.email },
      }, tenantId);

      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.post('/api/users/:id/reset-password', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      const userToReset = await storage.getUserById(req.params.id, tenantId);
      
      if (!userToReset) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // In a real system, this would trigger an email with password reset link
      // For this demo, we'll create an audit log entry
      await storage.createAuditLog({
        userId,
        action: "user_updated",
        entityType: "user",
        entityId: userToReset.id,
        tenantId,
        details: { 
          targetUserEmail: userToReset.email,
          resetRequestedBy: userId,
          resetMethod: "admin_requested"
        },
      }, tenantId);

      res.json({ 
        message: "Password reset initiated", 
        user: { 
          id: userToReset.id, 
          email: userToReset.email,
          firstName: userToReset.firstName,
          lastName: userToReset.lastName
        }
      });
    } catch (error) {
      console.error("Error initiating password reset:", error);
      res.status(500).json({ message: "Failed to initiate password reset" });
    }
  });

  // Object storage routes for receipts
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req as any).user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/receipts", isAuthenticated, async (req, res) => {
    if (!req.body.receiptURL) {
      return res.status(400).json({ error: "receiptURL is required" });
    }

    const userId = (req as any).user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.receiptURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting receipt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Line items routes
  app.get('/api/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const lineItems = await storage.getLineItems(tenantId);
      
      // Group by category for better organization
      const groupedItems = lineItems.reduce((groups: any, item) => {
        const category = item.category;
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category
        });
        return groups;
      }, {});
      
      res.json(groupedItems);
    } catch (error) {
      console.error("Error fetching line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  // Materials routes
  app.get('/api/materials', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const materials = await storage.getMaterials(tenantId);
      
      // Return materials with current pricing info
      const materialsWithPricing = materials.map(material => ({
        id: material.id,
        name: material.name,
        unit: material.unit,
        currentUnitPrice: parseFloat(material.currentUnitPrice),
        supplier: material.supplier
      }));
      
      res.json(materialsWithPricing);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  // Cost allocations routes
  app.post('/api/cost-allocations', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const { projectId, lineItemId, labourCost = 0, quantity, unitCost, materialAllocations = [], dateIncurred } = req.body;
      
      // Validation: Require at least one material OR labour entry
      if (labourCost <= 0 && materialAllocations.length === 0) {
        return res.status(400).json({ 
          message: "At least one material entry OR labour cost > 0 is required" 
        });
      }
      
      // Get project to check budget
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Calculate material total using helper function
      const materialTotal = calcMaterialTotal(materialAllocations.map((allocation: any) => ({
        unit_price: allocation.unitPrice,
        quantity: allocation.quantity
      })));
      
      // Calculate total cost using helper function
      const labourInfo = { unit_price: unitCost || 0, quantity: quantity || 0 };
      const totalCost = calcTotalCost(labourInfo, materialTotal);
      
      // Enhanced budget impact validation using new calculations
      const totalBudget = parseFloat(project.budget);
      const currentSpent = parseFloat(project.consumedAmount);
      
      // Calculate current budget impact and what the new impact would be
      const budgetImpact = calcBudgetImpact(currentSpent, totalCost, totalBudget);
      
      // Determine initial status based on budget thresholds
      let initialStatus: 'draft' | 'pending' = 'draft';
      let requiresApproval = false;
      let budgetValidationMessage = `Budget impact: ${budgetImpact.newSpentPercentage.toFixed(1)}% of total budget`;
      
      if (budgetImpact.willExceedCritical) {
        initialStatus = 'pending';
        requiresApproval = true;
        budgetValidationMessage = `CRITICAL: This allocation would bring spending to ${budgetImpact.newSpentPercentage.toFixed(1)}% (>${BUDGET_THRESHOLDS.CRITICAL_THRESHOLD}%). Manager approval required.`;
      } else if (budgetImpact.willExceedWarning) {
        initialStatus = 'pending';
        requiresApproval = true;
        budgetValidationMessage = `WARNING: This allocation would bring spending to ${budgetImpact.newSpentPercentage.toFixed(1)}% (>${BUDGET_THRESHOLDS.WARNING_THRESHOLD}%). Manager approval required.`;
      }
      
      // Legacy support for existing budget validation logic
      const budgetInfo = {
        status: initialStatus,
        exceedsBudget: budgetImpact.isOverBudget,
        budgetValidation: budgetValidationMessage,
        budgetImpact: budgetImpact
      };
      
      // Prepare cost allocation data
      const costAllocationData = insertCostAllocationSchema.parse({
        projectId,
        lineItemId,
        labourCost: labourCost.toString(),
        materialCost: materialTotal.toString(),
        quantity: quantity?.toString() || "0",
        unitCost: unitCost?.toString(),
        totalCost: totalCost.toString(),
        dateIncurred: dateIncurred ? new Date(dateIncurred) : new Date(),
        enteredBy: userId,
        tenantId,
        status: budgetInfo.status
      });
      
      // Prepare material allocations data
      const materialAllocationsData = materialAllocations.map((allocation: any) => 
        insertMaterialAllocationSchema.parse({
          materialId: allocation.materialId,
          quantity: allocation.quantity.toString(),
          unitPrice: allocation.unitPrice.toString(),
          total: (allocation.quantity * allocation.unitPrice).toString(),
          tenantId
        })
      );
      
      // Create cost allocation with material allocations
      const costAllocation = await storage.createCostAllocation(costAllocationData, materialAllocationsData, tenantId);
      
      // Check and create budget alerts if thresholds are crossed
      try {
        const createdAlerts = await storage.checkAndCreateBudgetAlerts(projectId, tenantId);
        if (createdAlerts.length > 0) {
          console.log(`Created ${createdAlerts.length} budget alert(s) for project ${project.title}`);
        }
      } catch (alertError) {
        console.error('Error creating budget alerts:', alertError);
        // Don't fail the cost allocation creation if alert creation fails
      }
      
      // Note: Project consumed amount is only updated when cost allocation is approved through workflow
      // This ensures proper approval controls for budget management
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "cost_allocated",
        entityType: "cost_allocation",
        entityId: costAllocation.id,
        projectId: costAllocation.projectId,
        amount: totalCost.toString(),
        tenantId,
        details: { 
          lineItemId: costAllocation.lineItemId,
          labourCost,
          materialCost: materialTotal,
          status: costAllocation.status,
          exceedsBudget: budgetInfo.exceedsBudget,
          budgetValidation: budgetInfo.budgetValidation,
          budgetImpact: {
            spentPercentage: budgetImpact.newSpentPercentage,
            remainingBudget: budgetImpact.remainingBudget,
            status: budgetImpact.status,
            requiresApproval: requiresApproval
          }
        },
      }, tenantId);
      
      res.json({
        costAllocation,
        remainingBudget: calcRemainingBudget(parseFloat(project.budget), parseFloat(project.consumedAmount)),
        budgetValidation: budgetInfo.budgetValidation,
        exceedsBudget: budgetInfo.exceedsBudget
      });
    } catch (error) {
      console.error("Error creating cost allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid cost allocation data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to create cost allocation" });
    }
  });

  app.get('/api/cost-allocations/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.projectId;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId } = await getUserData(req);
      
      // Verify project access
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get cost allocations with material details (ledger view)
      const costAllocations = await storage.getCostAllocationsByProject(projectId, tenantId);
      
      // Format response for ledger view
      const ledgerData = costAllocations.map(allocation => ({
        id: allocation.id,
        lineItem: {
          id: allocation.lineItemId,
          // Note: lineItem details would need to be joined in storage method
          // For now, we'll include the ID and let frontend resolve
        },
        labourCost: parseFloat(allocation.labourCost),
        materialCost: parseFloat(allocation.materialCost),
        totalCost: parseFloat(allocation.totalCost),
        quantity: parseFloat(allocation.quantity),
        unitCost: allocation.unitCost ? parseFloat(allocation.unitCost) : null,
        dateIncurred: allocation.dateIncurred,
        status: allocation.status,
        materialAllocations: allocation.materialAllocations.map(matAlloc => ({
          id: matAlloc.id,
          material: {
            id: matAlloc.material.id,
            name: matAlloc.material.name,
            unit: matAlloc.material.unit,
            currentUnitPrice: parseFloat(matAlloc.material.currentUnitPrice),
            supplier: matAlloc.material.supplier
          },
          quantity: parseFloat(matAlloc.quantity),
          unitPrice: parseFloat(matAlloc.unitPrice),
          total: parseFloat(matAlloc.total)
        }))
      }));
      
      res.json(ledgerData);
    } catch (error) {
      console.error("Error fetching cost allocations:", error);
      res.status(500).json({ message: "Failed to fetch cost allocations" });
    }
  });

  // Approval workflow routes
  app.get('/api/approvals', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const table = req.query.table as string;
      
      const pendingApprovals = await storage.getPendingApprovals(tenantId, table === 'cost_allocations' ? 'cost_allocations' : undefined);
      
      res.json(pendingApprovals);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });

  app.post('/api/approvals/:id/approve', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const recordId = req.params.id;
      const { comments } = req.body;
      
      // First get the current cost allocation to validate state
      const currentAllocations = await storage.getCostAllocations(tenantId);
      const allocation = currentAllocations.find(a => a.id === recordId);
      
      if (!allocation) {
        return res.status(404).json({ message: "Cost allocation not found" });
      }
      
      // Enforce state validation: only pending items can be approved
      if (allocation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot approve cost allocation. Current status is '${allocation.status}', but only 'pending' items can be approved.` 
        });
      }
      
      // Update approval workflow status
      const updatedWorkflow = await storage.updateApprovalWorkflowStatus(recordId, 'approved', userId, comments, tenantId);
      
      if (!updatedWorkflow) {
        return res.status(404).json({ message: "Approval workflow not found" });
      }
      
      // Update cost allocation status to approved
      const updatedCostAllocation = await storage.updateCostAllocationStatus(recordId, 'approved', tenantId);
      
      if (!updatedCostAllocation) {
        return res.status(404).json({ message: "Failed to update cost allocation status" });
      }
      
      // Update project consumed amount for approved cost allocations
      if (updatedCostAllocation.status === 'approved') {
        const project = await storage.getProject(updatedCostAllocation.projectId, tenantId);
        if (project) {
          const newConsumedAmount = parseFloat(project.consumedAmount) + parseFloat(updatedCostAllocation.totalCost);
          await storage.updateProject(updatedCostAllocation.projectId, {
            consumedAmount: newConsumedAmount.toString()
          }, tenantId);
        }
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "approval_workflow_updated",
        entityType: "cost_allocation",
        entityId: recordId,
        projectId: updatedCostAllocation.projectId,
        amount: updatedCostAllocation.totalCost,
        tenantId,
        details: { 
          status: 'approved', 
          approverId: userId,
          comments: comments || null
        },
      }, tenantId);
      
      res.json({ 
        message: "Cost allocation approved successfully", 
        costAllocation: updatedCostAllocation,
        workflow: updatedWorkflow
      });
    } catch (error) {
      console.error("Error approving cost allocation:", error);
      res.status(500).json({ message: "Failed to approve cost allocation" });
    }
  });

  app.post('/api/approvals/:id/reject', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const recordId = req.params.id;
      const { comments } = req.body;
      
      if (!comments || comments.trim() === '') {
        return res.status(400).json({ message: "Rejection comments are required" });
      }
      
      // First get the current cost allocation to validate state
      const currentAllocations = await storage.getCostAllocations(tenantId);
      const allocation = currentAllocations.find(a => a.id === recordId);
      
      if (!allocation) {
        return res.status(404).json({ message: "Cost allocation not found" });
      }
      
      // Enforce state validation: only pending items can be rejected
      if (allocation.status !== 'pending') {
        return res.status(400).json({ 
          message: `Cannot reject cost allocation. Current status is '${allocation.status}', but only 'pending' items can be rejected.` 
        });
      }
      
      // Update approval workflow status
      const updatedWorkflow = await storage.updateApprovalWorkflowStatus(recordId, 'rejected', userId, comments, tenantId);
      
      if (!updatedWorkflow) {
        return res.status(404).json({ message: "Approval workflow not found" });
      }
      
      // Update cost allocation status to rejected
      const updatedCostAllocation = await storage.updateCostAllocationStatus(recordId, 'rejected', tenantId);
      
      if (!updatedCostAllocation) {
        return res.status(404).json({ message: "Failed to update cost allocation status" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "approval_workflow_updated",
        entityType: "cost_allocation",
        entityId: recordId,
        projectId: updatedCostAllocation.projectId,
        amount: updatedCostAllocation.totalCost,
        tenantId,
        details: { 
          status: 'rejected', 
          approverId: userId,
          comments: comments
        },
      }, tenantId);
      
      res.json({ 
        message: "Cost allocation rejected successfully", 
        costAllocation: updatedCostAllocation,
        workflow: updatedWorkflow
      });
    } catch (error) {
      console.error("Error rejecting cost allocation:", error);
      res.status(500).json({ message: "Failed to reject cost allocation" });
    }
  });

  app.post('/api/approvals/:id/submit', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const recordId = req.params.id;
      
      // First get the current cost allocation to validate state
      const currentAllocation = await storage.getCostAllocations(tenantId);
      const allocation = currentAllocation.find(a => a.id === recordId);
      
      if (!allocation) {
        return res.status(404).json({ message: "Cost allocation not found" });
      }
      
      // Enforce state validation: only draft items can be submitted
      if (allocation.status !== 'draft') {
        return res.status(400).json({ 
          message: `Cannot submit cost allocation. Current status is '${allocation.status}', but only 'draft' items can be submitted.` 
        });
      }
      
      // Update cost allocation status to pending
      const updatedCostAllocation = await storage.updateCostAllocationStatus(recordId, 'pending', tenantId);
      
      if (!updatedCostAllocation) {
        return res.status(404).json({ message: "Failed to update cost allocation status" });
      }
      
      // Create approval workflow record
      const workflowData = insertApprovalWorkflowSchema.parse({
        relatedTable: 'cost_allocations',
        recordId: recordId,
        status: 'pending',
        tenantId,
      });
      
      const workflow = await storage.createApprovalWorkflow(workflowData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "approval_workflow_updated",
        entityType: "cost_allocation",
        entityId: recordId,
        projectId: updatedCostAllocation.projectId,
        amount: updatedCostAllocation.totalCost,
        tenantId,
        details: { 
          status: 'pending',
          submittedBy: userId
        },
      }, tenantId);
      
      res.json({ 
        message: "Cost allocation submitted for approval", 
        costAllocation: updatedCostAllocation,
        workflow: workflow
      });
    } catch (error) {
      console.error("Error submitting cost allocation for approval:", error);
      res.status(500).json({ message: "Failed to submit cost allocation for approval" });
    }
  });

  // Cost allocation submit route (clearer endpoint)
  app.post('/api/cost-allocations/:id/submit', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const recordId = req.params.id;
      
      // First get the current cost allocation to validate state
      const currentAllocations = await storage.getCostAllocations(tenantId);
      const allocation = currentAllocations.find(a => a.id === recordId);
      
      if (!allocation) {
        return res.status(404).json({ message: "Cost allocation not found" });
      }
      
      // Enforce state validation: only draft items can be submitted
      if (allocation.status !== 'draft') {
        return res.status(400).json({ 
          message: `Cannot submit cost allocation. Current status is '${allocation.status}', but only 'draft' items can be submitted.` 
        });
      }
      
      // Update cost allocation status to pending
      const updatedCostAllocation = await storage.updateCostAllocationStatus(recordId, 'pending', tenantId);
      
      if (!updatedCostAllocation) {
        return res.status(404).json({ message: "Failed to update cost allocation status" });
      }
      
      // Create approval workflow record
      const workflowData = insertApprovalWorkflowSchema.parse({
        relatedTable: 'cost_allocations',
        recordId: recordId,
        status: 'pending',
        tenantId,
      });
      
      const workflow = await storage.createApprovalWorkflow(workflowData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "cost_allocation_submitted",
        entityType: "cost_allocation",
        entityId: recordId,
        projectId: updatedCostAllocation.projectId,
        amount: updatedCostAllocation.totalCost,
        tenantId,
        details: { 
          status: 'pending',
          submittedBy: userId,
          previousStatus: 'draft'
        },
      }, tenantId);
      
      res.json({ 
        message: "Cost allocation submitted for approval successfully", 
        costAllocation: updatedCostAllocation,
        workflow: workflow
      });
    } catch (error) {
      console.error("Error submitting cost allocation for approval:", error);
      res.status(500).json({ message: "Failed to submit cost allocation for approval" });
    }
  });

  // PDF Export routes
  app.get('/api/export/project/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId } = await getUserData(req);
      const pdfBuffer = await pdfExportService.generateProjectSummary(projectId, tenantId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="project-${req.params.id}-summary.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating project PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  app.get('/api/export/user-spend/:userId/pdf', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const pdfBuffer = await pdfExportService.generateUserSpendReport(req.params.userId, tenantId, startDate, endDate);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="user-${req.params.userId}-spend-report.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating user spend PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  app.get('/api/export/profit-statement/pdf', isAuthenticated, authorize(['manager']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const pdfBuffer = await pdfExportService.generateProfitStatement(tenantId, startDate, endDate);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="profit-statement.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating profit statement PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // CSV Import/Export routes
  app.post('/api/import/transactions/csv', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      const csvData = req.body.csvData;
      
      if (!csvData) {
        return res.status(400).json({ message: 'CSV data is required' });
      }

      // Parse CSV data
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const results = { success: 0, errors: [] as any[] };

      for (let index = 0; index < records.length; index++) {
        const record = records[index] as any;
        try {
          // Strict amount validation using regex pattern for financial data
          const amountRegex = /^-?\d+(\.\d{1,2})?$/;
          if (!record.amount || !amountRegex.test(record.amount.toString().trim())) {
            throw new Error('Invalid amount format - must be a number with max 2 decimal places (e.g., 123.45)');
          }
          const amount = parseFloat(record.amount);
          if (amount === 0) {
            throw new Error('Amount cannot be zero');
          }

          // Validate projectId exists within tenant
          const project = await storage.getProject(record.projectId, tenantId);
          if (!project) {
            throw new Error(`Project not found or not accessible in your tenant: ${record.projectId}`);
          }

          // Validate and transform the record
          const transactionData = {
            projectId: record.projectId,
            type: record.type,
            amount: amount,
            category: record.category || 'other',
            description: record.description || '',
            userId: userId,
            tenantId: tenantId
          };

          // Validate with schema
          const validated = insertTransactionSchema.parse(transactionData);
          const transaction = await storage.createTransaction(validated, tenantId);
          
          // Create audit log for imported transaction
          await storage.createAuditLog({
            userId,
            action: "expense_submitted",
            entityType: "transaction",
            entityId: transaction.id,
            projectId: transaction.projectId,
            amount: transaction.amount,
            tenantId,
            details: { 
              type: transaction.type, 
              category: transaction.category,
              importSource: "csv_import"
            },
          }, tenantId);
          
          results.success++;
        } catch (error) {
          results.errors.push({
            row: index + 1,
            data: record,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing transactions CSV:", error);
      res.status(500).json({ message: "Failed to import transactions" });
    }
  });

  app.get('/api/export/transactions/csv', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const transactions = await storage.getTransactions(tenantId);
      
      // Convert transactions to CSV format
      const csvData = stringify(transactions, {
        header: true,
        columns: ['id', 'projectId', 'type', 'amount', 'category', 'description', 'userId', 'createdAt']
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting transactions CSV:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  app.get('/api/export/allocations/csv', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const allocations = await storage.getFundAllocations(tenantId);
      
      // Convert allocations to CSV format
      const csvData = stringify(allocations, {
        header: true,
        columns: ['id', 'projectId', 'fromUserId', 'toUserId', 'amount', 'category', 'description', 'status', 'createdAt']
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="allocations.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting allocations CSV:", error);
      res.status(500).json({ message: "Failed to export allocations" });
    }
  });

  app.post('/api/import/allocations/csv', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      const csvData = req.body.csvData;
      
      if (!csvData) {
        return res.status(400).json({ message: 'CSV data is required' });
      }

      // Parse CSV data
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      const results = { success: 0, errors: [] as any[] };

      for (let index = 0; index < records.length; index++) {
        const record = records[index] as any;
        try {
          // Strict amount validation using regex pattern for financial data
          const amountRegex = /^-?\d+(\.\d{1,2})?$/;
          if (!record.amount || !amountRegex.test(record.amount.toString().trim())) {
            throw new Error('Invalid amount format - must be a number with max 2 decimal places (e.g., 123.45)');
          }
          const amount = parseFloat(record.amount);
          if (amount === 0) {
            throw new Error('Amount cannot be zero');
          }
          if (amount < 0) {
            throw new Error('Amount cannot be negative for fund allocations');
          }

          // Validate projectId exists within tenant
          const project = await storage.getProject(record.projectId, tenantId);
          if (!project) {
            throw new Error(`Project not found or not accessible in your tenant: ${record.projectId}`);
          }

          // Validate toUserId exists within tenant (if specified)
          if (record.toUserId && record.toUserId !== userId) {
            // CRITICAL SECURITY FIX: Use tenantId to prevent cross-tenant user access
            const targetUser = await storage.getUser(record.toUserId, tenantId);
            if (!targetUser) {
              throw new Error(`Target user not found or not in your tenant: ${record.toUserId}`);
            }
          }

          // Validate and transform the record to match fundAllocations schema
          const allocationData = {
            projectId: record.projectId,
            fromUserId: userId, // Current user is allocating funds
            toUserId: record.toUserId || userId, // Default to self if not specified
            amount: amount,
            category: record.category as any, // Validate category enum
            description: record.description || '',
            tenantId: tenantId,
            status: record.status || 'approved'
          };

          // Validate with schema
          const validated = insertFundAllocationSchema.parse(allocationData);
          const createdAllocation = await storage.createFundAllocation(validated, tenantId);
          
          // Create corresponding transaction (exactly matching POST /api/fund-allocations)
          const transaction = await storage.createTransaction({
            projectId: validated.projectId,
            userId: validated.toUserId,
            type: "allocation",
            amount: validated.amount,
            category: validated.category,
            description: validated.description || "Fund allocation",
            allocationId: createdAllocation.id,
            tenantId: validated.tenantId,
          }, tenantId);
          
          // Create audit logs for both allocation and transaction
          await storage.createAuditLog({
            userId,
            action: "fund_allocated",
            entityType: "fund_allocation",
            entityId: createdAllocation.id,
            projectId: createdAllocation.projectId,
            amount: createdAllocation.amount,
            tenantId,
            details: { 
              category: createdAllocation.category, 
              toUser: createdAllocation.toUserId,
              importSource: "csv_import"
            },
          }, tenantId);
          
          await storage.createAuditLog({
            userId,
            action: "expense_submitted",
            entityType: "transaction",
            entityId: transaction.id,
            projectId: transaction.projectId,
            amount: transaction.amount,
            tenantId,
            details: { 
              type: transaction.type, 
              category: transaction.category,
              importSource: "csv_import",
              linkedAllocation: createdAllocation.id
            },
          }, tenantId);
          
          results.success++;
        } catch (error) {
          results.errors.push({
            row: index + 1,
            data: record,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error importing allocations CSV:", error);
      res.status(500).json({ message: "Failed to import allocations" });
    }
  });

  app.get('/api/export/allocations/csv', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const allocations = await storage.getFundAllocations(tenantId);
      
      // Convert allocations to CSV format with proper schema columns
      const csvData = stringify(allocations, {
        header: true,
        columns: ['id', 'projectId', 'fromUserId', 'toUserId', 'amount', 'category', 'description', 'status', 'createdAt']
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="allocations.csv"');
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting allocations CSV:", error);
      res.status(500).json({ message: "Failed to export allocations" });
    }
  });

  // Line Items routes (read access for all, create/update for admin and team_leader)
  app.get('/api/line-items', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const lineItems = await storage.getLineItems(tenantId);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching line items:", error);
      res.status(500).json({ message: "Failed to fetch line items" });
    }
  });

  app.get('/api/line-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const lineItem = await storage.getLineItem(req.params.id, tenantId);
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }
      res.json(lineItem);
    } catch (error) {
      console.error("Error fetching line item:", error);
      res.status(500).json({ message: "Failed to fetch line item" });
    }
  });

  app.post('/api/line-items', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const lineItemData = insertLineItemSchema.parse({
        ...req.body,
        tenantId,
      });

      const lineItem = await storage.createLineItem(lineItemData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "line_item_created",
        entityType: "line_item",
        entityId: lineItem.id,
        tenantId,
        details: { name: lineItem.name, category: lineItem.category },
      }, tenantId);

      res.json(lineItem);
    } catch (error) {
      console.error("Error creating line item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid line item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create line item" });
    }
  });

  app.put('/api/line-items/:id', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const lineItemData = insertLineItemSchema.partial().parse(req.body);
      const lineItem = await storage.updateLineItem(req.params.id, lineItemData, tenantId);
      
      if (!lineItem) {
        return res.status(404).json({ message: "Line item not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "line_item_updated",
        entityType: "line_item",
        entityId: lineItem.id,
        tenantId,
        details: { name: lineItem.name, category: lineItem.category },
      }, tenantId);
      
      res.json(lineItem);
    } catch (error) {
      console.error("Error updating line item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid line item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update line item" });
    }
  });

  // Materials routes
  app.get('/api/materials', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const materials = await storage.getMaterials(tenantId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.get('/api/materials/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const material = await storage.getMaterial(req.params.id, tenantId);
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ message: "Failed to fetch material" });
    }
  });

  app.post('/api/materials', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const materialData = insertMaterialSchema.parse({
        ...req.body,
        tenantId,
      });

      const material = await storage.createMaterial(materialData, tenantId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "material_added",
        entityType: "material",
        entityId: material.id,
        tenantId,
        details: { name: material.name, unit: material.unit, supplier: material.supplier },
      }, tenantId);

      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create material" });
    }
  });

  app.put('/api/materials/:id', isAuthenticated, authorize(['admin', 'team_leader', 'user']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const materialData = insertMaterialSchema.partial().parse(req.body);
      const material = await storage.updateMaterial(req.params.id, materialData, tenantId);
      
      if (!material) {
        return res.status(404).json({ message: "Material not found" });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "material_updated",
        entityType: "material",
        entityId: material.id,
        tenantId,
        details: { name: material.name, unit: material.unit, supplier: material.supplier },
      }, tenantId);
      
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update material" });
    }
  });

  // Budget Alerts API endpoints
  app.get('/api/budget-alerts', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { status } = req.query;
      
      const alerts = await storage.getBudgetAlerts(tenantId, status as 'active' | 'acknowledged' | 'resolved');
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching budget alerts:", error);
      res.status(500).json({ message: "Failed to fetch budget alerts" });
    }
  });

  app.get('/api/budget-alerts/project/:projectId', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { projectId } = req.params;
      
      const alerts = await storage.getBudgetAlertsByProject(projectId, tenantId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching project budget alerts:", error);
      res.status(500).json({ message: "Failed to fetch project budget alerts" });
    }
  });

  app.post('/api/budget-alerts/:alertId/acknowledge', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const { alertId } = req.params;
      
      const updatedAlert = await storage.acknowledgeBudgetAlert(alertId, userId, tenantId);
      
      if (!updatedAlert) {
        return res.status(404).json({ message: "Budget alert not found" });
      }
      
      // Create audit log for alert acknowledgment
      await storage.createAuditLog({
        userId,
        action: "approval_workflow_updated",
        entityType: "budget_alert",
        entityId: alertId,
        tenantId,
        details: { action: "acknowledged", alertType: updatedAlert.type }
      }, tenantId);
      
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error acknowledging budget alert:", error);
      res.status(500).json({ message: "Failed to acknowledge budget alert" });
    }
  });

  app.post('/api/budget-alerts/:alertId/resolve', isAuthenticated, authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const { alertId } = req.params;
      
      const updatedAlert = await storage.resolveBudgetAlert(alertId, tenantId);
      
      if (!updatedAlert) {
        return res.status(404).json({ message: "Budget alert not found" });
      }
      
      // Create audit log for alert resolution
      await storage.createAuditLog({
        userId,
        action: "approval_workflow_updated",
        entityType: "budget_alert",
        entityId: alertId,
        tenantId,
        details: { action: "resolved", alertType: updatedAlert.type }
      }, tenantId);
      
      res.json(updatedAlert);
    } catch (error) {
      console.error("Error resolving budget alert:", error);
      res.status(500).json({ message: "Failed to resolve budget alert" });
    }
  });

  // Enhanced budget impact validation endpoint for frontend confirmation dialogs
  app.post('/api/budget/validate-impact', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { projectId, proposedCost } = req.body;
      
      if (!projectId || proposedCost == null) {
        return res.status(400).json({ message: "Project ID and proposed cost are required" });
      }
      
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const totalBudget = parseFloat(project.budget);
      const currentSpent = parseFloat(project.consumedAmount);
      
      // Calculate budget impact
      const budgetImpact = calcBudgetImpact(currentSpent, parseFloat(proposedCost), totalBudget);
      
      // Generate alert message
      const alertMessage = generateBudgetAlertMessage(project.title, budgetImpact);
      
      res.json({
        projectId,
        projectTitle: project.title,
        proposedCost: parseFloat(proposedCost),
        currentSpent,
        totalBudget,
        budgetImpact: {
          ...budgetImpact,
          alertMessage,
          thresholds: BUDGET_THRESHOLDS
        }
      });
    } catch (error) {
      console.error("Error validating budget impact:", error);
      res.status(500).json({ message: "Failed to validate budget impact" });
    }
  });

  // Budget Amendments API Endpoints
  
  // POST /api/budget-amendments - Create new budget amendment proposal
  app.post('/api/budget-amendments', isAuthenticated, authorize(['team_leader', 'admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const amendmentData = insertBudgetAmendmentSchema.parse({
        ...req.body,
        proposedBy: userId,
        tenantId,
        status: 'draft', // Always start as draft
      });

      // Validate project exists and user has access
      const project = await storage.getProject(amendmentData.projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      const budgetAmendment = await storage.createBudgetAmendment(amendmentData, tenantId);
      
      // Create audit log for budget amendment creation
      await storage.createAuditLog({
        userId,
        action: "budget_amended",
        entityType: "budget_amendment",
        entityId: budgetAmendment.id,
        projectId: amendmentData.projectId,
        amount: amendmentData.amountAdded,
        tenantId,
        details: { 
          reason: amendmentData.reason,
          amountAdded: amendmentData.amountAdded,
          status: 'draft'
        }
      }, tenantId);

      res.status(201).json(budgetAmendment);
    } catch (error) {
      console.error("Error creating budget amendment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid amendment data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to create budget amendment" });
    }
  });

  // GET /api/budget-amendments - Retrieve budget amendments with optional filtering
  app.get('/api/budget-amendments', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      const { projectId, status } = req.query;
      
      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (status) filters.status = status as string;

      // Role-based filtering
      const normalizedRole = mapLegacyRole(user.role);

      const budgetAmendments = await storage.getBudgetAmendments(
        tenantId, 
        filters.projectId, 
        filters.status, 
        normalizedRole, 
        userId
      );
      res.json(budgetAmendments);
    } catch (error) {
      console.error("Error fetching budget amendments:", error);
      res.status(500).json({ message: "Failed to fetch budget amendments" });
    }
  });

  // GET /api/budget-amendments/:id - Get specific budget amendment by ID
  app.get('/api/budget-amendments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      const normalizedRole = mapLegacyRole(user.role);
      const budgetAmendments = await storage.getBudgetAmendments(tenantId, undefined, undefined, normalizedRole, userId);
      const budgetAmendment = budgetAmendments.find(a => a.id === req.params.id);
      
      if (!budgetAmendment) {
        return res.status(404).json({ message: "Budget amendment not found" });
      }
      
      res.json(budgetAmendment);
    } catch (error) {
      console.error("Error fetching budget amendment:", error);
      res.status(500).json({ message: "Failed to fetch budget amendment" });
    }
  });

  // PATCH /api/budget-amendments/:id/status - Update amendment status (approve/reject)
  app.patch('/api/budget-amendments/:id/status', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const { status, comments } = req.body;
      
      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const budgetAmendments = await storage.getBudgetAmendments(tenantId);
      const budgetAmendment = budgetAmendments.find(a => a.id === req.params.id);
      if (!budgetAmendment) {
        return res.status(404).json({ message: "Budget amendment not found" });
      }

      if (budgetAmendment.status !== 'pending' && budgetAmendment.status !== 'draft') {
        return res.status(400).json({ message: "Amendment has already been processed" });
      }

      // Update budget amendment status
      const updatedAmendment = await storage.updateBudgetAmendmentStatus(
        req.params.id, 
        status, 
        userId,
        tenantId
      );

      if (!updatedAmendment) {
        return res.status(404).json({ message: "Failed to update budget amendment" });
      }

      // If approved, update project budget and trigger recalculation
      if (status === 'approved') {
        const project = await storage.getProject(budgetAmendment.projectId, tenantId);
        if (project) {
          const newBudget = parseFloat(project.budget) + parseFloat(budgetAmendment.amountAdded);
          await storage.updateProject(budgetAmendment.projectId, { budget: newBudget.toString() }, tenantId);
          
          // Trigger budget variance calculation
          const variance = calcBudgetVariance(parseFloat(project.consumedAmount), newBudget);
          
          // Create budget alert if needed
          if (variance.isOverBudget || variance.status === 'warning' || variance.status === 'critical') {
            const alertType = variance.isOverBudget ? 'over_budget' : 
                           variance.status === 'critical' ? 'critical_threshold' : 'warning_threshold';
            
            await storage.createBudgetAlert({
              projectId: budgetAmendment.projectId,
              type: alertType,
              severity: alertType === 'over_budget' ? 'critical' : (alertType === 'critical_threshold' ? 'critical' : 'warning'),
              message: generateBudgetAlertMessage(project.title, variance),
              tenantId
            }, tenantId);
          }
        }
      }
      
      // Create audit log for status change
      await storage.createAuditLog({
        userId,
        action: "budget_amended",
        entityType: "budget_amendment",
        entityId: req.params.id,
        projectId: budgetAmendment.projectId,
        amount: budgetAmendment.amountAdded,
        tenantId,
        details: { 
          previousStatus: budgetAmendment.status,
          newStatus: status,
          comments: comments || null,
          approvedBy: userId
        }
      }, tenantId);

      res.json(updatedAmendment);
    } catch (error) {
      console.error("Error updating budget amendment status:", error);
      res.status(500).json({ message: "Failed to update budget amendment status" });
    }
  });

  // Change Orders API Endpoints
  
  // POST /api/change-orders - Create new change order proposal
  app.post('/api/change-orders', isAuthenticated, authorize(['team_leader', 'admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const changeOrderData = insertChangeOrderSchema.parse({
        ...req.body,
        proposedBy: userId,
        tenantId,
        status: 'draft', // Always start as draft
      });

      // Validate project exists and user has access
      const project = await storage.getProject(changeOrderData.projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      const changeOrder = await storage.createChangeOrder(changeOrderData, tenantId);
      
      // Create audit log for change order creation
      await storage.createAuditLog({
        userId,
        action: "change_order_created",
        entityType: "change_order",
        entityId: changeOrder.id,
        projectId: changeOrderData.projectId,
        amount: changeOrderData.costImpact,
        tenantId,
        details: { 
          description: changeOrderData.description,
          costImpact: changeOrderData.costImpact,
          status: 'draft'
        }
      }, tenantId);

      res.status(201).json(changeOrder);
    } catch (error) {
      console.error("Error creating change order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid change order data", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to create change order" });
    }
  });

  // GET /api/change-orders - Retrieve change orders with optional filtering
  app.get('/api/change-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      const { projectId, status } = req.query;
      
      const filters: any = {};
      if (projectId) filters.projectId = projectId as string;
      if (status) filters.status = status as string;

      // Role-based filtering
      const normalizedRole = mapLegacyRole(user.role);

      const changeOrders = await storage.getChangeOrders(
        tenantId, 
        filters.projectId, 
        filters.status, 
        normalizedRole, 
        userId
      );
      res.json(changeOrders);
    } catch (error) {
      console.error("Error fetching change orders:", error);
      res.status(500).json({ message: "Failed to fetch change orders" });
    }
  });

  // GET /api/change-orders/:id - Get specific change order by ID
  app.get('/api/change-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId, user } = await getUserData(req);
      const normalizedRole = mapLegacyRole(user.role);
      const changeOrders = await storage.getChangeOrders(tenantId, undefined, undefined, normalizedRole, userId);
      const changeOrder = changeOrders.find(c => c.id === req.params.id);
      
      if (!changeOrder) {
        return res.status(404).json({ message: "Change order not found" });
      }
      
      res.json(changeOrder);
    } catch (error) {
      console.error("Error fetching change order:", error);
      res.status(500).json({ message: "Failed to fetch change order" });
    }
  });

  // PATCH /api/change-orders/:id/status - Update change order status (approve/reject)
  app.patch('/api/change-orders/:id/status', isAuthenticated, authorize(['admin']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      const { status, comments } = req.body;
      
      // Validate status
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
      }

      const changeOrders = await storage.getChangeOrders(tenantId);
      const changeOrder = changeOrders.find(c => c.id === req.params.id);
      if (!changeOrder) {
        return res.status(404).json({ message: "Change order not found" });
      }

      if (changeOrder.status !== 'pending' && changeOrder.status !== 'draft') {
        return res.status(400).json({ message: "Change order has already been processed" });
      }

      // Update change order status
      const updatedChangeOrder = await storage.updateChangeOrderStatus(
        req.params.id, 
        status, 
        userId,
        tenantId
      );

      if (!updatedChangeOrder) {
        return res.status(404).json({ message: "Failed to update change order" });
      }

      // If approved and has cost impact, update project budget
      if (status === 'approved' && parseFloat(changeOrder.costImpact) !== 0) {
        const project = await storage.getProject(changeOrder.projectId, tenantId);
        if (project) {
          const newBudget = parseFloat(project.budget) + parseFloat(changeOrder.costImpact);
          await storage.updateProject(changeOrder.projectId, { budget: newBudget.toString() }, tenantId);
          
          // Trigger budget variance calculation if cost impact is positive
          if (parseFloat(changeOrder.costImpact) > 0) {
            const variance = calcBudgetVariance(parseFloat(project.consumedAmount), newBudget);
            
            // Create budget alert if needed
            if (variance.isOverBudget || variance.status === 'warning' || variance.status === 'critical') {
              const alertType = variance.isOverBudget ? 'over_budget' : 
                             variance.status === 'critical' ? 'critical_threshold' : 'warning_threshold';
              
              await storage.createBudgetAlert({
                projectId: changeOrder.projectId,
                type: alertType,
                severity: alertType === 'over_budget' ? 'critical' : (alertType === 'critical_threshold' ? 'critical' : 'warning'),
                message: generateBudgetAlertMessage(project.title, variance),
                tenantId
              }, tenantId);
            }
          }
        }
      }
      
      // Create audit log for status change
      await storage.createAuditLog({
        userId,
        action: "change_order_created",
        entityType: "change_order",
        entityId: req.params.id,
        projectId: changeOrder.projectId,
        amount: changeOrder.costImpact,
        tenantId,
        details: { 
          previousStatus: changeOrder.status,
          newStatus: status,
          comments: comments || null,
          approvedBy: userId,
          description: changeOrder.description
        }
      }, tenantId);

      res.json(updatedChangeOrder);
    } catch (error) {
      console.error("Error updating change order status:", error);
      res.status(500).json({ message: "Failed to update change order status" });
    }
  });

  // GET /api/projects/:id/budget-history - Get complete budget history
  app.get('/api/projects/:id/budget-history', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Validate UUID format
      if (!isValidUUID(projectId)) {
        return res.status(400).json({ message: "Invalid project ID format. Must be a valid UUID." });
      }
      
      const { tenantId } = await getUserData(req);
      
      // Validate project exists and user has access
      const project = await storage.getProject(projectId, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }

      // Get all budget amendments and change orders for this project
      const [budgetAmendments, changeOrders] = await Promise.all([
        storage.getBudgetAmendments(tenantId, projectId, 'approved'),
        storage.getChangeOrders(tenantId, projectId, 'approved')
      ]);

      // Calculate budget history timeline
      const originalBudget = parseFloat(project.budget);
      let runningTotal = originalBudget;
      
      const history = [
        {
          id: 'original',
          type: 'original_budget',
          date: project.createdAt,
          description: 'Original project budget',
          amount: originalBudget,
          runningTotal: originalBudget,
          details: null
        }
      ];

      // Combine and sort amendments and change orders by date
      const allChanges = [
        ...budgetAmendments.map(amendment => ({
          id: amendment.id,
          type: 'budget_amendment',
          date: amendment.approvedAt || amendment.createdAt,
          description: amendment.reason,
          amount: parseFloat(amendment.amountAdded),
          details: amendment
        })),
        ...changeOrders.map(order => ({
          id: order.id,
          type: 'change_order',
          date: order.approvedAt || order.createdAt,
          description: order.description,
          amount: parseFloat(order.costImpact),
          details: order
        }))
      ].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });

      // Build history with running totals
      allChanges.forEach(change => {
        runningTotal += change.amount;
        history.push({
          id: change.id,
          type: change.type,
          date: change.date,
          description: change.description,
          amount: change.amount,
          runningTotal,
          details: null
        });
      });

      // Calculate summary
      const totalAmendments = budgetAmendments.reduce((sum, amendment) => 
        sum + parseFloat(amendment.amountAdded), 0);
      const totalChangeOrders = changeOrders.reduce((sum, order) => 
        sum + parseFloat(order.costImpact), 0);
      const currentBudget = runningTotal;

      res.json({
        projectId,
        projectTitle: project.title,
        summary: {
          originalBudget,
          totalAmendments,
          totalChangeOrders,
          currentBudget,
          currentSpent: parseFloat(project.consumedAmount),
          remainingBudget: currentBudget - parseFloat(project.consumedAmount)
        },
        history
      });
    } catch (error) {
      console.error("Error fetching project budget history:", error);
      res.status(500).json({ message: "Failed to fetch project budget history" });
    }
  });

  // Team Management Routes
  
  // GET /api/teams - List all teams for tenant
  app.get('/api/teams', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const { tenantId } = req.tenant;
      const teams = await storage.getTeams(tenantId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // GET /api/teams/:id - Get specific team
  app.get('/api/teams/:id', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(teamId)) {
        return res.status(400).json({ message: "Invalid team ID format" });
      }

      const team = await storage.getTeam(teamId, tenantId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  // POST /api/teams - Create new team (admin or team_leader)
  app.post('/api/teams', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId } = req.tenant;
      
      // Validate request body and inject server-side tenantId
      const teamData = insertTeamSchema.parse({
        ...req.body,
        tenantId // Server-side injection for security
      });
      
      const team = await storage.createTeam(teamData, tenantId);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // PUT /api/teams/:id - Update team (admin or team_leader)
  app.put('/api/teams/:id', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(teamId)) {
        return res.status(400).json({ message: "Invalid team ID format" });
      }

      // Validate request body (tenantId already omitted from insertTeamSchema)
      const teamData = insertTeamSchema.partial().parse(req.body);
      
      const updatedTeam = await storage.updateTeam(teamId, teamData, tenantId);
      if (!updatedTeam) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // DELETE /api/teams/:id - Delete team (admin only)
  app.delete('/api/teams/:id', isAuthenticated, setTenantContext(), authorize(['admin']), async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(teamId)) {
        return res.status(400).json({ message: "Invalid team ID format" });
      }

      const deleted = await storage.deleteTeam(teamId, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }

      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Team Membership Routes

  // GET /api/teams/:id/members - Get team members
  app.get('/api/teams/:id/members', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(teamId)) {
        return res.status(400).json({ message: "Invalid team ID format" });
      }

      const members = await storage.getTeamMembers(teamId, tenantId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // POST /api/teams/:id/members - Add team member (admin or team_leader)
  app.post('/api/teams/:id/members', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const teamId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(teamId)) {
        return res.status(400).json({ message: "Invalid team ID format" });
      }

      // Validate request body and inject server-side fields
      const membershipData = insertTeamMemberSchema.parse({
        ...req.body,
        teamId,
        tenantId // Server-side injection for security
      });
      
      const membership = await storage.addTeamMember(membershipData, tenantId);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error adding team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid membership data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // DELETE /api/teams/:id/members/:userId - Remove team member (admin or team_leader)
  app.delete('/api/teams/:id/members/:userId', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { id: teamId, userId } = req.params;
      const { tenantId } = req.tenant;
      
      // Validate UUID formats
      if (!isValidUUID(teamId) || !isValidUUID(userId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const removed = await storage.removeTeamMember(teamId, userId, tenantId);
      if (!removed) {
        return res.status(404).json({ message: "Team membership not found" });
      }

      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // PUT /api/teams/:id/members/:userId - Update team member role (admin or team_leader)
  app.put('/api/teams/:id/members/:userId', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const { id: teamId, userId } = req.params;
      const { tenantId } = req.tenant;
      const { roleInTeam } = req.body;
      
      // Validate UUID formats
      if (!isValidUUID(teamId) || !isValidUUID(userId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Validate role
      if (!roleInTeam || typeof roleInTeam !== 'string') {
        return res.status(400).json({ message: "Role in team is required" });
      }

      const updatedMembership = await storage.updateTeamMemberRole(teamId, userId, roleInTeam, tenantId);
      if (!updatedMembership) {
        return res.status(404).json({ message: "Team membership not found" });
      }

      res.json(updatedMembership);
    } catch (error) {
      console.error("Error updating team member role:", error);
      res.status(500).json({ message: "Failed to update team member role" });
    }
  });

  // User Team Routes

  // GET /api/users/:id/teams - Get teams for specific user (admin/team_leader only)
  app.get('/api/users/:id/teams', isAuthenticated, setTenantContext(), authorize(['admin', 'team_leader']), async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { tenantId } = req.tenant;
      
      // Validate UUID format
      if (!isValidUUID(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }

      const teams = await storage.getTeamsForUser(userId, tenantId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  // GET /api/users/me/teams - Get teams for current user
  app.get('/api/users/me/teams', isAuthenticated, setTenantContext(), async (req: any, res) => {
    try {
      const { userId, tenantId } = req.tenant;
      
      const teams = await storage.getTeamsForUser(userId, tenantId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching current user teams:", error);
      res.status(500).json({ message: "Failed to fetch current user teams" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
