import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  question: z.string().min(3).max(2000),
  subject: z.string().max(80),
  topic: z.string().max(120),
  grade: z.string().max(40),
  mode: z.enum(["default", "different", "example", "simpler"]),
  previous: z.string().max(6000).optional(),
});

export type DoubtAnswer = {
  simple: string;
  steps: string[];
  example: string;
  check_question: string;
  key_points?: string[];
  common_mistake?: string;
};

const MODE_HINT: Record<string, string> = {
  default: "",
  different: "The student did not understand the previous explanation. Explain the SAME concept in a completely different way (new angle or analogy), staying on the same topic.",
  example: "The student wants more concrete examples. Make the example richer, with a fresh worked example on the same topic.",
  simpler: "The student found it too hard. Make everything much simpler: shorter sentences, everyday words, no jargon — but stay technically correct.",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["simple", "steps", "example", "check_question", "key_points", "common_mistake"],
  properties: {
    simple: { type: "string", description: "Direct, accurate answer to the exact question, 2-4 sentences." },
    steps: { type: "array", items: { type: "string" }, description: "3-6 step-by-step points (reasoning or worked method)." },
    example: { type: "string", description: "A concrete example or worked problem on this exact topic." },
    key_points: { type: "array", items: { type: "string" }, description: "2-4 key facts, definitions or formulas for this topic, with units where relevant." },
    common_mistake: { type: "string", description: "One common misconception students have on this topic and the correction." },
    check_question: { type: "string", description: "One short question testing this exact concept." },
  },
};

export const solveDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<DoubtAnswer> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("The doubt solver is not configured yet.");
    const system = `You are FocusStudy's expert tutor for a student in grade/class "${data.grade || "unspecified"}".
Accuracy rules:
- Answer the EXACT question asked, strictly within the given subject and topic. Do not drift into neighbouring topics.
- Use the standard definitions, laws, formulas and terminology taught in school curricula for this subject at this level. Include correct units.
- For numerical problems, work every calculation carefully and double-check arithmetic before answering.
- If the question is ambiguous, state the most likely interpretation in one short clause and answer it.
- If the question has a factual error, gently correct it.
- Never invent facts, dates, formulas or quotes. If unsure, say so.
Teaching: explain understanding, not just answers. For homework problems, show the method clearly. Keep language right for the grade. Plain text only (no markdown). Math in simple notation like x^2, sqrt(x).`;
    const user = `Subject: ${data.subject || "General"}\nTopic: ${data.topic || "(infer from question)"}\nQuestion: ${data.question}\n${
      data.previous ? `\nPrevious explanation given:\n${data.previous}\n` : ""
    }${MODE_HINT[data.mode]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "medium", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: { format: { type: "json_schema", name: "explanation", strict: true, schema: SCHEMA } },
      }),
    });
    if (res.status === 429) throw new Error("Too many questions right now — please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI usage limit reached for this workspace. Please add credits to continue.");
    if (res.status === 403) throw new Error("The doubt solver isn't available for this workspace right now.");
    if (!res.ok || !res.body) throw new Error("Couldn't get an explanation right now. Please try again.");

    // Consume the SSE stream server-side and collect the final text.
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", failed = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          else if (ev.type === "response.failed" || ev.type === "error") failed = true;
        } catch { /* ignore partial */ }
      }
    }
    if (failed || !text) throw new Error("Couldn't get an explanation right now. Please try again.");
    let parsed: DoubtAnswer;
    try { parsed = JSON.parse(text) as DoubtAnswer; } catch { throw new Error("Couldn't get an explanation right now. Please try again."); }
    return {
      simple: parsed.simple ?? "",
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      example: parsed.example ?? "",
      check_question: parsed.check_question ?? "",
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      common_mistake: parsed.common_mistake ?? "",
    };
  });
