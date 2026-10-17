import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "cashpilot-ai",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
