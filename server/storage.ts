import {
  users,
  projects,
  fundAllocations,
  transactions,
  fundTransfers,
  auditLogs,
  companies,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count } from "drizzle-orm";

export interface IStorage {
  // Company operations (for console managers)
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string, tenantId: string): Promise<User | undefined>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to insert or update by ID first
      const [user] = await db
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
}

export const storage = new DatabaseStorage();
