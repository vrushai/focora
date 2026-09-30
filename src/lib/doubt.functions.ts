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
};

const MODE_HINT: Record<string, string> = {
  default: "",
  different: "The student did not understand the previous explanation. Explain it in a completely different way, using a new angle or analogy.",
  example: "The student wants more concrete examples. Make the example section richer and use a fresh, relatable real-world example.",
  simpler: "The student found it too hard. Make everything much simpler: shorter sentences, everyday words, no jargon.",
};

export const solveDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<DoubtAnswer> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("The doubt solver is not configured yet.");
    const system = `You are FocusStudy's patient tutor for a student in grade/class "${data.grade || "unspecified"}".
Teach understanding rather than just handing over homework answers. If the question looks like a homework problem, guide through the method and reasoning; show the approach but encourage the student to do the final step themselves where sensible.
Keep language appropriate for the grade. Be concise and warm. Use plain text (no markdown headings). Math can use simple notation like x^2.`;
    const user = `Subject: ${data.subject || "General"}\nTopic: ${data.topic || "-"}\nQuestion: ${data.question}\n${
      data.previous ? `\nPrevious explanation given:\n${data.previous}\n` : ""
    }${MODE_HINT[data.mode]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "explain",
              description: "Return a structured explanation for the student.",
              parameters: {
                type: "object",
                properties: {
                  simple: { type: "string", description: "Simple explanation, 2-4 sentences." },
                  steps: { type: "array", items: { type: "string" }, description: "3-6 short step-by-step points." },
                  example: { type: "string", description: "A simple real-world example." },
                  check_question: { type: "string", description: "One short question to check understanding." },
                },
                required: ["simple", "steps", "example", "check_question"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "explain" } },
      }),
    });
    if (res.status === 429) throw new Error("Too many questions right now — please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI usage limit reached for this workspace. Please add credits to continue.");
    if (!res.ok) throw new Error("Couldn't get an explanation right now. Please try again.");
    const json = await res.json();
    const args = json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Couldn't get an explanation right now. Please try again.");
    const parsed = JSON.parse(args) as DoubtAnswer;
    return {
      simple: parsed.simple ?? "",
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      example: parsed.example ?? "",
      check_question: parsed.check_question ?? "",
    };
  });
