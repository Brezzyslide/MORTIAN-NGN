import {
  users,
  projects,
  fundAllocations,
  transactions,
  fundTransfers,
  auditLogs,
  companies,
  lineItems,
  materials,
  costAllocations,
  materialAllocations,
  approvalWorkflows,
  budgetAlerts,
  budgetAmendments,
  changeOrders,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type FundAllocation,
  type InsertFundAllocation,
  type Transaction,
  type InsertTransaction,
  type FundTransfer,
  type InsertFundTransfer,
  type AuditLog,
  type InsertAuditLog,
  type Company,
  type InsertCompany,
  type LineItem,
  type InsertLineItem,
  type Material,
  type InsertMaterial,
  type CostAllocation,
  type InsertCostAllocation,
  type MaterialAllocation,
  type InsertMaterialAllocation,
  type ApprovalWorkflow,
  type InsertApprovalWorkflow,
  type BudgetAlert,
  type InsertBudgetAlert,
  type BudgetAmendment,
  type InsertBudgetAmendment,
  type ChangeOrder,
  type InsertChangeOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Company operations (for console managers)
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyForTenant(id: string, tenantId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string, tenantId: string): Promise<User | undefined>;
  getUserWithPermissions(id: string, tenantId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  getProjects(tenantId: string): Promise<Project[]>;
  getProject(id: string, tenantId: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>, tenantId: string): Promise<Project | undefined>;

  // Fund allocation operations
  getFundAllocations(tenantId: string): Promise<FundAllocation[]>;
  getFundAllocationsByProject(projectId: string, tenantId: string): Promise<FundAllocation[]>;
  createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation>;

  // Transaction operations
  getTransactions(tenantId: string): Promise<Transaction[]>;
  getTransactionsByProject(projectId: string, tenantId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;

  // Fund transfer operations
  getFundTransfers(tenantId: string): Promise<FundTransfer[]>;
  createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer>;

  // Audit log operations
  getAuditLogs(tenantId: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // User hierarchy operations
  getSubordinates(managerId: string, tenantId: string): Promise<User[]>;
  getUsersByRole(role: string, tenantId: string): Promise<User[]>;
  getAllUsers(tenantId: string): Promise<User[]>;
  updateUserRole(userId: string, role: string, tenantId: string): Promise<User | undefined>;
  updateUserStatus(userId: string, status: string, tenantId: string): Promise<User | undefined>;

  // Authentication operations
  getUserByEmail(email: string): Promise<User | undefined>;
  setUserPassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<User | undefined>;
  incrementFailedLogins(userId: string): Promise<User | undefined>;
  lockAccount(userId: string, lockUntil: Date): Promise<User | undefined>;
  resetFailedLogins(userId: string): Promise<User | undefined>;
  createUserWithPassword(userData: Omit<UpsertUser, 'id'> & { passwordHash: string }): Promise<User>;

  // Line items operations
  getLineItems(tenantId: string): Promise<LineItem[]>;
  getLineItem(id: string, tenantId: string): Promise<LineItem | undefined>;
  createLineItem(lineItem: InsertLineItem): Promise<LineItem>;
  updateLineItem(id: string, lineItem: Partial<InsertLineItem>, tenantId: string): Promise<LineItem | undefined>;

  // Materials operations
  getMaterials(tenantId: string): Promise<Material[]>;
  getMaterial(id: string, tenantId: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, material: Partial<InsertMaterial>, tenantId: string): Promise<Material | undefined>;

  // Cost allocation operations
  getCostAllocations(tenantId: string): Promise<CostAllocation[]>;
  getCostAllocationsByProject(projectId: string, tenantId: string): Promise<(CostAllocation & { materialAllocations: (MaterialAllocation & { material: Material })[] })[]>;
  createCostAllocation(costAllocation: InsertCostAllocation, materialAllocations?: InsertMaterialAllocation[]): Promise<CostAllocation>;
  updateCostAllocation(id: string, costAllocation: Partial<InsertCostAllocation>, tenantId: string): Promise<CostAllocation | undefined>;

  // Analytics operations
  getProjectStats(projectId: string, tenantId: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
    netProfit: number;
    transactionCount: number;
  }>;
  
  getTenantStats(tenantId: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
    netProfit: number;
    activeProjects: number;
  }>;

  // New analytics operations for Sprint 4 & 5 (with enhanced security)
  getBudgetSummary(tenantId: string, userRole?: string, userId?: string): Promise<Array<{
    projectId: string;
    projectTitle: string;
    totalBudget: number;
    totalSpent: number;
    spentPercentage: number;
    remainingBudget: number;
    status: 'healthy' | 'warning' | 'critical';
  }>>;

  getLabourMaterialSplit(tenantId: string, filters?: { startDate?: Date; endDate?: Date; projectId?: string; categories?: string[] }, userRole?: string, userId?: string): Promise<{
    totalLabour: number;
    totalMaterial: number;
    labourPercentage: number;
    materialPercentage: number;
  }>;

  getCategorySpending(tenantId: string, filters?: { startDate?: Date; endDate?: Date; projectId?: string; categories?: string[] }, userRole?: string, userId?: string): Promise<Array<{
    category: string;
    totalSpent: number;
    labourCost: number;
    materialCost: number;
    allocationCount: number;
  }>>;

  getCostAllocationsWithFilters(tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    changeOrderId?: string;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }, userRole?: string, userId?: string): Promise<{
    allocations: Array<CostAllocation & { 
      lineItemName: string;
      lineItemCategory: string;
      projectTitle: string;
      enteredByName: string;
      changeOrderId?: string | null;
      changeOrderDescription?: string | null;
      materialAllocations: (MaterialAllocation & { material: Material })[];
    }>;
    total: number;
  }>;

  // Approval workflow operations
  getApprovalWorkflows(tenantId: string): Promise<Array<ApprovalWorkflow & { approver?: User }>>;
  getPendingApprovals(tenantId: string, table?: 'cost_allocations'): Promise<Array<ApprovalWorkflow & { 
    approver?: User;
    costAllocation?: {
      id: string | null;
      projectId: string | null;
      lineItemId: string | null;
      labourCost: string | null;
      materialCost: string | null;
      quantity: string | null;
      unitCost: string | null;
      totalCost: string | null;
      dateIncurred: Date | null;
      enteredBy: string | null;
      tenantId: string | null;
      status: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      lineItemName: string | null;
      projectTitle: string | null;
      enteredByName: string | null;
    };
  }>>;
  createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow>;
  updateApprovalWorkflowStatus(recordId: string, status: 'approved' | 'rejected', approverId: string, comments?: string, tenantId?: string): Promise<ApprovalWorkflow | undefined>;
  updateCostAllocationStatus(id: string, status: 'draft' | 'pending' | 'approved' | 'rejected', tenantId: string): Promise<CostAllocation | undefined>;

  // Budget alert operations
  getBudgetAlerts(tenantId: string, status?: 'active' | 'acknowledged' | 'resolved'): Promise<Array<BudgetAlert & { project: Project }>>;
  getBudgetAlertsByProject(projectId: string, tenantId: string): Promise<Array<BudgetAlert & { project: Project }>>;
  createBudgetAlert(alert: InsertBudgetAlert): Promise<BudgetAlert>;
  acknowledgeBudgetAlert(alertId: string, acknowledgedBy: string, tenantId: string): Promise<BudgetAlert | undefined>;
  resolveBudgetAlert(alertId: string, tenantId: string): Promise<BudgetAlert | undefined>;
  checkAndCreateBudgetAlerts(projectId: string, tenantId: string): Promise<BudgetAlert[]>;

  // Budget amendment operations
  getBudgetAmendments(tenantId: string, projectId?: string, status?: 'draft' | 'pending' | 'approved' | 'rejected', userRole?: string, userId?: string): Promise<Array<BudgetAmendment & { project: Project; proposer: User; approver?: User }>>;
  getBudgetAmendmentsByProject(projectId: string, tenantId: string): Promise<Array<BudgetAmendment & { proposer: User; approver?: User }>>;
  createBudgetAmendment(amendment: InsertBudgetAmendment): Promise<BudgetAmendment>;
  updateBudgetAmendmentStatus(id: string, status: 'pending' | 'approved' | 'rejected', approvedBy?: string, tenantId?: string): Promise<BudgetAmendment | undefined>;

  // Change order operations
  getChangeOrders(tenantId: string, projectId?: string, status?: 'draft' | 'pending' | 'approved' | 'rejected', userRole?: string, userId?: string): Promise<Array<ChangeOrder & { project: Project; proposer: User; approver?: User }>>;
  getChangeOrdersByProject(projectId: string, tenantId: string): Promise<Array<ChangeOrder & { proposer: User; approver?: User }>>;
  createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder>;
  updateChangeOrderStatus(id: string, status: 'pending' | 'approved' | 'rejected', approvedBy?: string, tenantId?: string): Promise<ChangeOrder | undefined>;

  // Project budget history operations
  getProjectBudgetHistory(projectId: string, tenantId: string): Promise<{
    originalBudget: number;
    totalAmendments: number;
    currentBudget: number;
    amendments: Array<BudgetAmendment & { proposer: User; approver?: User }>;
    changeOrders: Array<ChangeOrder & { proposer: User; approver?: User }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Company operations (for console managers)
  async getCompanies(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async getCompanyForTenant(id: string, tenantId: string): Promise<Company | undefined> {
    // For regular users, ensure they can only access their own company
    const [company] = await db.select().from(companies).where(and(eq(companies.id, id), eq(companies.id, tenantId)));
    return company;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ ...company, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string, tenantId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
    return user;
  }

  async getUserWithPermissions(id: string, tenantId: string): Promise<User | undefined> {
    // Enhanced user retrieval with strict tenant isolation and role validation
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id), 
        eq(users.tenantId, tenantId),
        eq(users.status, 'active')
      ));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to insert or update by ID first
      const result = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      const [user] = result as User[];
      return user;
    } catch (error: any) {
      // Handle unique email constraint violation (error code 23505)
      if (error?.code === '23505' && error?.constraint?.includes('email')) {
        console.log('Email conflict detected, updating existing user with email:', userData.email);
        
        // Find existing user by email and update them
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email!));
          
        if (existingUser) {
          const [updatedUser] = await db
            .update(users)
            .set({
              ...userData,
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return updatedUser;
        }
      }
      
      // Re-throw any other errors
      console.error('Error in upsertUser:', error);
      throw error;
    }
  }

  // Project operations
  async getProjects(tenantId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string, tenantId: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>, tenantId: string): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();
    return updatedProject;
  }

  // Fund allocation operations
  async getFundAllocations(tenantId: string): Promise<FundAllocation[]> {
    return await db
      .select()
      .from(fundAllocations)
      .where(eq(fundAllocations.tenantId, tenantId))
      .orderBy(desc(fundAllocations.createdAt));
  }

  async getFundAllocationsByProject(projectId: string, tenantId: string): Promise<FundAllocation[]> {
    return await db
      .select()
      .from(fundAllocations)
      .where(and(eq(fundAllocations.projectId, projectId), eq(fundAllocations.tenantId, tenantId)))
      .orderBy(desc(fundAllocations.createdAt));
  }

  async createFundAllocation(allocation: InsertFundAllocation): Promise<FundAllocation> {
    const [newAllocation] = await db
      .insert(fundAllocations)
      .values(allocation)
      .returning();
    return newAllocation;
  }

  // Transaction operations
  async getTransactions(tenantId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByProject(projectId: string, tenantId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.projectId, projectId), eq(transactions.tenantId, tenantId)))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Fund transfer operations
  async getFundTransfers(tenantId: string): Promise<FundTransfer[]> {
    return await db
      .select()
      .from(fundTransfers)
      .where(eq(fundTransfers.tenantId, tenantId))
      .orderBy(desc(fundTransfers.createdAt));
  }

  async createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer> {
    const [newTransfer] = await db
      .insert(fundTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  // Audit log operations
  async getAuditLogs(tenantId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
  }

  // User hierarchy operations
  async getSubordinates(managerId: string, tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.managerId, managerId), eq(users.tenantId, tenantId)))
      .orderBy(users.firstName);
  }

  async getUsersByRole(role: string, tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, role), eq(users.tenantId, tenantId)))
      .orderBy(users.firstName);
  }

  async getAllUsers(tenantId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(users.firstName);
  }

  async updateUserRole(userId: string, role: string, tenantId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ role: role as any })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();
    return updatedUser;
  }

  async updateUserStatus(userId: string, status: string, tenantId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ status: status as any })
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .returning();
    return updatedUser;
  }

  // Authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async setUserPassword(userId: string, passwordHash: string, mustChangePassword?: boolean): Promise<User | undefined> {
    const updateData: any = { 
      passwordHash,
      updatedAt: new Date(),
      failedLoginCount: 0, // Reset failed login count when password is set
      lockedUntil: null // Unlock account when password is set
    };
    
    if (mustChangePassword !== undefined) {
      updateData.mustChangePassword = mustChangePassword;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async incrementFailedLogins(userId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        failedLoginCount: sql`${users.failedLoginCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async lockAccount(userId: string, lockUntil: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        lockedUntil: lockUntil,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async resetFailedLogins(userId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async createUserWithPassword(userData: Omit<UpsertUser, 'id'> & { passwordHash: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        id: sql`gen_random_uuid()`,
        ...userData,
        status: 'active',
        failedLoginCount: 0,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newUser;
  }

  // Analytics operations
  async getProjectStats(projectId: string, tenantId: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
    netProfit: number;
    transactionCount: number;
  }> {
    const project = await this.getProject(projectId, tenantId);
    if (!project) {
      return {
        totalBudget: 0,
        totalSpent: 0,
        totalRevenue: 0,
        netProfit: 0,
        transactionCount: 0,
      };
    }

    const [spentResult] = await db
      .select({
        totalSpent: sum(transactions.amount),
        count: count(transactions.id),
      })
      .from(transactions)
      .where(and(
        eq(transactions.projectId, projectId),
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, "expense")
      ));

    const [revenueResult] = await db
      .select({
        totalRevenue: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.projectId, projectId),
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, "revenue")
      ));

    const totalBudget = parseFloat(project.budget) || 0;
    const totalSpent = parseFloat(spentResult?.totalSpent || "0") || 0;
    const totalRevenue = parseFloat(revenueResult?.totalRevenue || "0") || parseFloat(project.revenue || "0") || 0;
    const netProfit = totalRevenue - totalSpent;
    const transactionCount = spentResult?.count || 0;

    return {
      totalBudget,
      totalSpent,
      totalRevenue,
      netProfit,
      transactionCount,
    };
  }

  async getTenantStats(tenantId: string): Promise<{
    totalBudget: number;
    totalSpent: number;
    totalRevenue: number;
    netProfit: number;
    activeProjects: number;
  }> {
    const [budgetResult] = await db
      .select({
        totalBudget: sum(projects.budget),
        activeProjects: count(projects.id),
      })
      .from(projects)
      .where(and(
        eq(projects.tenantId, tenantId),
        eq(projects.status, "active")
      ));

    const [spentResult] = await db
      .select({
        totalSpent: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, "expense")
      ));

    const [revenueResult] = await db
      .select({
        totalRevenue: sum(transactions.amount),
      })
      .from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        eq(transactions.type, "revenue")
      ));

    const totalBudget = parseFloat(budgetResult?.totalBudget || "0") || 0;
    const totalSpent = parseFloat(spentResult?.totalSpent || "0") || 0;
    const totalRevenue = parseFloat(revenueResult?.totalRevenue || "0") || 0;
    const netProfit = totalRevenue - totalSpent;
    const activeProjects = budgetResult?.activeProjects || 0;

    return {
      totalBudget,
      totalSpent,
      totalRevenue,
      netProfit,
      activeProjects,
    };
  }

  // New analytics operations for Sprint 4 & 5 with enhanced security
  async getBudgetSummary(tenantId: string, userRole?: string, userId?: string): Promise<Array<{
    projectId: string;
    projectTitle: string;
    totalBudget: number;
    totalSpent: number;
    spentPercentage: number;
    remainingBudget: number;
    status: 'healthy' | 'warning' | 'critical';
  }>> {
    // Enhanced query with role-based filtering
    let whereConditions = [
      eq(projects.tenantId, tenantId),
      eq(projects.status, "active")
    ];

    // If viewer role, only show projects they are involved with
    if (userRole === 'viewer' && userId) {
      whereConditions.push(
        sql`(${projects.managerId} = ${userId} OR EXISTS (
          SELECT 1 FROM ${fundAllocations} 
          WHERE ${fundAllocations.projectId} = ${projects.id} 
          AND (${fundAllocations.fromUserId} = ${userId} OR ${fundAllocations.toUserId} = ${userId})
        ))`
      );
    }

    const projectsData = await db
      .select({
        id: projects.id,
        title: projects.title,
        budget: projects.budget,
        consumedAmount: projects.consumedAmount,
      })
      .from(projects)
      .where(and(...whereConditions));

    // Get cost allocations spending for each project
    const budgetSummary = await Promise.all(
      projectsData.map(async (project) => {
        const [spentResult] = await db
          .select({
            totalSpent: sum(costAllocations.totalCost),
          })
          .from(costAllocations)
          .where(and(
            eq(costAllocations.projectId, project.id),
            eq(costAllocations.tenantId, tenantId)
          ));

        const totalBudget = parseFloat(project.budget) || 0;
        const totalSpent = parseFloat(spentResult?.totalSpent || "0") || 0;
        const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        const remainingBudget = totalBudget - totalSpent;

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (spentPercentage >= 95) {
          status = 'critical';
        } else if (spentPercentage >= 80) {
          status = 'warning';
        }

        return {
          projectId: project.id,
          projectTitle: project.title,
          totalBudget,
          totalSpent,
          spentPercentage: Math.round(spentPercentage * 100) / 100,
          remainingBudget,
          status,
        };
      })
    );

    return budgetSummary;
  }

  async getLabourMaterialSplit(tenantId: string, filters?: { startDate?: Date; endDate?: Date; projectId?: string; categories?: string[] }, userRole?: string, userId?: string): Promise<{
    totalLabour: number;
    totalMaterial: number;
    labourPercentage: number;
    materialPercentage: number;
  }> {
    let whereConditions = [eq(costAllocations.tenantId, tenantId)];
    
    if (filters?.startDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} <= ${filters.endDate}`);
    }
    if (filters?.projectId) {
      whereConditions.push(eq(costAllocations.projectId, filters.projectId));
    }
    if (filters?.categories && filters.categories.length > 0) {
      whereConditions.push(sql`${lineItems.category} = ANY(${JSON.stringify(filters.categories)})`);
    }

    const [result] = await db
      .select({
        totalLabour: sum(costAllocations.labourCost),
        totalMaterial: sum(costAllocations.materialCost),
      })
      .from(costAllocations)
      .innerJoin(lineItems, eq(costAllocations.lineItemId, lineItems.id))
      .where(and(...whereConditions));

    const totalLabour = parseFloat(result?.totalLabour || "0") || 0;
    const totalMaterial = parseFloat(result?.totalMaterial || "0") || 0;
    const totalSpent = totalLabour + totalMaterial;

    const labourPercentage = totalSpent > 0 ? (totalLabour / totalSpent) * 100 : 0;
    const materialPercentage = totalSpent > 0 ? (totalMaterial / totalSpent) * 100 : 0;

    return {
      totalLabour,
      totalMaterial,
      labourPercentage: Math.round(labourPercentage * 100) / 100,
      materialPercentage: Math.round(materialPercentage * 100) / 100,
    };
  }

  async getCategorySpending(tenantId: string, filters?: { startDate?: Date; endDate?: Date; projectId?: string; categories?: string[] }): Promise<Array<{
    category: string;
    totalSpent: number;
    labourCost: number;
    materialCost: number;
    allocationCount: number;
  }>> {
    let whereConditions = [eq(costAllocations.tenantId, tenantId)];
    
    if (filters?.startDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} <= ${filters.endDate}`);
    }
    if (filters?.projectId) {
      whereConditions.push(eq(costAllocations.projectId, filters.projectId));
    }
    if (filters?.categories && filters.categories.length > 0) {
      whereConditions.push(sql`${lineItems.category} = ANY(${JSON.stringify(filters.categories)})`);
    }

    const results = await db
      .select({
        category: lineItems.category,
        totalSpent: sum(costAllocations.totalCost),
        labourCost: sum(costAllocations.labourCost),
        materialCost: sum(costAllocations.materialCost),
        allocationCount: count(costAllocations.id),
      })
      .from(costAllocations)
      .innerJoin(lineItems, eq(costAllocations.lineItemId, lineItems.id))
      .where(and(...whereConditions))
      .groupBy(lineItems.category)
      .orderBy(desc(sum(costAllocations.totalCost)));

    return results.map(result => ({
      category: result.category,
      totalSpent: parseFloat(result.totalSpent || "0") || 0,
      labourCost: parseFloat(result.labourCost || "0") || 0,
      materialCost: parseFloat(result.materialCost || "0") || 0,
      allocationCount: result.allocationCount || 0,
    }));
  }

  async getCostAllocationsWithFilters(tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    projectId?: string;
    changeOrderId?: string;
    categories?: string[];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    allocations: Array<CostAllocation & { 
      lineItemName: string;
      lineItemCategory: string;
      projectTitle: string;
      enteredByName: string;
      changeOrderId?: string | null;
      changeOrderDescription?: string | null;
      materialAllocations: (MaterialAllocation & { material: Material })[];
    }>;
    total: number;
  }> {
    let whereConditions = [eq(costAllocations.tenantId, tenantId)];
    
    if (filters?.startDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      whereConditions.push(sql`${costAllocations.dateIncurred} <= ${filters.endDate}`);
    }
    if (filters?.projectId) {
      whereConditions.push(eq(costAllocations.projectId, filters.projectId));
    }
    if (filters?.changeOrderId) {
      whereConditions.push(eq(costAllocations.changeOrderId, filters.changeOrderId));
    }
    if (filters?.categories && filters.categories.length > 0) {
      whereConditions.push(inArray(lineItems.category, filters.categories as any));
    }
    if (filters?.search) {
      whereConditions.push(sql`(${lineItems.name} ILIKE ${'%' + filters.search + '%'} OR ${projects.title} ILIKE ${'%' + filters.search + '%'} OR ${changeOrders.description} ILIKE ${'%' + filters.search + '%'})`);
    }

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count(costAllocations.id) })
      .from(costAllocations)
      .innerJoin(lineItems, eq(costAllocations.lineItemId, lineItems.id))
      .innerJoin(projects, eq(costAllocations.projectId, projects.id))
      .innerJoin(users, eq(costAllocations.enteredBy, users.id))
      .leftJoin(changeOrders, eq(costAllocations.changeOrderId, changeOrders.id))
      .where(and(...whereConditions));

    // Get allocations with pagination
    const allocationsQuery = db
      .select({
        allocation: costAllocations,
        lineItemName: lineItems.name,
        lineItemCategory: lineItems.category,
        projectTitle: projects.title,
        enteredByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        changeOrderId: changeOrders.id,
        changeOrderDescription: changeOrders.description,
      })
      .from(costAllocations)
      .innerJoin(lineItems, eq(costAllocations.lineItemId, lineItems.id))
      .innerJoin(projects, eq(costAllocations.projectId, projects.id))
      .innerJoin(users, eq(costAllocations.enteredBy, users.id))
      .leftJoin(changeOrders, eq(costAllocations.changeOrderId, changeOrders.id))
      .where(and(...whereConditions))
      .orderBy(desc(costAllocations.dateIncurred));

    if (filters?.limit) {
      allocationsQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      allocationsQuery.offset(filters.offset);
    }

    const allocationsData = await allocationsQuery;

    // Get material allocations for each cost allocation
    const allocationsWithMaterials = await Promise.all(
      allocationsData.map(async (item) => {
        const materialAllocationResults = await db
          .select({
            id: materialAllocations.id,
            costAllocationId: materialAllocations.costAllocationId,
            materialId: materialAllocations.materialId,
            quantity: materialAllocations.quantity,
            unitPrice: materialAllocations.unitPrice,
            total: materialAllocations.total,
            tenantId: materialAllocations.tenantId,
            createdAt: materialAllocations.createdAt,
            material: {
              id: materials.id,
              name: materials.name,
              unit: materials.unit,
              currentUnitPrice: materials.currentUnitPrice,
              supplier: materials.supplier,
              tenantId: materials.tenantId,
              createdAt: materials.createdAt,
              updatedAt: materials.updatedAt,
            }
          })
          .from(materialAllocations)
          .innerJoin(materials, eq(materialAllocations.materialId, materials.id))
          .where(eq(materialAllocations.costAllocationId, item.allocation.id));

        return {
          ...item.allocation,
          lineItemName: item.lineItemName,
          lineItemCategory: item.lineItemCategory,
          projectTitle: item.projectTitle,
          enteredByName: item.enteredByName,
          changeOrderId: item.changeOrderId,
          changeOrderDescription: item.changeOrderDescription,
          materialAllocations: materialAllocationResults,
        };
      })
    );

    return {
      allocations: allocationsWithMaterials,
      total: totalResult?.count || 0,
    };
  }

  // Line items operations
  async getLineItems(tenantId: string): Promise<LineItem[]> {
    return await db
      .select()
      .from(lineItems)
      .where(eq(lineItems.tenantId, tenantId))
      .orderBy(lineItems.category, lineItems.name);
  }

  async getLineItem(id: string, tenantId: string): Promise<LineItem | undefined> {
    const [lineItem] = await db
      .select()
      .from(lineItems)
      .where(and(eq(lineItems.id, id), eq(lineItems.tenantId, tenantId)));
    return lineItem;
  }

  async createLineItem(lineItem: InsertLineItem): Promise<LineItem> {
    const [newLineItem] = await db
      .insert(lineItems)
      .values(lineItem)
      .returning();
    return newLineItem;
  }

  async updateLineItem(id: string, lineItem: Partial<InsertLineItem>, tenantId: string): Promise<LineItem | undefined> {
    const [updatedLineItem] = await db
      .update(lineItems)
      .set({ ...lineItem, updatedAt: new Date() })
      .where(and(eq(lineItems.id, id), eq(lineItems.tenantId, tenantId)))
      .returning();
    return updatedLineItem;
  }

  // Materials operations
  async getMaterials(tenantId: string): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(eq(materials.tenantId, tenantId))
      .orderBy(materials.name);
  }

  async getMaterial(id: string, tenantId: string): Promise<Material | undefined> {
    const [material] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db
      .insert(materials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async updateMaterial(id: string, material: Partial<InsertMaterial>, tenantId: string): Promise<Material | undefined> {
    const [updatedMaterial] = await db
      .update(materials)
      .set({ ...material, updatedAt: new Date() })
      .where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
      .returning();
    return updatedMaterial;
  }

  // Cost allocation operations
  async getCostAllocations(tenantId: string): Promise<CostAllocation[]> {
    return await db
      .select()
      .from(costAllocations)
      .where(eq(costAllocations.tenantId, tenantId))
      .orderBy(desc(costAllocations.createdAt));
  }

  async getCostAllocationsByProject(projectId: string, tenantId: string): Promise<(CostAllocation & { materialAllocations: (MaterialAllocation & { material: Material })[] })[]> {
    // Get cost allocations for the project
    const allocations = await db
      .select()
      .from(costAllocations)
      .where(and(
        eq(costAllocations.projectId, projectId),
        eq(costAllocations.tenantId, tenantId)
      ))
      .orderBy(desc(costAllocations.dateIncurred));

    // Get material allocations with material details for each cost allocation
    const allocationsWithMaterials = await Promise.all(
      allocations.map(async (allocation) => {
        const materialAllocationResults = await db
          .select({
            id: materialAllocations.id,
            costAllocationId: materialAllocations.costAllocationId,
            materialId: materialAllocations.materialId,
            quantity: materialAllocations.quantity,
            unitPrice: materialAllocations.unitPrice,
            total: materialAllocations.total,
            tenantId: materialAllocations.tenantId,
            createdAt: materialAllocations.createdAt,
            material: {
              id: materials.id,
              name: materials.name,
              unit: materials.unit,
              currentUnitPrice: materials.currentUnitPrice,
              supplier: materials.supplier,
              tenantId: materials.tenantId,
              createdAt: materials.createdAt,
              updatedAt: materials.updatedAt,
            }
          })
          .from(materialAllocations)
          .innerJoin(materials, eq(materialAllocations.materialId, materials.id))
          .where(eq(materialAllocations.costAllocationId, allocation.id));

        return {
          ...allocation,
          materialAllocations: materialAllocationResults
        };
      })
    );

    return allocationsWithMaterials;
  }

  async createCostAllocation(costAllocation: InsertCostAllocation, materialAllocationsData: InsertMaterialAllocation[] = []): Promise<CostAllocation> {
    const [newCostAllocation] = await db
      .insert(costAllocations)
      .values(costAllocation)
      .returning();

    // Create material allocations if provided
    if (materialAllocationsData.length > 0) {
      const materialAllocationsWithCostId = materialAllocationsData.map(allocation => ({
        ...allocation,
        costAllocationId: newCostAllocation.id,
      }));

      await db
        .insert(materialAllocations)
        .values(materialAllocationsWithCostId);
    }

    return newCostAllocation;
  }

  async updateCostAllocation(id: string, costAllocation: Partial<InsertCostAllocation>, tenantId: string): Promise<CostAllocation | undefined> {
    const [updatedCostAllocation] = await db
      .update(costAllocations)
      .set({ ...costAllocation, updatedAt: new Date() })
      .where(and(eq(costAllocations.id, id), eq(costAllocations.tenantId, tenantId)))
      .returning();
    return updatedCostAllocation;
  }

  // Approval workflow operations
  async getApprovalWorkflows(tenantId: string): Promise<Array<ApprovalWorkflow & { approver?: User }>> {
    return await db
      .select({
        id: approvalWorkflows.id,
        relatedTable: approvalWorkflows.relatedTable,
        recordId: approvalWorkflows.recordId,
        status: approvalWorkflows.status,
        approverId: approvalWorkflows.approverId,
        comments: approvalWorkflows.comments,
        tenantId: approvalWorkflows.tenantId,
        createdAt: approvalWorkflows.createdAt,
        updatedAt: approvalWorkflows.updatedAt,
        approver: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
      })
      .from(approvalWorkflows)
      .leftJoin(users, eq(approvalWorkflows.approverId, users.id))
      .where(eq(approvalWorkflows.tenantId, tenantId))
      .orderBy(desc(approvalWorkflows.createdAt));
  }

  async getPendingApprovals(tenantId: string, table?: 'cost_allocations'): Promise<Array<ApprovalWorkflow & { 
    approver?: User;
    costAllocation?: {
      id: string | null;
      projectId: string | null;
      lineItemId: string | null;
      labourCost: string | null;
      materialCost: string | null;
      quantity: string | null;
      unitCost: string | null;
      totalCost: string | null;
      dateIncurred: Date | null;
      enteredBy: string | null;
      tenantId: string | null;
      status: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      lineItemName: string | null;
      projectTitle: string | null;
      enteredByName: string | null;
    };
  }>> {
    // Build where conditions based on parameters
    const whereConditions = [
      eq(approvalWorkflows.tenantId, tenantId),
      eq(approvalWorkflows.status, 'pending')
    ];

    if (table) {
      whereConditions.push(eq(approvalWorkflows.relatedTable, table));
    }

    const query = db
      .select({
        id: approvalWorkflows.id,
        relatedTable: approvalWorkflows.relatedTable,
        recordId: approvalWorkflows.recordId,
        status: approvalWorkflows.status,
        approverId: approvalWorkflows.approverId,
        comments: approvalWorkflows.comments,
        tenantId: approvalWorkflows.tenantId,
        createdAt: approvalWorkflows.createdAt,
        updatedAt: approvalWorkflows.updatedAt,
        approver: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        costAllocation: {
          id: costAllocations.id,
          projectId: costAllocations.projectId,
          lineItemId: costAllocations.lineItemId,
          labourCost: costAllocations.labourCost,
          materialCost: costAllocations.materialCost,
          quantity: costAllocations.quantity,
          unitCost: costAllocations.unitCost,
          totalCost: costAllocations.totalCost,
          dateIncurred: costAllocations.dateIncurred,
          enteredBy: costAllocations.enteredBy,
          tenantId: costAllocations.tenantId,
          status: costAllocations.status,
          createdAt: costAllocations.createdAt,
          updatedAt: costAllocations.updatedAt,
          lineItemName: lineItems.name,
          projectTitle: projects.title,
          enteredByName: sql<string | null>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        },
      })
      .from(approvalWorkflows)
      .leftJoin(users, eq(approvalWorkflows.approverId, users.id))
      .leftJoin(costAllocations, eq(approvalWorkflows.recordId, costAllocations.id))
      .leftJoin(lineItems, eq(costAllocations.lineItemId, lineItems.id))
      .leftJoin(projects, eq(costAllocations.projectId, projects.id))
      .where(and(...whereConditions))
      .orderBy(desc(approvalWorkflows.createdAt));

    return await query;
  }

  async createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [newWorkflow] = await db
      .insert(approvalWorkflows)
      .values(workflow)
      .returning();
    return newWorkflow;
  }

  async updateApprovalWorkflowStatus(recordId: string, status: 'approved' | 'rejected', approverId: string, comments?: string, tenantId?: string): Promise<ApprovalWorkflow | undefined> {
    const whereConditions = [eq(approvalWorkflows.recordId, recordId)];
    if (tenantId) {
      whereConditions.push(eq(approvalWorkflows.tenantId, tenantId));
    }

    const [updatedWorkflow] = await db
      .update(approvalWorkflows)
      .set({ 
        status,
        approverId,
        comments,
        updatedAt: new Date()
      })
      .where(and(...whereConditions))
      .returning();
    return updatedWorkflow;
  }

  async updateCostAllocationStatus(id: string, status: 'draft' | 'pending' | 'approved' | 'rejected', tenantId: string): Promise<CostAllocation | undefined> {
    const [updatedCostAllocation] = await db
      .update(costAllocations)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(and(eq(costAllocations.id, id), eq(costAllocations.tenantId, tenantId)))
      .returning();
    return updatedCostAllocation;
  }

  // Budget alert operations
  async getBudgetAlerts(tenantId: string, status?: 'active' | 'acknowledged' | 'resolved'): Promise<Array<BudgetAlert & { project: Project }>> {
    let whereConditions = [eq(budgetAlerts.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(budgetAlerts.status, status));
    }

    const alerts = await db
      .select({
        id: budgetAlerts.id,
        projectId: budgetAlerts.projectId,
        type: budgetAlerts.type,
        status: budgetAlerts.status,
        severity: budgetAlerts.severity,
        message: budgetAlerts.message,
        spentPercentage: budgetAlerts.spentPercentage,
        remainingBudget: budgetAlerts.remainingBudget,
        triggeredBy: budgetAlerts.triggeredBy,
        acknowledgedBy: budgetAlerts.acknowledgedBy,
        acknowledgedAt: budgetAlerts.acknowledgedAt,
        tenantId: budgetAlerts.tenantId,
        createdAt: budgetAlerts.createdAt,
        updatedAt: budgetAlerts.updatedAt,
        // Project data
        project: {
          id: projects.id,
          title: projects.title,
          description: projects.description,
          startDate: projects.startDate,
          endDate: projects.endDate,
          budget: projects.budget,
          consumedAmount: projects.consumedAmount,
          revenue: projects.revenue,
          managerId: projects.managerId,
          tenantId: projects.tenantId,
          status: projects.status,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        }
      })
      .from(budgetAlerts)
      .innerJoin(projects, eq(budgetAlerts.projectId, projects.id))
      .where(and(...whereConditions))
      .orderBy(desc(budgetAlerts.createdAt));

    return alerts;
  }

  async getBudgetAlertsByProject(projectId: string, tenantId: string): Promise<Array<BudgetAlert & { project: Project }>> {
    const alerts = await db
      .select({
        id: budgetAlerts.id,
        projectId: budgetAlerts.projectId,
        type: budgetAlerts.type,
        status: budgetAlerts.status,
        severity: budgetAlerts.severity,
        message: budgetAlerts.message,
        spentPercentage: budgetAlerts.spentPercentage,
        remainingBudget: budgetAlerts.remainingBudget,
        triggeredBy: budgetAlerts.triggeredBy,
        acknowledgedBy: budgetAlerts.acknowledgedBy,
        acknowledgedAt: budgetAlerts.acknowledgedAt,
        tenantId: budgetAlerts.tenantId,
        createdAt: budgetAlerts.createdAt,
        updatedAt: budgetAlerts.updatedAt,
        // Project data
        project: {
          id: projects.id,
          title: projects.title,
          description: projects.description,
          startDate: projects.startDate,
          endDate: projects.endDate,
          budget: projects.budget,
          consumedAmount: projects.consumedAmount,
          revenue: projects.revenue,
          managerId: projects.managerId,
          tenantId: projects.tenantId,
          status: projects.status,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        }
      })
      .from(budgetAlerts)
      .innerJoin(projects, eq(budgetAlerts.projectId, projects.id))
      .where(and(
        eq(budgetAlerts.projectId, projectId),
        eq(budgetAlerts.tenantId, tenantId)
      ))
      .orderBy(desc(budgetAlerts.createdAt));

    return alerts;
  }

  async createBudgetAlert(alert: InsertBudgetAlert): Promise<BudgetAlert> {
    const [newAlert] = await db
      .insert(budgetAlerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async acknowledgeBudgetAlert(alertId: string, acknowledgedBy: string, tenantId: string): Promise<BudgetAlert | undefined> {
    const [updatedAlert] = await db
      .update(budgetAlerts)
      .set({
        status: 'acknowledged',
        acknowledgedBy,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(budgetAlerts.id, alertId),
        eq(budgetAlerts.tenantId, tenantId)
      ))
      .returning();
    return updatedAlert;
  }

  async resolveBudgetAlert(alertId: string, tenantId: string): Promise<BudgetAlert | undefined> {
    const [updatedAlert] = await db
      .update(budgetAlerts)
      .set({
        status: 'resolved',
        updatedAt: new Date()
      })
      .where(and(
        eq(budgetAlerts.id, alertId),
        eq(budgetAlerts.tenantId, tenantId)
      ))
      .returning();
    return updatedAlert;
  }

  async checkAndCreateBudgetAlerts(projectId: string, tenantId: string): Promise<BudgetAlert[]> {
    const project = await this.getProject(projectId, tenantId);
    if (!project) return [];

    // Get current spent amount from cost allocations
    const [spentResult] = await db
      .select({
        totalSpent: sum(costAllocations.totalCost),
      })
      .from(costAllocations)
      .where(and(
        eq(costAllocations.projectId, projectId),
        eq(costAllocations.tenantId, tenantId)
      ));

    const totalBudget = parseFloat(project.budget) || 0;
    const totalSpent = parseFloat(spentResult?.totalSpent || "0") || 0;
    const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const remainingBudget = totalBudget - totalSpent;

    const createdAlerts: BudgetAlert[] = [];

    // Check if we need to create new alerts
    // First check for critical threshold (95%)
    if (spentPercentage >= 95) {
      // Check if critical alert already exists
      const existingCriticalAlert = await db
        .select()
        .from(budgetAlerts)
        .where(and(
          eq(budgetAlerts.projectId, projectId),
          eq(budgetAlerts.tenantId, tenantId),
          eq(budgetAlerts.type, 'critical_threshold'),
          eq(budgetAlerts.status, 'active')
        ))
        .limit(1);

      if (existingCriticalAlert.length === 0) {
        const alertMessage = totalSpent > totalBudget
          ? `CRITICAL: Project "${project.title}" is over budget by ₦${Math.abs(remainingBudget).toLocaleString()} (${spentPercentage.toFixed(1)}% spent)`
          : `CRITICAL: Project "${project.title}" budget critically low - ${spentPercentage.toFixed(1)}% spent, only ₦${remainingBudget.toLocaleString()} remaining`;

        const newAlert = await this.createBudgetAlert({
          projectId,
          type: totalSpent > totalBudget ? 'over_budget' : 'critical_threshold',
          severity: 'critical',
          message: alertMessage,
          spentPercentage: spentPercentage.toString(),
          remainingBudget: remainingBudget.toString(),
          tenantId
        });
        createdAlerts.push(newAlert);
      }
    }
    // Check for warning threshold (80%)
    else if (spentPercentage >= 80) {
      // Check if warning alert already exists
      const existingWarningAlert = await db
        .select()
        .from(budgetAlerts)
        .where(and(
          eq(budgetAlerts.projectId, projectId),
          eq(budgetAlerts.tenantId, tenantId),
          eq(budgetAlerts.type, 'warning_threshold'),
          eq(budgetAlerts.status, 'active')
        ))
        .limit(1);

      if (existingWarningAlert.length === 0) {
        const alertMessage = `WARNING: Project "${project.title}" approaching budget limit - ${spentPercentage.toFixed(1)}% spent, ₦${remainingBudget.toLocaleString()} remaining`;

        const newAlert = await this.createBudgetAlert({
          projectId,
          type: 'warning_threshold',
          severity: 'warning',
          message: alertMessage,
          spentPercentage: spentPercentage.toString(),
          remainingBudget: remainingBudget.toString(),
          tenantId
        });
        createdAlerts.push(newAlert);
      }
    }

    return createdAlerts;
  }

  // Budget amendment operations
  async getBudgetAmendments(tenantId: string, projectId?: string, status?: 'draft' | 'pending' | 'approved' | 'rejected', userRole?: string, userId?: string): Promise<Array<BudgetAmendment & { project: Project; proposer: User; approver?: User }>> {
    // Build where conditions with strict tenant isolation
    let whereConditions = [eq(budgetAmendments.tenantId, tenantId)];
    
    if (projectId) {
      whereConditions.push(eq(budgetAmendments.projectId, projectId));
    }
    
    if (status) {
      whereConditions.push(eq(budgetAmendments.status, status));
    }

    // Role-based filtering for data security
    if (userRole && !['admin', 'console_manager'].includes(userRole) && userId) {
      // Non-admin users can only see amendments for projects they are involved with
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${projects} 
          WHERE ${projects.id} = ${budgetAmendments.projectId}
          AND ${projects.tenantId} = ${tenantId}
          AND (${projects.managerId} = ${userId} 
               OR EXISTS (
                 SELECT 1 FROM ${fundAllocations} 
                 WHERE ${fundAllocations.projectId} = ${projects.id} 
                 AND ${fundAllocations.tenantId} = ${tenantId}
                 AND (${fundAllocations.fromUserId} = ${userId} OR ${fundAllocations.toUserId} = ${userId})
               )
               OR ${budgetAmendments.proposedBy} = ${userId})
        )`
      );
    }

    const results = await db
      .select({
        // Budget amendment fields
        id: budgetAmendments.id,
        projectId: budgetAmendments.projectId,
        amountAdded: budgetAmendments.amountAdded,
        reason: budgetAmendments.reason,
        proposedBy: budgetAmendments.proposedBy,
        status: budgetAmendments.status,
        approvedBy: budgetAmendments.approvedBy,
        approvedAt: budgetAmendments.approvedAt,
        tenantId: budgetAmendments.tenantId,
        createdAt: budgetAmendments.createdAt,
        updatedAt: budgetAmendments.updatedAt,
        // Project data
        project: {
          id: projects.id,
          title: projects.title,
          description: projects.description,
          startDate: projects.startDate,
          endDate: projects.endDate,
          budget: projects.budget,
          consumedAmount: projects.consumedAmount,
          revenue: projects.revenue,
          managerId: projects.managerId,
          tenantId: projects.tenantId,
          status: projects.status,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        },
        // Proposer data
        proposer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        // Approver data (using SQL for aliased table)
        approver: {
          id: sql<string | null>`approver_user.id`,
          email: sql<string | null>`approver_user.email`,
          firstName: sql<string | null>`approver_user.first_name`,
          lastName: sql<string | null>`approver_user.last_name`,
          role: sql<string | null>`approver_user.role`,
        },
      })
      .from(budgetAmendments)
      .leftJoin(projects, eq(budgetAmendments.projectId, projects.id))
      .leftJoin(users, eq(budgetAmendments.proposedBy, users.id))
      .leftJoin(sql`users as approver_user`, sql`budget_amendments.approved_by = approver_user.id`)
      .where(and(...whereConditions))
      .orderBy(desc(budgetAmendments.createdAt));
    
    return results.map(result => ({
      id: result.id,
      projectId: result.projectId,
      amountAdded: result.amountAdded,
      reason: result.reason,
      proposedBy: result.proposedBy,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt,
      tenantId: result.tenantId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      project: result.project!,
      proposer: result.proposer,
      approver: result.approver?.id ? {
        id: result.approver.id!,
        email: result.approver.email!,
        firstName: result.approver.firstName!,
        lastName: result.approver.lastName!,
        role: result.approver.role!,
      } as User : undefined,
    }));
  }

  async getBudgetAmendmentsByProject(projectId: string, tenantId: string): Promise<Array<BudgetAmendment & { proposer: User; approver?: User }>> {
    const results = await db
      .select({
        // Budget amendment fields
        id: budgetAmendments.id,
        projectId: budgetAmendments.projectId,
        amountAdded: budgetAmendments.amountAdded,
        reason: budgetAmendments.reason,
        proposedBy: budgetAmendments.proposedBy,
        status: budgetAmendments.status,
        approvedBy: budgetAmendments.approvedBy,
        approvedAt: budgetAmendments.approvedAt,
        tenantId: budgetAmendments.tenantId,
        createdAt: budgetAmendments.createdAt,
        updatedAt: budgetAmendments.updatedAt,
        // Proposer data
        proposer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        // Approver data (using SQL for aliased table)
        approver: {
          id: sql<string | null>`approver_user.id`,
          email: sql<string | null>`approver_user.email`,
          firstName: sql<string | null>`approver_user.first_name`,
          lastName: sql<string | null>`approver_user.last_name`,
          role: sql<string | null>`approver_user.role`,
        },
      })
      .from(budgetAmendments)
      .leftJoin(users, eq(budgetAmendments.proposedBy, users.id))
      .leftJoin(sql`users as approver_user`, sql`budget_amendments.approved_by = approver_user.id`)
      .where(and(
        eq(budgetAmendments.projectId, projectId),
        eq(budgetAmendments.tenantId, tenantId)
      ))
      .orderBy(desc(budgetAmendments.createdAt));

    return results.map(result => ({
      id: result.id,
      projectId: result.projectId,
      amountAdded: result.amountAdded,
      reason: result.reason,
      proposedBy: result.proposedBy,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt,
      tenantId: result.tenantId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      proposer: result.proposer,
      approver: result.approver?.id ? {
        id: result.approver.id!,
        email: result.approver.email!,
        firstName: result.approver.firstName!,
        lastName: result.approver.lastName!,
        role: result.approver.role!,
      } as User : undefined,
    }));
  }

  async createBudgetAmendment(amendment: InsertBudgetAmendment): Promise<BudgetAmendment> {
    const [newAmendment] = await db
      .insert(budgetAmendments)
      .values(amendment)
      .returning();
    return newAmendment;
  }

  async updateBudgetAmendmentStatus(id: string, status: 'pending' | 'approved' | 'rejected', approvedBy?: string, tenantId?: string): Promise<BudgetAmendment | undefined> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    // Build where conditions
    let whereConditions = [eq(budgetAmendments.id, id)];
    if (tenantId) {
      whereConditions.push(eq(budgetAmendments.tenantId, tenantId));
    }

    const [updatedAmendment] = await db
      .update(budgetAmendments)
      .set(updateData)
      .where(and(...whereConditions))
      .returning();
      
    return updatedAmendment;
  }

  // Change order operations
  async getChangeOrders(tenantId: string, projectId?: string, status?: 'draft' | 'pending' | 'approved' | 'rejected', userRole?: string, userId?: string): Promise<Array<ChangeOrder & { project: Project; proposer: User; approver?: User }>> {
    // Build where conditions with strict tenant isolation
    let whereConditions = [eq(changeOrders.tenantId, tenantId)];
    
    if (projectId) {
      whereConditions.push(eq(changeOrders.projectId, projectId));
    }
    
    if (status) {
      whereConditions.push(eq(changeOrders.status, status));
    }

    // Role-based filtering for data security
    if (userRole && !['admin', 'console_manager'].includes(userRole) && userId) {
      // Non-admin users can only see change orders for projects they are involved with
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${projects} 
          WHERE ${projects.id} = ${changeOrders.projectId}
          AND ${projects.tenantId} = ${tenantId}
          AND (${projects.managerId} = ${userId} 
               OR EXISTS (
                 SELECT 1 FROM ${fundAllocations} 
                 WHERE ${fundAllocations.projectId} = ${projects.id} 
                 AND ${fundAllocations.tenantId} = ${tenantId}
                 AND (${fundAllocations.fromUserId} = ${userId} OR ${fundAllocations.toUserId} = ${userId})
               )
               OR ${changeOrders.proposedBy} = ${userId})
        )`
      );
    }

    const results = await db
      .select({
        // Change order fields
        id: changeOrders.id,
        projectId: changeOrders.projectId,
        description: changeOrders.description,
        costImpact: changeOrders.costImpact,
        proposedBy: changeOrders.proposedBy,
        status: changeOrders.status,
        approvedBy: changeOrders.approvedBy,
        approvedAt: changeOrders.approvedAt,
        tenantId: changeOrders.tenantId,
        createdAt: changeOrders.createdAt,
        updatedAt: changeOrders.updatedAt,
        // Project data
        project: {
          id: projects.id,
          title: projects.title,
          description: projects.description,
          startDate: projects.startDate,
          endDate: projects.endDate,
          budget: projects.budget,
          consumedAmount: projects.consumedAmount,
          revenue: projects.revenue,
          managerId: projects.managerId,
          tenantId: projects.tenantId,
          status: projects.status,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        },
        // Proposer data
        proposer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        // Approver data (using SQL for aliased table)
        approver: {
          id: sql<string | null>`approver_user.id`,
          email: sql<string | null>`approver_user.email`,
          firstName: sql<string | null>`approver_user.first_name`,
          lastName: sql<string | null>`approver_user.last_name`,
          role: sql<string | null>`approver_user.role`,
        },
      })
      .from(changeOrders)
      .leftJoin(projects, eq(changeOrders.projectId, projects.id))
      .leftJoin(users, eq(changeOrders.proposedBy, users.id))
      .leftJoin(sql`users as approver_user`, sql`change_orders.approved_by = approver_user.id`)
      .where(and(...whereConditions))
      .orderBy(desc(changeOrders.createdAt));
    
    return results.map(result => ({
      id: result.id,
      projectId: result.projectId,
      description: result.description,
      costImpact: result.costImpact,
      proposedBy: result.proposedBy,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt,
      tenantId: result.tenantId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      project: result.project!,
      proposer: result.proposer,
      approver: result.approver?.id ? {
        id: result.approver.id!,
        email: result.approver.email!,
        firstName: result.approver.firstName!,
        lastName: result.approver.lastName!,
        role: result.approver.role!,
      } as User : undefined,
    }));
  }

  async getChangeOrdersByProject(projectId: string, tenantId: string): Promise<Array<ChangeOrder & { proposer: User; approver?: User }>> {
    const results = await db
      .select({
        // Change order fields
        id: changeOrders.id,
        projectId: changeOrders.projectId,
        description: changeOrders.description,
        costImpact: changeOrders.costImpact,
        proposedBy: changeOrders.proposedBy,
        status: changeOrders.status,
        approvedBy: changeOrders.approvedBy,
        approvedAt: changeOrders.approvedAt,
        tenantId: changeOrders.tenantId,
        createdAt: changeOrders.createdAt,
        updatedAt: changeOrders.updatedAt,
        // Proposer data
        proposer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        },
        // Approver data (using SQL for aliased table)
        approver: {
          id: sql<string | null>`approver_user.id`,
          email: sql<string | null>`approver_user.email`,
          firstName: sql<string | null>`approver_user.first_name`,
          lastName: sql<string | null>`approver_user.last_name`,
          role: sql<string | null>`approver_user.role`,
        },
      })
      .from(changeOrders)
      .leftJoin(users, eq(changeOrders.proposedBy, users.id))
      .leftJoin(sql`users as approver_user`, sql`change_orders.approved_by = approver_user.id`)
      .where(and(
        eq(changeOrders.projectId, projectId),
        eq(changeOrders.tenantId, tenantId)
      ))
      .orderBy(desc(changeOrders.createdAt));

    return results.map(result => ({
      id: result.id,
      projectId: result.projectId,
      description: result.description,
      costImpact: result.costImpact,
      proposedBy: result.proposedBy,
      status: result.status,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt,
      tenantId: result.tenantId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      proposer: result.proposer,
      approver: result.approver?.id ? {
        id: result.approver.id!,
        email: result.approver.email!,
        firstName: result.approver.firstName!,
        lastName: result.approver.lastName!,
        role: result.approver.role!,
      } as User : undefined,
    }));
  }

  async createChangeOrder(changeOrder: InsertChangeOrder): Promise<ChangeOrder> {
    const [newChangeOrder] = await db
      .insert(changeOrders)
      .values(changeOrder)
      .returning();
    return newChangeOrder;
  }

  async updateChangeOrderStatus(id: string, status: 'pending' | 'approved' | 'rejected', approvedBy?: string, tenantId?: string): Promise<ChangeOrder | undefined> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    // Build where conditions
    let whereConditions = [eq(changeOrders.id, id)];
    if (tenantId) {
      whereConditions.push(eq(changeOrders.tenantId, tenantId));
    }

    const [updatedChangeOrder] = await db
      .update(changeOrders)
      .set(updateData)
      .where(and(...whereConditions))
      .returning();
      
    return updatedChangeOrder;
  }

  // Project budget history operations
  async getProjectBudgetHistory(projectId: string, tenantId: string): Promise<{
    originalBudget: number;
    totalAmendments: number;
    currentBudget: number;
    amendments: Array<BudgetAmendment & { proposer: User; approver?: User }>;
    changeOrders: Array<ChangeOrder & { proposer: User; approver?: User }>;
  }> {
    // Get project details
    const project = await this.getProject(projectId, tenantId);
    if (!project) {
      throw new Error('Project not found');
    }

    const originalBudget = parseFloat(project.budget);

    // Get approved budget amendments
    const approvedAmendments = await this.getBudgetAmendmentsByProject(projectId, tenantId);
    const approvedAmendmentsOnly = approvedAmendments.filter(a => a.status === 'approved');
    
    // Calculate total amendments
    const totalAmendments = approvedAmendmentsOnly.reduce((sum, amendment) => {
      return sum + parseFloat(amendment.amountAdded);
    }, 0);

    // Get change orders for context
    const projectChangeOrders = await this.getChangeOrdersByProject(projectId, tenantId);

    return {
      originalBudget,
      totalAmendments,
      currentBudget: originalBudget + totalAmendments,
      amendments: approvedAmendments,
      changeOrders: projectChangeOrders,
    };
  }
}

export const storage = new DatabaseStorage();
