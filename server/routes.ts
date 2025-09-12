import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
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
} from "@shared/schema";
import { z } from "zod";

// Helper function to get user and tenantId from authenticated request
async function getUserData(req: any): Promise<{ userId: string; tenantId: string; user: any }> {
  const userId = req.user.claims.sub;
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return { userId, tenantId: user.tenantId, user };
}

// Role-based authorization middleware
function authorize(allowedRoles: string[]) {
  return async (req: any, res: any, next: any) => {
    try {
      const { user } = await getUserData(req);
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${user.role}` 
        });
      }
      // Attach user context to request for use in route handlers
      req.userContext = { userId: user.id, tenantId: user.tenantId, user };
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      if (req.isAuthenticated?.() && req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        return res.status(200).json(user);
      }
      return res.status(200).json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company management routes (for console managers only)
  app.get('/api/companies', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const { userId } = req.userContext;

      const companyData = insertCompanySchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const company = await storage.createCompany(companyData);
      
      res.json(company);
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
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put('/api/companies/:id', isAuthenticated, authorize(['console_manager']), async (req: any, res) => {
    try {
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, companyData);
      
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
      const { tenantId } = await getUserData(req);
      const project = await storage.getProject(req.params.id, tenantId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, authorize(['manager']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const projectData = insertProjectSchema.parse({
        ...req.body,
        managerId: userId,
        tenantId,
      });

      const project = await storage.createProject(projectData);
      
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
      });

      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
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

  app.post('/api/fund-allocations', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const allocationData = insertFundAllocationSchema.parse({
        ...req.body,
        fromUserId: userId,
        tenantId,
      });

      const allocation = await storage.createFundAllocation(allocationData);
      
      // Create corresponding transaction
      await storage.createTransaction({
        projectId: allocation.projectId,
        userId: allocation.toUserId,
        type: "allocation",
        amount: allocation.amount,
        category: allocation.category,
        description: allocation.description || "Fund allocation",
        allocationId: allocation.id,
        tenantId,
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "fund_allocated",
        entityType: "fund_allocation",
        entityId: allocation.id,
        projectId: allocation.projectId,
        amount: allocation.amount,
        tenantId,
        details: { category: allocation.category, toUser: allocation.toUserId },
      });

      res.json(allocation);
    } catch (error) {
      console.error("Error creating fund allocation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid allocation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund allocation" });
    }
  });

  // Transaction routes
  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const transactions = await storage.getTransactions(tenantId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId,
        tenantId,
      });

      const transaction = await storage.createTransaction(transactionData);
      
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
      });

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

  app.post('/api/fund-transfers', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
    try {
      const { userId, tenantId } = await getUserData(req);
      
      const transferData = insertFundTransferSchema.parse({
        ...req.body,
        fromUserId: userId,
        tenantId,
      });

      const transfer = await storage.createFundTransfer(transferData);
      
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
      });

      res.json(transfer);
    } catch (error) {
      console.error("Error creating fund transfer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transfer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fund transfer" });
    }
  });

  // Analytics routes
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
      const { tenantId } = await getUserData(req);
      const stats = await storage.getProjectStats(req.params.id, tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ message: "Failed to fetch project analytics" });
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

  // User hierarchy routes
  app.get('/api/users/subordinates', isAuthenticated, authorize(['manager']), async (req: any, res) => {
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

  // User management routes (admin/manager only)
  app.get('/api/users', isAuthenticated, authorize(['manager']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const users = await storage.getAllUsers(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, authorize(['manager']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      
      const userData = insertUserSchema.parse({
        ...req.body,
        tenantId,
      });

      const user = await storage.upsertUser(userData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "user_created",
        entityType: "user",
        entityId: user.id,
        tenantId,
        details: { email: user.email, role: user.role },
      });

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, authorize(['manager']), async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const { role } = req.body;
      
      if (!['manager', 'team_leader', 'user'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
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
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/users/:id/status', isAuthenticated, authorize(['manager']), async (req: any, res) => {
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
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.post('/api/users/:id/reset-password', isAuthenticated, authorize(['manager']), async (req: any, res) => {
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
        action: "password_reset_requested",
        entityType: "user",
        entityId: userToReset.id,
        tenantId,
        details: { 
          targetUserEmail: userToReset.email,
          resetRequestedBy: userId,
          resetMethod: "admin_requested"
        },
      });

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
    const userId = req.user?.claims?.sub;
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

    const userId = req.user?.claims?.sub;

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

  // PDF Export routes
  app.get('/api/export/project/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = await getUserData(req);
      const pdfBuffer = await pdfExportService.generateProjectSummary(req.params.id, tenantId);
      
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
  app.post('/api/import/transactions/csv', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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

      for (const [index, record] of records.entries()) {
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
          const transaction = await storage.createTransaction(validated);
          
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
          });
          
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

  app.get('/api/export/transactions/csv', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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

  app.get('/api/export/allocations/csv', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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

  app.post('/api/import/allocations/csv', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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

      for (const [index, record] of records.entries()) {
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
            const targetUser = await storage.getUser(record.toUserId);
            if (!targetUser || targetUser.tenantId !== tenantId) {
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
          const createdAllocation = await storage.createFundAllocation(validated);
          
          // Create corresponding transaction (exactly matching POST /api/fund-allocations)
          await storage.createTransaction({
            projectId: validated.projectId,
            userId: validated.toUserId,
            type: "allocation",
            amount: validated.amount,
            category: validated.category,
            description: validated.description || "Fund allocation",
            allocationId: createdAllocation.id,
            tenantId: validated.tenantId,
          });
          
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
          });
          
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
          });
          
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

  app.get('/api/export/allocations/csv', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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

  // Line Items routes
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

  app.post('/api/line-items', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const lineItemData = insertLineItemSchema.parse({
        ...req.body,
        tenantId,
      });

      const lineItem = await storage.createLineItem(lineItemData);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "line_item_created",
        entityType: "line_item",
        entityId: lineItem.id,
        tenantId,
        details: { name: lineItem.name, category: lineItem.category },
      });

      res.json(lineItem);
    } catch (error) {
      console.error("Error creating line item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid line item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create line item" });
    }
  });

  app.put('/api/line-items/:id', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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
      });
      
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

  app.post('/api/materials', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
    try {
      const { tenantId, userId } = await getUserData(req);
      
      const materialData = insertMaterialSchema.parse({
        ...req.body,
        tenantId,
      });

      const material = await storage.createMaterial(materialData);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "material_added",
        entityType: "material",
        entityId: material.id,
        tenantId,
        details: { name: material.name, unit: material.unit, supplier: material.supplier },
      });

      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create material" });
    }
  });

  app.put('/api/materials/:id', isAuthenticated, authorize(['manager', 'team_leader']), async (req: any, res) => {
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
      });
      
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid material data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update material" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
