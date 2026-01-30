import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null // Don't show offline page if online
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="text-7xl mb-4 animate-pulse">📶</div>
          <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full mb-4">
            <p className="text-red-400 text-sm font-semibold">Sem conexão</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-3">
            Você está offline
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Parece que você perdeu sua conexão com a internet. Algumas funcionalidades podem estar limitadas.
          </p>
        </div>

        {/* Status Check */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-8 border border-gray-700">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-gray-300 text-sm">Aguardando conexão...</p>
          </div>
          <p className="text-xs text-gray-500">
            Conecte-se à internet para acessar todas as funcionalidades
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
          >
            🔄 Tentar Novamente
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all"
          >
            ← Voltar
          </button>
        </div>

        {/* Tips */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-xs mb-4 font-semibold">💡 Dicas:</p>
          <ul className="text-left space-y-2 text-gray-400 text-xs">
            <li>✓ Verifique sua conexão Wi-Fi ou dados móveis</li>
            <li>✓ Tente desabilitar e reabilitar o Wi-Fi</li>
            <li>✓ Se o problema persistir, reinicie o seu dispositivo</li>
            <li>✓ Alguns dados em cache podem estar disponíveis</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
