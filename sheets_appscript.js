function doPost(e){
  const ss = SpreadsheetApp.openById('TU_SHEET_ID');
  const sh = ss.getSheetByName('Leads') || ss.insertSheet('Leads');
  const data = JSON.parse(e.postData.contents || "{}");
  sh.appendRow([
    new Date(),
    data.id || "",
    data.nombre || "",
    data.instagram || "",
    data.telefono || "",
    data.ciudad || "",
    data.sector || "",
    data.objetivo || "",
    data.diferencial || "",
    data.competidor || "",
    data.consent ? "sí" : "no",
    data.utm_source || "",
    data.utm_medium || "",
    data.utm_campaign || "",
    data.utm_content || "",
    data.utm_term || "",
    JSON.stringify(data.script || {})
  ]);
  return ContentService.createTextOutput(JSON.stringify({ok:true}))
         .setMimeType(ContentService.MimeType.JSON);
}