// Endpoint rimosso: la cancellazione singola ora usa DELETE /api/allegati/[branca]/[idNota] con body { fileUrl }
export async function DELETE() {
  return Response.json({ error: "Endpoint deprecato. Usa DELETE /api/allegati/[branca]/[idNota] con body { fileUrl }" }, { status: 410 })
}
