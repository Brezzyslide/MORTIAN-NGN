/**
 * Helper functions for cost allocation calculations and budget variance alerts
 */

// Budget variance threshold constants
export const BUDGET_THRESHOLDS = {
  WARNING_THRESHOLD: 80, // 80% - orange warning
  CRITICAL_THRESHOLD: 95, // 95% - red critical
  HEALTHY_MAX: 79.9, // < 80% - green healthy
} as const;

export type BudgetStatus = 'healthy' | 'warning' | 'critical';

export interface BudgetVarianceResult {
  spentPercentage: number;
  remainingBudget: number;
  status: BudgetStatus;
  isOverBudget: boolean;
  variance: number; // Amount over/under budget
}

/**
 * Calculate comprehensive budget variance information
 * @param totalBudget - Project's total budget
 * @param totalSpent - Amount already spent/consumed
 * @returns Complete budget variance analysis
 */
export function calcBudgetVariance(totalBudget: number, totalSpent: number): BudgetVarianceResult {
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = totalSpent > totalBudget;
  const variance = totalSpent - totalBudget; // Positive = over budget, negative = under budget
  
  let status: BudgetStatus = 'healthy';
  if (spentPercentage >= BUDGET_THRESHOLDS.CRITICAL_THRESHOLD) {
    status = 'critical';
  } else if (spentPercentage >= BUDGET_THRESHOLDS.WARNING_THRESHOLD) {
    status = 'warning';
  }

  return {
    spentPercentage: Math.round(spentPercentage * 100) / 100,
    remainingBudget,
    status,
    isOverBudget,
    variance,
  };
}

/**
 * Calculate budget impact of a new cost allocation
 * @param currentSpent - Currently spent amount
 * @param proposedCost - New cost allocation amount
 * @param totalBudget - Project's total budget
 * @returns Budget impact analysis
 */
export function calcBudgetImpact(
  currentSpent: number, 
  proposedCost: number, 
  totalBudget: number
): BudgetVarianceResult & {
  newSpentPercentage: number;
  willExceedWarning: boolean;
  willExceedCritical: boolean;
  requiresApproval: boolean;
} {
  const newTotalSpent = currentSpent + proposedCost;
  const variance = calcBudgetVariance(totalBudget, newTotalSpent);
  
  return {
    ...variance,
    newSpentPercentage: variance.spentPercentage,
    willExceedWarning: variance.spentPercentage >= BUDGET_THRESHOLDS.WARNING_THRESHOLD,
    willExceedCritical: variance.spentPercentage >= BUDGET_THRESHOLDS.CRITICAL_THRESHOLD,
    requiresApproval: variance.spentPercentage >= BUDGET_THRESHOLDS.WARNING_THRESHOLD,
  };
}

/**
 * Generate budget alert message based on status
 * @param projectTitle - Name of the project
 * @param variance - Budget variance result
 * @returns Alert message for notifications
 */
export function generateBudgetAlertMessage(projectTitle: string, variance: BudgetVarianceResult): string {
  if (variance.status === 'critical') {
    if (variance.isOverBudget) {
      return `CRITICAL: Project "${projectTitle}" is over budget by ₦${Math.abs(variance.variance).toLocaleString()} (${variance.spentPercentage.toFixed(1)}% spent)`;
    } else {
      return `CRITICAL: Project "${projectTitle}" budget critically low - ${variance.spentPercentage.toFixed(1)}% spent, only ₦${variance.remainingBudget.toLocaleString()} remaining`;
    }
  } else if (variance.status === 'warning') {
    return `WARNING: Project "${projectTitle}" approaching budget limit - ${variance.spentPercentage.toFixed(1)}% spent, ₦${variance.remainingBudget.toLocaleString()} remaining`;
  }
  return `Project "${projectTitle}" budget healthy - ${variance.spentPercentage.toFixed(1)}% spent`;
}

/**
 * Calculate total material cost from material allocation rows
 * @param rows - Array of material allocations with unit_price and quantity
 * @returns Total material cost (sum of unit_price × quantity)
 */
export function calcMaterialTotal(rows: Array<{unit_price: number, quantity: number}>): number {
  return rows.reduce((total, row) => {
    return total + (row.unit_price * row.quantity);
  }, 0);
}

/**
 * Calculate total cost including labour and materials
 * @param labour - Labour cost details with unit_price and quantity
 * @param materialTotal - Total material cost
 * @returns Total cost (labour_unit_price × labour_quantity + materialTotal)
 */
export function calcTotalCost(
  labour: {unit_price: number, quantity: number}, 
  materialTotal: number
): number {
  const labourCost = labour.unit_price * labour.quantity;
  return labourCost + materialTotal;
}

/**
 * Calculate remaining project budget
 * @param totalBudget - Project's total budget
 * @param consumedAmount - Amount already consumed/allocated
 * @returns Remaining budget available
 */
export function calcRemainingBudget(totalBudget: number, consumedAmount: number): number {
  return totalBudget - consumedAmount;
}

/**
 * Check if cost allocation exceeds remaining budget
 * @param totalCost - Cost allocation total cost
 * @param remainingBudget - Remaining budget available
 * @returns True if cost exceeds budget, false otherwise
 */
export function exceedsBudget(totalCost: number, remainingBudget: number): boolean {
  return totalCost > remainingBudget;
}

/**
 * Determine cost allocation status based on budget validation
 * @param totalCost - Cost allocation total cost
 * @param remainingBudget - Remaining budget available
 * @returns "pending" if exceeds budget, "approved" if within budget
 */
export function determineCostAllocationStatus(totalCost: number, remainingBudget: number): "pending" | "approved" {
  return exceedsBudget(totalCost, remainingBudget) ? "pending" : "approved";
}

/**
 * Determine initial cost allocation status for approval workflow
 * @param totalCost - Cost allocation total cost
 * @param remainingBudget - Remaining budget available
 * @returns "draft" always, but provides budget validation info
 */
export function determineInitialCostAllocationStatus(totalCost: number, remainingBudget: number): { 
  status: "draft"; 
  exceedsBudget: boolean;
  budgetValidation: string;
} {
  const exceeds = exceedsBudget(totalCost, remainingBudget);
  return {
    status: "draft",
    exceedsBudget: exceeds,
    budgetValidation: exceeds 
      ? "This allocation exceeds the remaining budget and will require approval." 
      : "This allocation is within the remaining budget."
  };
}