import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCanUseAiGeneration, incrementAiUsage } from "@/lib/plan-limits";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export type GenerateFromTextResponse = {
  title: string;
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  tags: string[];
};

const GENERIC_TAGS_BLOCKLIST = new Set([
  "decisione", "decisioni", "tecnica", "tecniche", "architettura", "scelta", "scelte",
  "documentazione", "doc", "generico", "altro", "varie", "varia", "adr", "record",
]);

function isGenericTag(tag: string): boolean {
  return GENERIC_TAGS_BLOCKLIST.has(tag.toLowerCase().trim());
}

function buildSystemPrompt(existingTags: string[]): string {
  const base = `Sei un assistente che trasforma testi liberi in record di decisione tecnica (ADR) strutturati.
Ricevi un testo (meeting, note, descrizione) e restituisci un JSON con questi campi, tutti in italiano dove è testo:
- title: string (titolo breve e chiaro della decisione)
- context: string (contesto, problema o situazione che ha portato alla decisione)
- options: string[] (elenco delle opzioni considerate, ogni elemento una stringa)
- decision: string (la decisione finale presa)
- consequences: string (conseguenze positive e negative)
- tags: string[] (SOLO tag pertinenti, lowercase; vedi regole sotto)`;
  const end = "\n\nRestituisci SOLO il JSON, senza markdown e senza ```json.";

  if (existingTags.length > 0) {
    const tagList = existingTags.slice(0, 80).join(", ");
    return `${base}

REGOLE PER I TAG (obbligatorie):
1. Usa SOLO tag dalla lista esistente qui sotto quando sono pertinenti al testo. Scegli 2-5 tag dalla lista.
2. NON usare mai tag generici come: decisione, tecnica, architettura, scelta, documentazione, adr, generico.
3. Se nessun tag della lista si adatta bene, puoi proporre al massimo 1-2 tag NUOVI ma SOLO se sono specifici e tecnici (es. api, database, auth, caching, deployment, testing, sicurezza, performance, frontend, backend, storage, queue, ci-cd, monitoring). Mai tag vaghi o meta (niente "decisione", "tecnica", "architettura").

LISTA TAG ESISTENTI NEL SISTEMA (scegli solo da qui quando possibile):
${tagList}
${end}`;
  }

  return `${base}

REGOLE PER I TAG: Usa solo tag specifici e tecnici (es. api, database, auth, caching, deployment, testing, sicurezza, performance). Vietati tag generici come: decisione, tecnica, architettura, scelta, documentazione.
${end}`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const usageCheck = await checkCanUseAiGeneration(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json(
      { error: usageCheck.error ?? "Limite generazioni AI raggiunto" },
      { status: 403 }
    );
  }

  const apiKey = process.env.OPEN_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPEN_AI_API_KEY non configurata" },
      { status: 500 }
    );
  }

  let body: { text?: string; existingTags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON non valido" },
      { status: 400 }
    );
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json(
      { error: "Campo 'text' obbligatorio" },
      { status: 400 }
    );
  }

  const existingTags = Array.isArray(body.existingTags)
    ? body.existingTags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const systemPrompt = buildSystemPrompt(existingTags);

  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return NextResponse.json(
        { error: "Errore durante la generazione" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Risposta API vuota" },
        { status: 502 }
      );
    }

    // Rimuovi eventuale markdown code block
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const rawTags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => (typeof t === "string" ? t.toLowerCase().trim() : String(t).toLowerCase().trim()))
      : [];
    const tags = rawTags.filter((t) => t.length > 0 && !isGenericTag(t));

    const result: GenerateFromTextResponse = {
      title: typeof parsed.title === "string" ? parsed.title : "",
      context: typeof parsed.context === "string" ? parsed.context : "",
      options: Array.isArray(parsed.options)
        ? parsed.options.map((o) => (typeof o === "string" ? o : String(o)))
        : [],
      decision: typeof parsed.decision === "string" ? parsed.decision : "",
      consequences: typeof parsed.consequences === "string" ? parsed.consequences : "",
      tags,
    };

    await incrementAiUsage(user.id);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Generate from text error:", e);
    return NextResponse.json(
      { error: "Errore durante la generazione" },
      { status: 500 }
    );
  }
}
