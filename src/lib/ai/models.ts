import type { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import type { AIMessageChunk } from "@langchain/core/messages";
import type { Runnable } from "@langchain/core/runnables";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";

interface ModelOptions {
  temperature?: number;
  maxOutputTokens?: number;
  streaming?: boolean;
}

export type FinancialChatModel = Runnable<
  BaseLanguageModelInput,
  AIMessageChunk
>;

/**
 * Creates and returns the resilient financial LLM instance.
 * When tools are provided, binds them to both models before configuring the Groq failover.
 */
export function getFinancialModel(
  options: ModelOptions = {},
  tools?: StructuredToolInterface[],
): FinancialChatModel {
  const temperature = options.temperature ?? 0.1;
  const maxOutputTokens = options.maxOutputTokens ?? 2048;
  const streaming = options.streaming ?? true;

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  const boundModels: FinancialChatModel[] = [];

  if (geminiApiKey) {
    // Tier 1: Primary Gemini 1.5 Flash (1,500 RPD free tier quota)
    const gemini15 = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      apiKey: geminiApiKey,
      temperature,
      maxOutputTokens,
      streaming,
    });
    boundModels.push(
      tools && tools.length > 0 ? gemini15.bindTools(tools) : gemini15,
    );

    // Tier 2: Resilient High-Capacity Fallback Gemini 2.0 Flash
    const gemini20 = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey: geminiApiKey,
      temperature,
      maxOutputTokens,
      streaming,
    });
    boundModels.push(
      tools && tools.length > 0 ? gemini20.bindTools(tools) : gemini20,
    );
  }

  if (groqApiKey) {
    // Tier 3: Ultra-Fast Failover via Groq (llama-3.3-70b-versatile with tool calling)
    const groqModel = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: groqApiKey,
      temperature,
      maxTokens: maxOutputTokens,
      streaming,
    });
    boundModels.push(
      tools && tools.length > 0 ? groqModel.bindTools(tools) : groqModel,
    );
  }

  if (boundModels.length === 0) {
    throw new Error(
      "Missing LLM configuration: Set either GEMINI_API_KEY or GROQ_API_KEY in your environment variables.",
    );
  }

  const [primary, ...fallbacks] = boundModels;
  if (fallbacks.length > 0) {
    return primary.withFallbacks(fallbacks);
  }
  return primary;
}

import { GoogleGenAI } from "@google/genai";

let geminiClientInstance: GoogleGenAI | null = null;

/**
 * Returns the singleton modern Google Gen AI client for direct Gemini 3.8 Flash calls.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY: Set GEMINI_API_KEY in your environment variables to use Gemini 3.8 Flash.",
    );
  }
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({ apiKey });
  }
  return geminiClientInstance;
}
