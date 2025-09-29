export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const jsonResponse = (obj, status=200) => new Response(JSON.stringify(obj), {
      status, headers: { "Content-Type": "application/json", ...corsHeaders }
    });

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return jsonResponse({ ok: true });

    try {
      const body = await request.json();
      const { 
        nombre, instagram, telefono = "", ciudad = "", sector, competidor = "",
        objetivo = "", diferencial = "", consent = false, turnstileToken,
        utm_source = "", utm_medium = "", utm_campaign = "", utm_content = "", utm_term = ""
      } = body || {};

      if (!nombre || !instagram || !sector) return jsonResponse({ error: "Faltan campos obligatorios." }, 400);
      if (!consent) return jsonResponse({ error: "Debes aceptar la Política de Privacidad." }, 400);

      // 1) Verify Cloudflare Turnstile
      if (!turnstileToken) return jsonResponse({ error: "CAPTCHA requerido." }, 403);
      const tsResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: turnstileToken }),
      });
      const tsData = await tsResp.json();
      if (!tsData.success) return jsonResponse({ error: "CAPTCHA inválido." }, 403);

      // 2) Build prompt
      const role = "Eres estratega de vídeo corto para pymes en España. Entregas guiones de 8–12s con estructura Gancho–Problema–Solución (GPS), tono directo y local. Evita clichés.";
      const userPrompt = `Cliente:
- Nombre: ${nombre}
- Instagram: @${instagram}
- Ciudad: ${ciudad}
- Sector: ${sector}
- Objetivos y frenos: ${objetivo}
- Diferencial del negocio: ${diferencial}
- Competidor_IG (opcional): ${competidor}

Objetivo: Crea un guion para un reel de 8–12s (español de España) con estructura GPS, usando los objetivos y el diferencial cuando aporten claridad.

Devuelve SOLO este JSON válido:
{
  "guion": {
    "gancho": "(≤12 palabras, específico del sector y ciudad)",
    "problema": "(1 frase realista del obstáculo del cliente)",
    "solucion": "(1 frase con propuesta del negocio)",
    "cta": "(1 frase suave, p.ej. '¿Lo grabamos y lo publicas hoy?')"
  },
  "plano_a_plano": [
    { "segundos": "0-2", "accion": "...", "texto_pantalla": "...", "voz": "..." },
    { "segundos": "2-6", "accion": "...", "texto_pantalla": "...", "voz": "..." },
    { "segundos": "6-10", "accion": "...", "texto_pantalla": "...", "voz": "..." }
  ],
  "variantes_gancho": ["v1","v2","v3"],
  "checklist_diy": ["luz ...","sonido ...","encuadre ...","ritmo ..."],
  "nota_competidor": "Si no hay competidor, escribe: 'Sin referencia directa; enfoque genérico optimizado'."
}
Reglas:
- No inventes datos del competidor.
- Conciso, cero humo, español de España.`;

      // 3) Call Gemini (1.5-flash) with JSON response
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const payload = {
        contents: [{ role: "user", parts: [{ text: role + "\n\n" + userPrompt }]}],
        generationConfig: { temperature: 0.5, response_mime_type: "application/json" }
      };

      const aiResp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!aiResp.ok) {
        const t = await aiResp.text();
        return jsonResponse({ error: "IA no disponible", details: t }, 502);
      }
      const aiData = await aiResp.json();
      const raw = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let scriptJson;
      try { scriptJson = JSON.parse(raw); } catch(e) {
        return jsonResponse({ error: "Salida no válida", raw }, 500);
      }

      // 4) Persist lead (Sheets preferred; KV fallback). Storage is REQUIRED.
      const lead = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        nombre, instagram, telefono, ciudad, sector, competidor, objetivo, diferencial, consent: !!consent,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        script: scriptJson
      };

      let stored = false;

      // 4a) Google Sheets via Apps Script
      if (env.SHEETS_URL) {
        try {
          const r = await fetch(env.SHEETS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lead)
          });
          stored = r.ok;
        } catch (e) { /* ignore, try KV */ }
      }

      // 4b) KV fallback
      if (!stored && env.LEADS) {
        try {
          await env.LEADS.put(`lead:${lead.id}`, JSON.stringify(lead));
          stored = true;
        } catch (e) { /* ignore */ }
      }

      if (!stored) return jsonResponse({ error: "No se pudo guardar el lead. Reintenta en unos minutos." }, 503);

      // 5) Return script
      return jsonResponse(scriptJson, 200);
    } catch (err) {
      return jsonResponse({ error: "Error interno", details: String(err) }, 500);
    }
  }
};
