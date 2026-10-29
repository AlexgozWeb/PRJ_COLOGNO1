export type Branca = 'LC' | 'CdA' | 'EG' | 'Novi' | 'Clan' | 'CoCa' | 'Gruppo'
export type InOut = 'Entrata' | 'Uscita'
export type Modalita = 'Carta' | 'Contanti'
export type Fondo = 'Distintivi' | 'Materiale' | 'Pernotti' | 'VdB' | 'Altro'

export const IN_OUT: InOut[] = ['Entrata', 'Uscita']
export const MODALITA: Modalita[] = ['Carta', 'Contanti']
export const FONDI: Fondo[] = ['Distintivi', 'Materiale', 'Pernotti', 'VdB', 'Altro']

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
}

export interface UserContext {
  isAdmin: boolean
  permessi: Record<Branca, boolean>
  annoAttivo: string
}
