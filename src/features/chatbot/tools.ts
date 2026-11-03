import { tool } from "ai"
import { z } from "zod"
import { listBilanci } from "@/lib/config"
import { getMovimenti } from "@/lib/sheets"
import { Branca, Movimento } from "@/types"

const BRANCHE = ["LC", "CdA", "EG", "Novi", "Clan", "CoCa", "Gruppo"] as const
const MAX_RIGHE = 150

type Annata = { id: string; name: string }

async function resolveAnnate(riferimenti: string[]): Promise<Annata[]> {
  const tutte = await listBilanci()
  const trovate: Annata[] = []
  for (const r of riferimenti) {
    const q = r.trim().toLowerCase()
    const a = tutte.find(x => x.id === r || x.name.toLowerCase() === q) || tutte.find(x => x.name.toLowerCase().includes(q))
    if (a && !trovate.some(t => t.id === a.id)) trovate.push(a)
  }
  return trovate
}

async function leggi(annata: Annata, branche: readonly Branca[]): Promise<(Movimento & { branca: Branca; annata: string })[]> {
  const risultati = await Promise.all(
    branche.map(async branca => {
      try {
        const righe = await getMovimenti(annata.id, branca)
        return righe.map(m => ({ ...m, branca, annata: annata.name }))
      } catch {
        return [] // la branca può non esistere in quell'annata
      }
    })
  )
  return risultati.flat()
}

const isEntrata = (m: Movimento) => m.inOut.trim().toLowerCase() === "entrata"
const isUscita = (m: Movimento) => m.inOut.trim().toLowerCase() === "uscita"

function meseDi(data: string): string {
  const [, m, a] = data.split("/")
  return a && m ? `${a}-${m.padStart(2, "0")}` : "(senza data)"
}

const round = (n: number) => Math.round(n * 100) / 100

export const chatbotTools = {
  elenco_annate: tool({
    description: "Elenco delle annate (file bilancio) disponibili.",
    inputSchema: z.object({}),
    execute: async () => ({ annate: (await listBilanci()).map(a => a.name) }),
  }),

  movimenti: tool({
    description: `Elenco dei singoli movimenti (note spese) di un'annata, filtrabile per branca. Restituisce al massimo ${MAX_RIGHE} righe: per totali e confronti usa 'totali'.`,
    inputSchema: z.object({
      annata: z.string().describe("Nome dell'annata, es. 'Bilancio 2026-2027'"),
      branca: z.enum(BRANCHE).optional().describe("Se omessa, tutte le branche"),
      inOut: z.enum(["Entrata", "Uscita"]).optional(),
      testo: z.string().optional().describe("Filtra per testo contenuto in note o codice"),
      utente: z.string().optional().describe("Filtra per email (o parte) di chi ha creato o modificato il movimento"),
    }),
    execute: async ({ annata, branca, inOut, testo, utente }) => {
      const [a] = await resolveAnnate([annata])
      if (!a) return { errore: `Annata non trovata: ${annata}` }
      let righe = await leggi(a, branca ? [branca] : BRANCHE)
      if (inOut) righe = righe.filter(m => m.inOut.toLowerCase() === inOut.toLowerCase())
      if (testo) {
        const t = testo.toLowerCase()
        righe = righe.filter(m => `${m.note} ${m.codice}`.toLowerCase().includes(t))
      }
      if (utente) {
        const u = utente.toLowerCase()
        righe = righe.filter(m => `${m.creatoDa} ${m.modificatoDa}`.toLowerCase().includes(u))
      }
      return {
        annata: a.name,
        totaleRighe: righe.length,
        troncato: righe.length > MAX_RIGHE,
        righe: righe.slice(0, MAX_RIGHE).map(m => ({
          branca: m.branca, idNota: m.idNota, data: m.data, inOut: m.inOut, modalita: m.modalita,
          fondo: m.fondo, importo: m.importo, codice: m.codice, note: m.note,
          creatoDa: m.creatoDa, creatoIl: m.creatoIl, modificatoDa: m.modificatoDa, modificatoIl: m.modificatoIl,
        })),
      }
    },
  }),

  totali: tool({
    description: "Calcola entrate, uscite e saldo, anche raggruppati e a confronto tra più annate. I calcoli sono esatti: usa questo strumento per ogni somma.",
    inputSchema: z.object({
      annate: z.array(z.string()).min(1).max(6).describe("Nomi delle annate da includere"),
      branca: z.enum(BRANCHE).optional().describe("Se omessa, tutte le branche"),
      raggruppaPer: z.enum(["nessuno", "branca", "fondo", "modalita", "mese", "annata"]).default("nessuno"),
    }),
    execute: async ({ annate, branca, raggruppaPer }) => {
      const trovate = await resolveAnnate(annate)
      if (trovate.length === 0) return { errore: "Nessuna annata trovata" }
      const righe = (await Promise.all(trovate.map(a => leggi(a, branca ? [branca] : BRANCHE)))).flat()
      const gruppi = new Map<string, { entrate: number; uscite: number; movimenti: number }>()
      for (const m of righe) {
        const chiave =
          raggruppaPer === "branca" ? m.branca
          : raggruppaPer === "fondo" ? m.fondo || "(vuoto)"
          : raggruppaPer === "modalita" ? m.modalita || "(vuoto)"
          : raggruppaPer === "mese" ? meseDi(m.data)
          : raggruppaPer === "annata" ? m.annata
          : "Totale"
        const g = gruppi.get(chiave) ?? { entrate: 0, uscite: 0, movimenti: 0 }
        if (isEntrata(m)) g.entrate += m.importo
        else if (isUscita(m)) g.uscite += m.importo
        g.movimenti += 1
        gruppi.set(chiave, g)
      }
      return {
        annate: trovate.map(a => a.name),
        righe: [...gruppi.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([gruppo, g]) => ({ gruppo, entrate: round(g.entrate), uscite: round(g.uscite), saldo: round(g.entrate - g.uscite), movimenti: g.movimenti })),
      }
    },
  }),
}
