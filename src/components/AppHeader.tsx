import Link from "next/link"
import ThemeToggle from "./ThemeToggle"
import SideMenu from "./SideMenu"

interface Props {
  /** Se presente mostra il pulsante ← backLabel a sinistra del toggle */
  backHref?: string
  backLabel?: string
  /** Contenuto specifico della pagina (branca info, titolo admin, ecc.) */
  children?: React.ReactNode
  /** Elementi aggiuntivi a destra del toggle (SignOut, nome utente, ecc.) */
  rightContent?: React.ReactNode
}

/**
 * Header comune a tutte le pagine.
 * Struttura:
 *   [Logo + "Nota Spese DEV" + "Gruppo Scout Cologno 1"] | [children]  ···  [← back] [ThemeToggle] [rightContent]
 */
export default function AppHeader({ backHref, backLabel = "Dashboard", children, rightContent }: Props) {
  return (
    <header className="bg-slate-800 shadow-lg">
      <div className="max-w-6xl mx-auto px-3 sm:px-8 py-2 sm:py-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">

        <SideMenu />

        {/* Gruppo logo — sempre presente, cliccabile → dashboard */}
        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 flex-shrink-0 group">
          <img
            src="/logo-gruppo.png"
            alt="Gruppo Scout Cologno 1"
            className="w-11 h-11 sm:w-16 sm:h-16 object-contain transition-opacity group-hover:opacity-80"
            style={{ mixBlendMode: "screen" }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white leading-tight">Nota Spese</span>
              {process.env.ENVIRONMENT_CODE && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: process.env.ENVIRONMENT_BKG_COLOR || "#f97316",
                    color: process.env.ENVIRONMENT_TXT_COLOR || "#ffffff",
                  }}
                >
                  {process.env.ENVIRONMENT_CODE}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-tight mt-0.5">Gruppo Scout Cologno 1</p>
          </div>
        </Link>

        {/* Separatore verticale + contenuto pagina */}
        {children && (
          <>
            <div className="w-px h-10 bg-slate-600 flex-shrink-0 hidden sm:block" />
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {children}
            </div>
          </>
        )}

        {!children && <div className="flex-1" />}

        {/* Destra */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← {backLabel}
            </Link>
          )}
          <ThemeToggle />
          {rightContent}
        </div>
      </div>
    </header>
  )
}
