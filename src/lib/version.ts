const branch = process.env.NEXT_PUBLIC_APP_BRANCH
const commit = process.env.NEXT_PUBLIC_APP_COMMIT

// Il suffisso -dev compare ovunque l'app non giri dal branch master (dev e locale)
export const APP_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION}${branch === "master" ? "" : "-dev"}`

export const APP_VERSION_FULL = commit ? `${APP_VERSION} · ${commit}` : APP_VERSION
