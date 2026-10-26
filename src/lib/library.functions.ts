import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type LibraryAnswer = {
  simple?: string;
  steps?: string[];
  example?: string;
  key_points?: string[];
  common_mistake?: string;
  check_question?: string;
};

export type LibraryEntry = {
  id: string;
  subject: string;
  topic: string;
  question: string;
  answer: LibraryAnswer;
  author_name: string;
  hearts: number;
  created_at: string;
};

/** Public, signed-out-safe read of the shared Doubt Library (server-side, publishable key). */
export const getLibraryDoubts = createServerFn({ method: "GET" }).handler(async (): Promise<LibraryEntry[]> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabasePublic
    .from("doubt_library")
    .select("id,subject,topic,question,answer,author_name,hearts,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LibraryEntry[];
});
