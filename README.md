# Guion Reel – Dark + Marca (Alberto Martín)

- Tema **oscuro** con gradientes sutiles y tarjetas translúcidas.
- Branding en cabecera: **Alberto Martín** + enlace a **Instagram @amartinro**.
- Mantiene GDPR, Teléfono, UTMs y persistencia (Sheets preferido / KV fallback).

## Configuración rápida
1. **Worker** (API): variables `GEMINI_API_KEY`, `TURNSTILE_SECRET`, `SHEETS_URL` (opcional), binding `LEADS` (KV).
2. **Pages** (landing): edita en `index.html`:
   - `YOUR_TURNSTILE_SITE_KEY` (Turnstile en tema *dark*),
   - `API_URL` (URL del Worker),
   - `WA_NUM` (tu WhatsApp).
   - (Opcional) Cambia enlace de Política de Privacidad.
3. **Sheets**: pega `sheets_appscript.js` y despliega como Web App; pon `TU_SHEET_ID`.

Listo para Stories. Si quieres reemplazar colores por tu paleta, busca `indigo` / `emerald` en el HTML.
