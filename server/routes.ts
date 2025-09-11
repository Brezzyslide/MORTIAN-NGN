import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { 
  insertProjectSchema,
  insertFundAllocationSchema,
  insertTransactionSchema,
  insertFundTransferSchema,
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/fund-allocations', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/fund-transfers', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/users/subordinates', isAuthenticated, async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
