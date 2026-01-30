import { useState, useEffect } from 'react'

export default function PWAUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateAvailable(true)
      })

      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg)

        // Check for updates every 5 minutes
        setInterval(() => {
          reg.update()
        }, 5 * 60 * 1000)
      })
    }
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      // Reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
      <span className="text-sm font-medium">Nova versão disponível</span>
      <button
        onClick={handleUpdate}
        className="px-4 py-1 bg-white text-blue-500 rounded font-semibold text-sm hover:bg-blue-50 transition-colors"
      >
        Atualizar
      </button>
    </div>
  )
}
