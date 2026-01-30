import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Back online')
      setIsOnline(true)
    }
    
    const handleOffline = () => {
      console.log('🔴 Gone offline')
      setIsOnline(false)
    }

    // Check connection every 5 seconds
    const interval = setInterval(() => {
      setIsOnline(navigator.onLine)
    }, 5000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return isOnline
}

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  useEffect(() => {
    let touchStartY = 0
    let isRefreshing = false

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger on pull from top
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing) return
      
      const touchCurrentY = e.touches[0].clientY
      const diff = touchCurrentY - touchStartY

      // Only show indicator if pulled down more than 80px
      if (diff > 80 && window.scrollY === 0) {
        const indicator = document.getElementById('pull-to-refresh-indicator')
        if (indicator) {
          indicator.style.opacity = '1'
          indicator.style.transform = `translateY(${diff * 0.5}px)`
        }
      }
    }

    const handleTouchEnd = async (e: TouchEvent) => {
      if (isRefreshing) return

      const touchEndY = (e as any).changedTouches?.[0]?.clientY || touchStartY
      const diff = touchEndY - touchStartY
      const indicator = document.getElementById('pull-to-refresh-indicator')

      // Trigger refresh if pulled down more than 100px
      if (diff > 100 && window.scrollY === 0) {
        isRefreshing = true
        if (indicator) {
          indicator.style.opacity = '1'
          indicator.innerHTML = '<div class="animate-spin">⊙</div>'
        }

        try {
          await onRefresh()
        } catch (error) {
          console.error('Pull to refresh error:', error)
        } finally {
          isRefreshing = false
          if (indicator) {
            indicator.style.opacity = '0'
            indicator.style.transform = 'translateY(0)'
            indicator.innerHTML = '↓ Puxe para atualizar'
          }
        }
      } else {
        // Reset if not pulled enough
        if (indicator) {
          indicator.style.opacity = '0'
          indicator.style.transform = 'translateY(0)'
          indicator.innerHTML = '↓ Puxe para atualizar'
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onRefresh])
}
