import { generateText, stepCountIs, type ModelMessage } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { chatbotTools } from "./tools"

import { getChatbotModel } from "./settings"

function instructions(): string {
  const oggi = new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" })
  return `Sei l'assistente di NSC1 (Note Spese del Gruppo Scout Cologno 1). Rispondi sempre in italiano, in modo breve e chiaro.
Data di oggi: ${oggi}.
Regole:
- Usa SOLO gli strumenti per leggere i dati; non inventare mai numeri, note o annate. Se i dati non bastano, dillo.
- Per ogni somma o confronto usa lo strumento 'totali' (calcoli esatti); non sommare a mano.
- Le annate sono i file "Bilancio AAAA-AAAA". Le branche sono LC, CdA, EG, Novi, Clan, CoCa, Gruppo.
- Gli importi sono in euro, con due decimali. "Uscita" è una spesa, "Entrata" è un incasso.
- Per elenchi e confronti usa tabelle Markdown. Per le sintesi, poche righe.
- Ogni movimento ha anche i dati di audit: creatoDa/creatoIl (chi e quando l'ha inserito) e modificatoDa/modificatoIl (ultima modifica; "-" se mai modificato). Usali per domande su chi ha inserito o modificato cosa e quando.
- Sei in sola lettura: non puoi creare, modificare o eliminare movimenti.
- Se la domanda non riguarda il bilancio del gruppo, rifiuta con gentilezza.`
}

export async function testModel(model: string): Promise<void> {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  await generateText({ model: google(model), prompt: "Rispondi solo: ok", maxOutputTokens: 20 })
}

export async function runChat(messages: ModelMessage[]): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  const result = await generateText({
    model: google(await getChatbotModel()),
    instructions: instructions(),
    messages,
    tools: chatbotTools,
    stopWhen: stepCountIs(6),
    maxOutputTokens: 2000,
  })
  return result.text || "Non sono riuscito a formulare una risposta. Riprova con una domanda più precisa."
}
