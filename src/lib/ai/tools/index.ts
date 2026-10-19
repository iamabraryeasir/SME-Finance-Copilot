import { createFinancialAlertsTool } from "./financial-alerts";
import { createFinancialSummaryTool } from "./financial-summary";
import { createForecastBalanceTool } from "./forecast-balance";
import { createInvoicesTool } from "./invoices";
import { createRecordActionTool } from "./record-action";
import { createReminderDraftTool } from "./reminder-draft";
import { createUpcomingPayablesTool } from "./upcoming-payables";
import { createUpcomingReceivablesTool } from "./upcoming-receivables";

export {
  createFinancialSummaryTool,
  createInvoicesTool,
  createUpcomingPayablesTool,
  createUpcomingReceivablesTool,
  createForecastBalanceTool,
  createFinancialAlertsTool,
  createReminderDraftTool,
  createRecordActionTool,
};

/**
 * Instantiates the full suite of 8 deterministic financial agent tools,
 * tightly bound to the authenticated user's session for zero-trust tenant isolation.
 */
export function createAllFinancialTools(sessionUserId: string) {
  return [
    createFinancialSummaryTool(sessionUserId),
    createInvoicesTool(sessionUserId),
    createUpcomingPayablesTool(sessionUserId),
    createUpcomingReceivablesTool(sessionUserId),
    createForecastBalanceTool(sessionUserId),
    createFinancialAlertsTool(sessionUserId),
    createReminderDraftTool(sessionUserId),
    createRecordActionTool(sessionUserId),
  ];
}
