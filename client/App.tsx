import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Recover from './pages/Recover'
import WebGlass from './pages/WebGlass'
import AgendamentoPage from './pages/Agendamento'
import Settings from './pages/Settings'
import ContactsPage from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Campaigns from './pages/Campaigns'
import Sales from './pages/Sales'
import ErrorPage from './pages/ErrorPage'
import OfflinePage from './pages/OfflinePage'
import MainLayout from './components/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import PWAUpdateNotification from './components/PWAUpdateNotification'
import { useOnlineStatus, usePullToRefresh } from './utils/hooks'

function App() {
  const isOnline = useOnlineStatus()

  const handleRefresh = async () => {
    // Clear cache and reload data
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }
    
    // Reload the current page without full browser refresh
    window.location.reload()
  }

  usePullToRefresh(handleRefresh)

  useEffect(() => {
    // Create pull-to-refresh indicator if not exists
    if (!document.getElementById('pull-to-refresh-indicator')) {
      const indicator = document.createElement('div')
      indicator.id = 'pull-to-refresh-indicator'
      indicator.className = 'fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-blue-500 to-transparent flex items-center justify-center text-white font-semibold text-sm transition-all duration-200 pointer-events-none z-40 opacity-0'
      indicator.innerHTML = '↓ Puxe para atualizar'
      indicator.style.transform = 'translateY(-100%)'
      document.body.appendChild(indicator)
    }
  }, [])

  // Show offline page if offline
  if (!isOnline) {
    return <OfflinePage />
  }

  return (
    <BrowserRouter>
      <PWAUpdateNotification />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/webglass" element={<WebGlass />} />
        <Route path="/agendamento" element={<AgendamentoPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/settings" element={<Navigate to="/settings/geral" replace />} />
        <Route path="/settings/:page" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MainLayout><Settings /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/crm" element={<CRM />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/error/:code" element={<ErrorPage />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
