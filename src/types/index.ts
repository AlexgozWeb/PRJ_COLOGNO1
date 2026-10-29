export type Branca = 'LC' | 'CdA' | 'EG' | 'Novi' | 'Clan' | 'CoCa' | 'Gruppo'

export interface ValoreLista {
  valore: string
  textColor: string  // esadecimale, "" se non definito
  bgColor: string
}

export interface ListeValori {
  inOut: ValoreLista[]
  modalita: ValoreLista[]
  fondo: ValoreLista[]
}

export const BRANCHE: Branca[] = ['LC', 'CdA', 'EG', 'Novi', 'Clan', 'CoCa', 'Gruppo']

export const BRANCA_CODICE: Record<Branca, string> = {
  LC: 'BLC',
  CdA: 'CDA',
  EG: 'BEG',
  Novi: 'NOV',
  Clan: 'CLA',
  CoCa: 'COC',
  Gruppo: 'GRU',
}

export const BRANCA_LABELS: Record<Branca, string> = {
  LC: 'Branca LC',
  CdA: 'Branca LC - CdA',
  EG: 'Esploratori e Guide',
  Novi: 'Noviziato',
  Clan: 'Clan',
  CoCa: 'Comunità Capi',
  Gruppo: 'Gruppo',
}

export interface Movimento {
  id: number       // riga nel foglio (1-based, a partire dalla riga 3)
  numero: number   // numero progressivo (colonna A)
  data: string
  inOut: string
  modalita: string
  fondo: string
  importo: number
  codice: string
  note: string
  status: string
  idNota: string   // colonna J: codice univoco allegati (es. BLC001)
  allegati: boolean // colonna K: TRUE se la nota ha almeno un allegato
}

export interface Permessi {
  [email: string]: Record<Branca, boolean>
}

export interface AllegatoFile {
  id: string      // URL pubblico del blob
  name: string
  mimeType: string
}

export interface Config {
  annoAttivo: string   // spreadsheet ID del file anno corrente
  adminEmails: string[]
  maxAttachmentSizeMb: number
}

export interface UserContext {
  isAdmin: boolean
  permessi: Record<Branca, boolean>
  annoAttivo: string
}
