const branch = process.env.NEXT_PUBLIC_APP_BRANCH
const commit = process.env.NEXT_PUBLIC_APP_COMMIT

// Produzione = deploy dal branch master. Dev e locale (nessun branch) sono ambiente di sviluppo.
export const IS_PRODUZIONE = branch === "master"

export const APP_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION}${IS_PRODUZIONE ? "" : "-dev"}`

export const APP_VERSION_FULL = commit ? `${APP_VERSION} · ${commit}` : APP_VERSION

// Titolo dell'ultimo commit (vuoto in locale)
export const APP_COMMIT_MESSAGE = process.env.NEXT_PUBLIC_APP_COMMIT_MSG ?? ""
