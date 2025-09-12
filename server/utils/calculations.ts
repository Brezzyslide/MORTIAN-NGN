/**
 * Helper functions for cost allocation calculations
 */

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