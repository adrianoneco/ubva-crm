import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Recover from './pages/Recover'
import WebGlass from './pages/WebGlass'
import AgendamentoPage from './pages/Agendamento'
import Settings from './pages/Settings'
import ContactsPage from './pages/Contacts'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/webglass" element={<WebGlass />} />
        <Route path="/agendamento" element={<AgendamentoPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
