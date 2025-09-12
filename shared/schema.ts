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

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["manager", "team_leader", "user"]);

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
  tenantId: varchar("tenant_id").notNull(),
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
  revenue: decimal("revenue", { precision: 15, scale: 2 }).default("0"),
  managerId: varchar("manager_id").references(() => users.id).notNull(),
  tenantId: varchar("tenant_id").notNull(),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Line item categories enum
export const lineItemCategoryEnum = pgEnum("line_item_category", [
  "development_resources",
  "design_tools", 
  "testing_qa",
  "infrastructure",
  "marketing",
  "operations",
  "miscellaneous"
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
  tenantId: varchar("tenant_id").notNull(),
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
  tenantId: varchar("tenant_id").notNull(),
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
  tenantId: varchar("tenant_id").notNull(),
  status: varchar("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log actions enum
export const auditActionEnum = pgEnum("audit_action", [
  "project_created",
  "project_updated", 
  "fund_allocated",
  "expense_submitted",
  "fund_transferred",
  "user_created",
  "user_updated",
  "revenue_added"
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
  tenantId: varchar("tenant_id").notNull(),
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
