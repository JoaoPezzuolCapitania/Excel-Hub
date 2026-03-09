import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Fallback chain: if one model is rate-limited, try the next
const MODELS = [
  { id: "google/gemma-3-12b-it:free", supportsSystem: false },
  { id: "google/gemma-3-4b-it:free", supportsSystem: false },
  { id: "mistralai/mistral-small-3.1-24b-instruct:free", supportsSystem: true },
  { id: "qwen/qwen3-4b:free", supportsSystem: true },
  { id: "nvidia/nemotron-nano-9b-v2:free", supportsSystem: true },
];

const SYSTEM_PROMPT = `You are ExcelHub Assistant, a helpful AI built into ExcelHub — a web app that provides Git-like version control for spreadsheets (.xlsx and .csv files).

Your role:
- Help users understand how to use ExcelHub (repositories, branches, commits, diffs, merge requests, collaborators, file uploads).
- Answer questions about spreadsheet data when the user shares cell values or describes their data.
- Provide general spreadsheet tips (formulas, best practices, data organization).

Key ExcelHub features you should know about:
- **Repositories**: Like GitHub repos but for spreadsheets. Users create repos, upload .xlsx/.csv files.
- **Branches**: Users can create branches to work on different versions independently.
- **Commits**: Each file upload creates a commit with a message, hash, and timestamp.
- **Cell-Level Diffs**: ExcelHub shows exactly which cells changed between commits (added, removed, modified).
- **Merge Requests**: Users can request to merge one branch into another, with conflict resolution.
- **Collaborators**: Users can invite others with roles: Owner, Editor, or Viewer.
- **Spreadsheet Viewer**: Interactive table view with sorting and pagination.

Be concise, friendly, and helpful. Answer in the same language the user writes in.`;

function buildMessages(
  messages: { role: string; content: string }[],
  supportsSystem: boolean
) {
  if (supportsSystem) {
    return [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  }
  // For models that don't support system role, embed in first user message
  return messages.map((m, i) => {
    if (i === 0 && m.role === "user") {
      return {
        role: "user",
        content: `[Instructions] ${SYSTEM_PROMPT}\n\n[User Message] ${m.content}`,
      };
    }
    return { role: m.role, content: m.content };
  });
}

async function callModel(
  model: { id: string; supportsSystem: boolean },
  messages: { role: string; content: string }[]
) {
  const apiMessages = buildMessages(messages, model.supportsSystem);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "ExcelHub",
      },
      body: JSON.stringify({
        model: model.id,
        messages: apiMessages,
        max_tokens: 1024,
      }),
    }
  );

  const data = await response.json();
  return { ok: response.ok && !data.error, data };
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Try each model in order until one succeeds
    for (const model of MODELS) {
      try {
        const result = await callModel(model, messages);
        if (result.ok) {
          const content =
            result.data.choices?.[0]?.message?.content ||
            "Sorry, I could not generate a response.";
          return NextResponse.json({ content });
        }
        console.log(`Model ${model.id} failed, trying next...`);
      } catch {
        console.log(`Model ${model.id} threw error, trying next...`);
      }
    }

    return NextResponse.json(
      { error: "All AI models are currently unavailable. Please try again later." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
