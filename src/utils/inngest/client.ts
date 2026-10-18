import { Inngest } from "inngest";

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.INNGEST_DEV === "1" ||
  !process.env.INNGEST_EVENT_KEY;

export const inngest = new Inngest({
  id: "cashpilot-ai",
  eventKey: process.env.INNGEST_EVENT_KEY || undefined,
  baseUrl:
    process.env.INNGEST_BASE_URL ||
    (isDev ? "http://127.0.0.1:8288" : undefined),
  isDev,
});
