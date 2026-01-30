import { ReactNode, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

// Helper function to get saved theme
const getSavedTheme = (): 'system' | 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'system'
  const savedSettings = localStorage.getItem('ubva_settings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      if (parsed.theme) return parsed.theme
    } catch {}
  }
  const legacyTheme = localStorage.getItem('theme')
  if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme
  return 'system'
}

// Helper function to apply theme to DOM
const applyThemeToDOM = (theme: 'system' | 'light' | 'dark') => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    // system: follow prefers-color-scheme
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

// Apply theme immediately on load (before component mounts)
if (typeof window !== 'undefined') {
  applyThemeToDOM(getSavedTheme())
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'system'|'light'|'dark'>(getSavedTheme)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Apply theme when it changes
  useEffect(() => {
    applyThemeToDOM(theme)
  }, [theme])

  // Listen for settings changes from other tabs or same tab
  useEffect(() => {
    const syncTheme = () => {
      const currentTheme = getSavedTheme()
      if (currentTheme !== theme) {
        setTheme(currentTheme)
        applyThemeToDOM(currentTheme)
      }
    }
    window.addEventListener('storage', syncTheme)
    const interval = setInterval(syncTheme, 500)
    return () => {
      window.removeEventListener('storage', syncTheme)
      clearInterval(interval)
    }
  }, [theme])

  const toggleDarkMode = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    // Also update ubva_settings
    const savedSettings = localStorage.getItem('ubva_settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      parsed.theme = newTheme
      localStorage.setItem('ubva_settings', JSON.stringify(parsed))
    }
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const canAccessSettings = user.role === 'admin' || user.role === 'manager'

  const navItemClass = (path: string) =>
    `w-full text-left py-3 px-4 rounded-lg transition-all flex items-center gap-3 ${location.pathname === path ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-40 h-16">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">CRM UBVA</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Sistema de Gestão</div>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || 'Usuário'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.email || 'email@exemplo.com'}</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-20">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || 'Usuário'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email || 'email@exemplo.com'}</div>
                      </div>
                      {canAccessSettings && (
                        <button
                          onClick={() => { setUserMenuOpen(false); navigate('/settings') }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Configurações
                        </button>
                      )}
                      <button
                        onClick={() => { localStorage.removeItem('user'); navigate('/login') }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        <aside className="hidden md:flex flex-col w-64 bg-white/90 dark:bg-gray-800/90 border-r border-gray-200 dark:border-gray-700 p-4 fixed top-16 left-0 h-[calc(100vh-4rem)] z-30">
          {/* Main Navigation */}
          <nav className="flex flex-col gap-2 flex-1">
            <button onClick={() => navigate('/dashboard')} className={navItemClass('/dashboard')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Dashboard</span>
            </button>

            {/* CRM Section */}
            <div className="pt-3 pb-1">
              <span className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">CRM</span>
            </div>

            <button onClick={() => navigate('/webglass')} className={navItemClass('/webglass')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span className="font-medium">Pipeline</span>
            </button>

            <button onClick={() => navigate('/contacts')} className={navItemClass('/contacts')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Contatos</span>
            </button>

            <button onClick={() => navigate('/campaigns')} className={navItemClass('/campaigns')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <span className="font-medium">Campanhas</span>
            </button>

            <button onClick={() => navigate('/sales')} className={navItemClass('/sales')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Vendas</span>
            </button>

            <button onClick={() => navigate('/agendamento')} className={navItemClass('/agendamento')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Agendamentos</span>
            </button>
          </nav>

          {/* Footer with Settings */}
          {canAccessSettings && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <button onClick={() => navigate('/settings')} className={navItemClass('/settings')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Configurações</span>
              </button>
            </div>
          )}
        </aside>

        <div className="flex-1 md:ml-64">
          {/* Mobile bottom nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 z-30">
            <div className="flex justify-around py-2">
              <button onClick={() => navigate('/dashboard')} className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/dashboard' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-xs">Home</span>
              </button>
              <button onClick={() => navigate('/agendamento')} className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/agendamento' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Agenda</span>
              </button>
              <button onClick={() => navigate('/webglass')} className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/webglass' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                <span className="text-xs">Pipeline</span>
              </button>
              <button onClick={() => navigate('/contacts')} className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/contacts' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs">Contatos</span>
              </button>
              {canAccessSettings && (
                <button onClick={() => navigate('/settings')} className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === '/settings' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                  <span className="text-xs">Config</span>
                </button>
              )}
            </div>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
