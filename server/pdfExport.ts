import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { storage } from './storage';
import type { Project, Transaction, User } from '@shared/schema';

export class PDFExportService {
  
  // Generate project summary report
  async generateProjectSummary(projectId: string, tenantId: string): Promise<Buffer> {
    const project = await storage.getProject(projectId, tenantId);
    if (!project) {
      throw new Error('Project not found');
    }

    const transactions = await storage.getTransactions(tenantId);
    const projectTransactions = transactions.filter(t => t.projectId === projectId);
    const allocations = await storage.getFundAllocations(tenantId);
    const projectAllocations = allocations.filter(a => a.projectId === projectId);
    const stats = await storage.getProjectStats(projectId, tenantId);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Project Summary Report', 20, 30);
    
    // Project details
    doc.setFontSize(12);
    doc.text(`Project: ${project.title}`, 20, 50);
    doc.text(`Description: ${project.description || 'N/A'}`, 20, 60);
    doc.text(`Start Date: ${project.startDate.toLocaleDateString()}`, 20, 70);
    doc.text(`End Date: ${project.endDate.toLocaleDateString()}`, 20, 80);
    doc.text(`Status: ${project.status}`, 20, 90);
    
    // Financial summary
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, 110);
    doc.setFontSize(12);
    doc.text(`Total Budget: $${Number(project.budget).toLocaleString()}`, 20, 125);
    doc.text(`Total Revenue: $${Number(project.revenue || 0).toLocaleString()}`, 20, 135);
    doc.text(`Total Spent: $${stats.totalSpent.toLocaleString()}`, 20, 145);
    doc.text(`Net Profit: $${stats.netProfit.toLocaleString()}`, 20, 155);
    doc.text(`Budget Remaining: $${(stats.totalBudget - stats.totalSpent).toLocaleString()}`, 20, 165);

    // Allocations table
    if (projectAllocations.length > 0) {
      doc.setFontSize(14);
      doc.text('Fund Allocations', 20, 185);
      
      autoTable(doc, {
        startY: 195,
        head: [['Amount', 'Category', 'From User', 'To User', 'Description', 'Date']],
        body: projectAllocations.map(allocation => [
          `$${Number(allocation.amount).toLocaleString()}`,
          allocation.category,
          allocation.fromUserId,
          allocation.toUserId,
          allocation.description || '',
          allocation.createdAt?.toLocaleDateString() || ''
        ])
      });
    }

    // Transactions table
    if (projectTransactions.length > 0) {
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 220;
      
      doc.setFontSize(14);
      doc.text('Transactions', 20, finalY);
      
      autoTable(doc, {
        startY: finalY + 10,
        head: [['Amount', 'Type', 'Category', 'Description', 'Date']],
        body: projectTransactions.map(transaction => [
          `$${Number(transaction.amount).toLocaleString()}`,
          transaction.type,
          transaction.category,
          transaction.description || '',
          transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : ''
        ])
      });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  // Generate user spend report
  async generateUserSpendReport(userId: string, tenantId: string, startDate?: Date, endDate?: Date): Promise<Buffer> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify user belongs to the same tenant for security
    if (user.tenantId !== tenantId) {
      throw new Error('Access denied: User not in your tenant');
    }

    let transactions = await storage.getTransactions(tenantId);
    transactions = transactions.filter(t => t.userId === userId);

    if (startDate && endDate) {
      transactions = transactions.filter(t => 
        t.createdAt && t.createdAt >= startDate && t.createdAt <= endDate
      );
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('User Spend Report', 20, 30);
    
    // User details
    doc.setFontSize(12);
    doc.text(`User: ${user.firstName} ${user.lastName}`, 20, 50);
    doc.text(`Email: ${user.email}`, 20, 60);
    doc.text(`Role: ${user.role}`, 20, 70);
    
    if (startDate && endDate) {
      doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, 80);
    }

    // Summary calculations
    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const categoryTotals = expenseTransactions.reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});

    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, 100);
    doc.setFontSize(12);
    doc.text(`Total Transactions: ${transactions.length}`, 20, 115);
    doc.text(`Total Amount: $${totalSpent.toLocaleString()}`, 20, 125);

    // Category breakdown
    let yPos = 145;
    if (Object.keys(categoryTotals).length > 0) {
      doc.setFontSize(14);
      doc.text('Spending by Category', 20, yPos);
      
      yPos = 160;
      Object.entries(categoryTotals).forEach(([category, amount]: [string, any]) => {
        doc.setFontSize(12);
        doc.text(`${category}: $${Number(amount).toLocaleString()}`, 30, yPos);
        yPos += 10;
      });
    }

    // Transactions table
    if (transactions.length > 0) {
      doc.setFontSize(14);
      doc.text('Detailed Transactions', 20, yPos + 20);
      
      autoTable(doc, {
        startY: yPos + 30,
        head: [['Amount', 'Type', 'Category', 'Description', 'Date']],
        body: transactions.map(transaction => [
          `$${Number(transaction.amount).toLocaleString()}`,
          transaction.type,
          transaction.category,
          transaction.description || '',
          transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : ''
        ])
      });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  // Generate profit statement
  async generateProfitStatement(tenantId: string, startDate?: Date, endDate?: Date): Promise<Buffer> {
    const projects = await storage.getProjects(tenantId);
    let transactions = await storage.getTransactions(tenantId);
    
    if (startDate && endDate) {
      transactions = transactions.filter(t => 
        t.createdAt && t.createdAt >= startDate && t.createdAt <= endDate
      );
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Profit & Loss Statement', 20, 30);
    
    if (startDate && endDate) {
      doc.setFontSize(12);
      doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, 45);
    }

    // Calculate totals
    const revenueTransactions = transactions.filter(t => t.type === 'revenue');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totalRevenue = revenueTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Revenue section
    doc.setFontSize(16);
    doc.text('Revenue', 20, 70);
    
    if (revenueTransactions.length > 0) {
      autoTable(doc, {
        startY: 80,
        head: [['Description', 'Amount', 'Date']],
        body: revenueTransactions.map(t => [
          t.description || 'Revenue',
          `$${Number(t.amount).toLocaleString()}`,
          t.createdAt?.toLocaleDateString() || ''
        ])
      });
    }
    
    const revenueY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 90;
    doc.setFontSize(14);
    doc.text(`Total Revenue: $${totalRevenue.toLocaleString()}`, 20, revenueY);

    // Expenses section
    doc.setFontSize(16);
    doc.text('Expenses', 20, revenueY + 20);
    
    // Group expenses by category
    const expensesByCategory = expenseTransactions.reduce((acc: any, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});

    let currentY = revenueY + 30;
    Object.entries(expensesByCategory).forEach(([category, categoryExpenses]: [string, any]) => {
      const categoryTotal = categoryExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      doc.setFontSize(14);
      doc.text(`${category}: $${categoryTotal.toLocaleString()}`, 30, currentY);
      currentY += 15;
    });

    doc.setFontSize(14);
    doc.text(`Total Expenses: $${totalExpenses.toLocaleString()}`, 20, currentY + 10);
    
    // Net Profit
    doc.setFontSize(16);
    const profitColor = netProfit >= 0 ? [0, 128, 0] : [255, 0, 0];
    doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
    doc.text(`Net Profit: $${netProfit.toLocaleString()}`, 20, currentY + 30);

    return Buffer.from(doc.output('arraybuffer'));
  }
}

export const pdfExportService = new PDFExportService();