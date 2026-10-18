import { serve } from "inngest/next";
import { inngest } from "@/utils/inngest/client";
import { ocrWorker } from "@/utils/inngest/functions/ocr-worker";
import { recalculateFinancials } from "@/utils/inngest/functions/recalculate-financials";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ocrWorker, recalculateFinancials],
});
