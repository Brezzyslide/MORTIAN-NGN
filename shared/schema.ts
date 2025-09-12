import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  pgEnum,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Companies/Tenants table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  industry: varchar("industry", { length: 100 }),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("basic"),
  status: varchar("status", { length: 50 }).default("active"),
  createdBy: varchar("created_by"), // Console manager who created this company
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["console_manager", "manager", "team_leader", "user"]);

// User status enum
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);

// Users table (required for Replit Auth)
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("user"),
  managerId: varchar("manager_id").references(() => users.id),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: decimal("budget", { precision: 15, scale: 2 }).notNull(),
  consumedAmount: decimal("consumed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  revenue: decimal("revenue", { precision: 15, scale: 2 }).default("0"),
  managerId: varchar("manager_id").references(() => users.id).notNull(),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Line item categories enum - Extended for construction
export const lineItemCategoryEnum = pgEnum("line_item_category", [
  "development_resources",
  "design_tools", 
  "testing_qa",
  "infrastructure",
  "marketing",
  "operations",
  "miscellaneous",
  // Construction categories
  "land_purchase",
  "site_preparation", 
  "foundation",
  "structural",
  "roofing",
  "electrical",
  "plumbing",
  "finishing",
  "external_works"
]);

// Approval workflow status enum
export const approvalStatusEnum = pgEnum("approval_status", [
  "draft",
  "pending", 
  "approved",
  "rejected"
]);

// Workflow table types enum
export const workflowTableEnum = pgEnum("workflow_table", [
  "cost_allocations",
  "budget_amendments", 
  "change_orders"
]);

// Fund allocations table
export const fundAllocations = pgTable("fund_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: lineItemCategoryEnum("category").notNull(),
  description: text("description"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: varchar("status").default("approved"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transaction types enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "allocation",
  "expense", 
  "transfer",
  "revenue"
]);

// Transactions table
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: lineItemCategoryEnum("category").notNull(),
  description: text("description"),
  receiptUrl: varchar("receipt_url"),
  allocationId: uuid("allocation_id").references(() => fundAllocations.id),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: varchar("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fund transfers table
export const fundTransfers = pgTable("fund_transfers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  category: lineItemCategoryEnum("category").notNull(),
  purpose: text("purpose"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: varchar("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Line items table
export const lineItems = pgTable("line_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: lineItemCategoryEnum("category").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Materials table
export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(), // m², pcs, kg, etc.
  currentUnitPrice: decimal("current_unit_price", { precision: 15, scale: 2 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost allocations table (construction-specific)
export const costAllocations = pgTable("cost_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  lineItemId: uuid("line_item_id").references(() => lineItems.id).notNull(),
  labourCost: decimal("labour_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  materialCost: decimal("material_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }).notNull(),
  dateIncurred: timestamp("date_incurred").defaultNow(),
  enteredBy: varchar("entered_by").references(() => users.id).notNull(),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  status: approvalStatusEnum("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Material allocations table
export const materialAllocations = pgTable("material_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  costAllocationId: uuid("cost_allocation_id").references(() => costAllocations.id).notNull(),
  materialId: uuid("material_id").references(() => materials.id).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull(),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Approval workflows table
export const approvalWorkflows = pgTable("approval_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  relatedTable: workflowTableEnum("related_table").notNull(),
  recordId: varchar("record_id").notNull(), // ID of the record being approved
  status: approvalStatusEnum("status").notNull().default("draft"),
  approverId: varchar("approver_id").references(() => users.id),
  comments: text("comments"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Budget amendments table
export const budgetAmendments = pgTable("budget_amendments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  amountAdded: decimal("amount_added", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Change orders table
export const changeOrders = pgTable("change_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  description: text("description").notNull(),
  impactOnBudget: decimal("impact_on_budget", { precision: 15, scale: 2 }).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log actions enum - Extended for construction
export const auditActionEnum = pgEnum("audit_action", [
  "project_created",
  "project_updated", 
  "fund_allocated",
  "expense_submitted",
  "fund_transferred",
  "user_created",
  "user_updated",
  "revenue_added",
  // Construction audit actions
  "cost_allocated",
  "material_added",
  "budget_amended",
  "change_order_created",
  "approval_workflow_updated"
]);

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  details: jsonb("details"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager_subordinates"
  }),
  subordinates: many(users, {
    relationName: "manager_subordinates"
  }),
  projects: many(projects),
  allocationsFrom: many(fundAllocations, {
    relationName: "allocations_from"
  }),
  allocationsTo: many(fundAllocations, {
    relationName: "allocations_to"
  }),
  transactions: many(transactions),
  transfersFrom: many(fundTransfers, {
    relationName: "transfers_from"
  }),
  transfersTo: many(fundTransfers, {
    relationName: "transfers_to"
  }),
  auditLogs: many(auditLogs),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
  }),
  allocations: many(fundAllocations),
  transactions: many(transactions),
  transfers: many(fundTransfers),
  auditLogs: many(auditLogs),
}));

export const fundAllocationsRelations = relations(fundAllocations, ({ one, many }) => ({
  project: one(projects, {
    fields: [fundAllocations.projectId],
    references: [projects.id],
  }),
  fromUser: one(users, {
    fields: [fundAllocations.fromUserId],
    references: [users.id],
    relationName: "allocations_from"
  }),
  toUser: one(users, {
    fields: [fundAllocations.toUserId],
    references: [users.id],
    relationName: "allocations_to"
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  project: one(projects, {
    fields: [transactions.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  allocation: one(fundAllocations, {
    fields: [transactions.allocationId],
    references: [fundAllocations.id],
  }),
}));

export const fundTransfersRelations = relations(fundTransfers, ({ one }) => ({
  project: one(projects, {
    fields: [fundTransfers.projectId],
    references: [projects.id],
  }),
  fromUser: one(users, {
    fields: [fundTransfers.fromUserId],
    references: [users.id],
    relationName: "transfers_from"
  }),
  toUser: one(users, {
    fields: [fundTransfers.toUserId],
    references: [users.id],
    relationName: "transfers_to"
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [auditLogs.projectId],
    references: [projects.id],
  }),
}));

// New table relations
export const lineItemsRelations = relations(lineItems, ({ many }) => ({
  costAllocations: many(costAllocations),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  materialAllocations: many(materialAllocations),
}));

export const costAllocationsRelations = relations(costAllocations, ({ one, many }) => ({
  project: one(projects, {
    fields: [costAllocations.projectId],
    references: [projects.id],
  }),
  lineItem: one(lineItems, {
    fields: [costAllocations.lineItemId],
    references: [lineItems.id],
  }),
  enteredByUser: one(users, {
    fields: [costAllocations.enteredBy],
    references: [users.id],
  }),
  materialAllocations: many(materialAllocations),
}));

export const materialAllocationsRelations = relations(materialAllocations, ({ one }) => ({
  costAllocation: one(costAllocations, {
    fields: [materialAllocations.costAllocationId],
    references: [costAllocations.id],
  }),
  material: one(materials, {
    fields: [materialAllocations.materialId],
    references: [materials.id],
  }),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one }) => ({
  approver: one(users, {
    fields: [approvalWorkflows.approverId],
    references: [users.id],
  }),
}));

export const budgetAmendmentsRelations = relations(budgetAmendments, ({ one }) => ({
  project: one(projects, {
    fields: [budgetAmendments.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [budgetAmendments.approvedBy],
    references: [users.id],
  }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one }) => ({
  project: one(projects, {
    fields: [changeOrders.projectId],
    references: [projects.id],
  }),
  approver: one(users, {
    fields: [changeOrders.approvedBy],
    references: [users.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string()]).transform((val) => new Date(val)),
  endDate: z.union([z.date(), z.string()]).transform((val) => new Date(val)),
});

export const insertFundAllocationSchema = createInsertSchema(fundAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFundTransferSchema = createInsertSchema(fundTransfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// New table insert schemas
export const insertLineItemSchema = createInsertSchema(lineItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCostAllocationSchema = createInsertSchema(costAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaterialAllocationSchema = createInsertSchema(materialAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetAmendmentSchema = createInsertSchema(budgetAmendments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type FundAllocation = typeof fundAllocations.$inferSelect;
export type InsertFundAllocation = z.infer<typeof insertFundAllocationSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type FundTransfer = typeof fundTransfers.$inferSelect;
export type InsertFundTransfer = z.infer<typeof insertFundTransferSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// New table types
export type LineItem = typeof lineItems.$inferSelect;
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type CostAllocation = typeof costAllocations.$inferSelect;
export type InsertCostAllocation = z.infer<typeof insertCostAllocationSchema>;
export type MaterialAllocation = typeof materialAllocations.$inferSelect;
export type InsertMaterialAllocation = z.infer<typeof insertMaterialAllocationSchema>;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type BudgetAmendment = typeof budgetAmendments.$inferSelect;
export type InsertBudgetAmendment = z.infer<typeof insertBudgetAmendmentSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
