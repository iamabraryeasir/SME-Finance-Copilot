export interface ForecastInflowItem {
  invoiceId: string;
  invoiceNumber: string;
  counterparty: string;
  amount: number;
  originalDueDate: string;
  projectedDate: string;
  isDelayed: boolean;
  status: string;
}

export interface ForecastOutflowItem {
  type: "INVOICE_PAYABLE" | "RECURRING_COMMITMENT";
  id: string;
  reference: string; // invoiceNumber or schedule title
  counterpartyOrCategory: string;
  amount: number;
  dueDate: string;
}

export interface DailyCashBucket {
  date: string; // YYYY-MM-DD
  dayIndex: number; // 1 to 30
  dayOfWeek: string; // "Mon", "Tue", etc.
  openingBalance: number;
  inflows: number;
  inflowItems: ForecastInflowItem[];
  outflows: number;
  outflowItems: ForecastOutflowItem[];
  closingBalance: number;
  isBelowReserve: boolean;
  isDeficit: boolean;
}

export interface ForecastSummary {
  currency: string;
  startingCash: number;
  endingCash: number;
  minProjectedBalance: number;
  minBalanceDate: string;
  minBalanceDayIndex: number;
  totalProjectedInflow: number;
  totalProjectedOutflow: number;
  netProjectedCashFlow: number;
  minReserveThreshold: number;
  firstReserveBreachDate: string | null;
  firstDeficitDate: string | null;
  deficitDaysCount: number;
  latePaymentAssumptionDays: number;
  generatedAt: string;
}

export interface CashForecastResult {
  summary: ForecastSummary;
  dailyBuckets: DailyCashBucket[];
}
