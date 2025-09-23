import { sql, relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
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
  primaryKey,
  foreignKey,
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

// User roles enum - Updated for Sprint 5 (keeping backward compatibility)
export const userRoleEnum = pgEnum("user_role", ["console_manager", "manager", "admin", "team_leader", "user", "viewer"]);

// User status enum
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "pending"]);

// Users table (required for Replit Auth) - Updated with strict tenant isolation
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("user"),
  managerId: varchar("manager_id").references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  status: userStatusEnum("status").notNull().default("active"),
  // Authentication fields
  passwordHash: varchar("password_hash", { length: 255 }),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite unique constraint: email must be unique within each company
  uniqueEmailPerCompany: index("idx_users_email_company").on(sql`lower(${table.email})`, table.companyId),
  // Unique index for foreign key support from team_members
  uniqueUserCompany: uniqueIndex("idx_users_id_company").on(table.id, table.companyId),
}));

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
  // Construction categories - Existing database structure
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
  changeOrderId: uuid("change_order_id").references(() => changeOrders.id),
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
  proposedBy: varchar("proposed_by").references(() => users.id).notNull(),
  status: approvalStatusEnum("status").notNull().default("draft"),
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
  costImpact: decimal("cost_impact", { precision: 15, scale: 2 }).notNull(),
  proposedBy: varchar("proposed_by").references(() => users.id).notNull(),
  status: approvalStatusEnum("status").notNull().default("draft"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project assignments table (tracks which team leaders are assigned to projects)
export const projectAssignments = pgTable("project_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // CRITICAL SECURITY: Ensure unique assignment per tenant-project-user combination to prevent cross-tenant leakage
  uniqueTenantProjectUser: uniqueIndex("idx_project_assignments_unique_tenant").on(table.tenantId, table.projectId, table.userId),
}));

// Budget alert types enum
export const budgetAlertTypeEnum = pgEnum("budget_alert_type", [
  "warning_threshold", // 80% threshold crossed
  "critical_threshold", // 95% threshold crossed
  "over_budget", // Project went over budget
  "budget_allocation_denied" // Cost allocation denied due to budget
]);

// Budget alert status enum
export const budgetAlertStatusEnum = pgEnum("budget_alert_status", [
  "active",
  "acknowledged", 
  "resolved"
]);

// Budget alerts table
export const budgetAlerts = pgTable("budget_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  type: budgetAlertTypeEnum("type").notNull(),
  status: budgetAlertStatusEnum("status").notNull().default("active"),
  severity: varchar("severity", { length: 20 }).notNull(), // 'warning', 'critical'
  message: text("message").notNull(),
  spentPercentage: decimal("spent_percentage", { precision: 5, scale: 2 }),
  remainingBudget: decimal("remaining_budget", { precision: 15, scale: 2 }),
  triggeredBy: varchar("triggered_by").references(() => users.id), // User who triggered the alert
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id), // Manager who acknowledged
  acknowledgedAt: timestamp("acknowledged_at"),
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
  "user_role_updated",
  "user_status_updated",
  "revenue_added",
  // Construction audit actions
  "cost_allocated",
  "material_added",
  "material_updated",
  "line_item_created",
  "line_item_updated",
  "budget_amended",
  "change_order_created",
  "approval_workflow_updated",
  // Project assignment audit actions
  "project_assignment_created",
  "project_assignment_removed",
  // Auth audit actions
  "manual_login_attempt",
  "cost_allocation_submitted",
  "login_failed_user_not_found",
  "login_failed_account_locked",
  "login_failed_account_inactive",
  "login_failed_invalid_password",
  "login_successful",
  "password_changed",
  // Company audit actions
  "company_created",
  "company_updated",
  "company_admin_password_changed",
  // Team audit actions
  "team_created",
  "team_updated",
  "team_deleted",
  "team_member_added",
  "team_member_removed",
  "team_leader_assigned",
  "team_leader_removed"
]);

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  details: jsonb("details"),
  tenantId: varchar("tenant_id").references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Team role enum for team member roles
export const teamRoleEnum = pgEnum("team_role", ["member", "lead"]);

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  leaderId: varchar("leader_id").references(() => users.id, { onDelete: "set null" }), // Nullable - teams can exist without a leader
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Ensure team names are unique within each tenant
  uniqueTeamNamePerTenant: uniqueIndex("idx_teams_name_tenant").on(table.name, table.tenantId),
  // Required for foreign key support from team_members
  uniqueTeamTenant: uniqueIndex("idx_teams_id_tenant").on(table.id, table.tenantId),
  // Security: Ensure leader belongs to same tenant as the team
  leaderTenantFk: foreignKey({
    columns: [table.leaderId, table.tenantId],
    foreignColumns: [users.id, users.companyId],
  }),
}));

// Team members table (many-to-many relationship between users and teams)
export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleInTeam: teamRoleEnum("role_in_team").notNull().default("member"),
  tenantId: varchar("tenant_id").references(() => companies.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  // Composite primary key
  pk: primaryKey({ columns: [table.teamId, table.userId] }),
  // Security: Ensure unique team-user combination per tenant to prevent cross-tenant leakage
  uniqueTenantTeamUser: uniqueIndex("idx_team_members_unique_tenant").on(table.tenantId, table.teamId, table.userId),
  // Tenant isolation: Ensure team and user belong to same tenant
  teamTenantFk: foreignKey({
    columns: [table.teamId, table.tenantId],
    foreignColumns: [teams.id, teams.tenantId],
  }),
  userTenantFk: foreignKey({
    columns: [table.userId, table.tenantId],
    foreignColumns: [users.id, users.companyId],
  }),
}));

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
  projectAssignments: many(projectAssignments, {
    relationName: "project_assignments_user"
  }),
  assignmentsMade: many(projectAssignments, {
    relationName: "project_assignments_assigned_by"
  }),
  teamMemberships: many(teamMembers),
  teamsLed: many(teams, {
    relationName: "team_leader"
  }),
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
  budgetAmendments: many(budgetAmendments),
  changeOrders: many(changeOrders),
  assignments: many(projectAssignments),
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
  changeOrder: one(changeOrders, {
    fields: [costAllocations.changeOrderId],
    references: [changeOrders.id],
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
  proposer: one(users, {
    fields: [budgetAmendments.proposedBy],
    references: [users.id],
    relationName: "budget_amendments_proposed"
  }),
  approver: one(users, {
    fields: [budgetAmendments.approvedBy],
    references: [users.id],
    relationName: "budget_amendments_approved"
  }),
}));

export const changeOrdersRelations = relations(changeOrders, ({ one, many }) => ({
  project: one(projects, {
    fields: [changeOrders.projectId],
    references: [projects.id],
  }),
  proposer: one(users, {
    fields: [changeOrders.proposedBy],
    references: [users.id],
    relationName: "change_orders_proposed"
  }),
  approver: one(users, {
    fields: [changeOrders.approvedBy],
    references: [users.id],
    relationName: "change_orders_approved"
  }),
  costAllocations: many(costAllocations),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectAssignments.userId],
    references: [users.id],
    relationName: "project_assignments_user"
  }),
  assignedByUser: one(users, {
    fields: [projectAssignments.assignedBy],
    references: [users.id],
    relationName: "project_assignments_assigned_by"
  }),
}));

export const budgetAlertsRelations = relations(budgetAlerts, ({ one }) => ({
  project: one(projects, {
    fields: [budgetAlerts.projectId],
    references: [projects.id],
  }),
  triggeredByUser: one(users, {
    fields: [budgetAlerts.triggeredBy],
    references: [users.id],
    relationName: "alerts_triggered_by"
  }),
  acknowledgedByUser: one(users, {
    fields: [budgetAlerts.acknowledgedBy],
    references: [users.id],
    relationName: "alerts_acknowledged_by"
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  teams: many(teams),
}));

// Teams relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
    relationName: "team_leader"
  }),
  company: one(companies, {
    fields: [teams.tenantId],
    references: [companies.id],
  }),
  teamMembers: many(teamMembers),
}));

// Team members relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [teamMembers.tenantId],
    references: [companies.id],
  }),
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
}).extend({
  // Fix: Allow amount to be either string or number, but convert to string for decimal handling
  amount: z.union([z.string(), z.number()]).transform((val) => String(val)),
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
  costAllocationId: true, // This gets added automatically by storage method
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

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetAlertSchema = createInsertSchema(budgetAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Team schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  tenantId: true, // Security: tenantId should be set server-side from auth context
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  tenantId: true, // Security: tenantId should be set server-side from auth context
  joinedAt: true,
});

// Authentication schemas
export const loginRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(255),
});

// Company creation with admin password
export const createCompanyWithAdminSchema = insertCompanySchema.extend({
  adminPassword: z.string().min(8, "Admin password must be at least 8 characters").max(255),
});

// Company admin password change
export const companyPasswordChangeSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(255),
});

export const adminCreateUserSchema = z.object({
  email: z.string().email("Please enter a valid email address").max(255),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(['admin', 'team_leader', 'user', 'viewer'], {
    errorMap: () => ({ message: "Please select a valid role" })
  }),
  temporaryPassword: z.string().min(8, "Temporary password must be at least 8 characters").max(255),
  managerId: z.string().optional(), // Optional managerId field
  // SECURITY: tenantId is no longer accepted from client - will be set from auth context
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(255),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Row Level Security (RLS) policies for strict tenant isolation
// These will be applied at the database level to prevent cross-tenant data access
export const rlsPolicies = {
  users: [
    // Users can only see users from their own company
    {
      name: 'tenant_isolation_policy',
      operation: 'ALL',
      using: `company_id = current_setting('app.tenant')::text`,
      withCheck: `company_id = current_setting('app.tenant')::text`
    }
  ]
};

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
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type BudgetAlert = typeof budgetAlerts.$inferSelect;
export type InsertBudgetAlert = z.infer<typeof insertBudgetAlertSchema>;

// Team types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// Authentication types
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AdminCreateUser = z.infer<typeof adminCreateUserSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
