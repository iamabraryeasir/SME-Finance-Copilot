import { type AIMessage, SystemMessage } from "@langchain/core/messages";
import { END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getOrCreateBusinessProfile } from "@/services/business-profile";
import { getFinancialModel } from "./models";
import { buildSystemPrompt } from "./prompts";
import { createAllFinancialTools } from "./tools";

/**
 * Creates and compiles a tenant-isolated LangGraph Financial Copilot agent.
 * The agent orchestrates multi-step workflows, tool calls, and structured synthesis.
 */
export async function createFinancialAgent(userId: string) {
  if (!userId) {
    throw new Error(
      "Tenant isolation violation: userId is required to create agent",
    );
  }

  // 1. Fetch user business context
  const profile = await getOrCreateBusinessProfile(userId);
  const companyName = profile.companyName;
  const currency = profile.currency || "BDT";
  const minReserveThreshold = profile.minReserveThreshold ?? 30000;

  // 2. Build system instruction prompt with active parameters
  const systemPromptContent = buildSystemPrompt({
    companyName,
    currency,
    minReserveThreshold,
    currentDate: new Date().toISOString().slice(0, 10),
  });
  const systemMessage = new SystemMessage(systemPromptContent);

  // 3. Initialize the 8 deterministic tools bound strictly to this tenant
  const tools = createAllFinancialTools(userId);
  const toolNode = new ToolNode(tools);

  // 4. Initialize LLM Provider Bridge (Gemini 1.5 Flash + Groq Llama-3 failover) with tools
  const modelWithTools = getFinancialModel(
    { temperature: 0.1, streaming: true },
    tools,
  );

  // 5. Define workflow nodes
  const callModel = async (state: typeof MessagesAnnotation.State) => {
    // Ensure system prompt is always the initial instructional anchor
    const messages = state.messages;
    const hasSystemMessage =
      messages.length > 0 && messages[0] instanceof SystemMessage;
    const finalMessages = hasSystemMessage
      ? messages
      : [systemMessage, ...messages];

    const response = await modelWithTools.invoke(finalMessages);
    return { messages: [response] };
  };

  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }
    return END;
  };

  // 6. Build the cyclical StateGraph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent");

  const app = workflow.compile();

  return {
    agent: app,
    tools,
    systemPrompt: systemPromptContent,
    companyName,
    currency,
  };
}
