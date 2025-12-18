import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'
import * as Papa from 'papaparse'
import { extrairTelefones, formatarTelefonesParaPreview, telefonesParaJSON } from '../utils/phoneExtractor'


interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  type?: string
  avatar?: string | null
  isWhatsapp?: number
}

interface BroadcastList {
  id: string
  name: string
  description?: string
  contacts: string[]
  createdAt?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [broadcastLists, setBroadcastLists] = useState<BroadcastList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  // Import modal state
  const [importOpen, setImportOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({ name: null, email: null, phone: null, company: null, type: null })
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)

  // UI helpers
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'name'|'recent'>('name')
  const [showNewListModal, setShowNewListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')

  // Automatic lists on import
  const [autoCreateLists, setAutoCreateLists] = useState(false)
  const [autoListBaseName, setAutoListBaseName] = useState('Imported')

  // Modal for add/edit contact
  const [showModal, setShowModal] = useState(false)
  const [modalContact, setModalContact] = useState<Contact | null>(null)
  const [modalAvatarFile, setModalAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    fetchContacts()
    fetchBroadcastLists()
  }, [])

  const fetchContacts = async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
    return data
  }

  const fetchBroadcastLists = async () => {
    try {
      const res = await fetch('/api/broadcast-lists')
      if (res.ok) {
        const data = await res.json()
        setBroadcastLists(data)
      }
    } catch (e) {
      setBroadcastLists([])
    }
  }

  const createBroadcastList = async () => {
    if (!newListName.trim()) return
    try {
      const res = await fetch('/api/broadcast-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newListName, description: newListDesc, contacts: [] }) })
      if (res.ok) {
        await fetchBroadcastLists()
        setNewListName('')
        setNewListDesc('')
        setShowNewListModal(false)
      } else {
        const err = await res.json()
        alert('Erro ao criar lista: ' + (err.error || res.statusText))
      }
    } catch (e) {
      alert('Erro ao criar lista')
    }
  }



  const deleteBroadcastList = async (id: string) => {
    if (!confirm('Remover lista?')) return
    try {
      const res = await fetch(`/api/broadcast-lists/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchBroadcastLists()
        if (selectedListId === id) setSelectedListId(null)
      } else {
        const err = await res.json()
        alert('Erro ao remover lista: ' + (err.error || res.statusText))
      }
    } catch (e) {
      alert('Erro ao remover lista')
    }
  }

  const openNewModal = () => { setModalContact(null); setModalAvatarFile(null); setShowModal(true) }
  const openEditModal = (c: Contact) => { setModalContact(c); setModalAvatarFile(null); setShowModal(true) }

  const handleModalCancel = () => { setShowModal(false); setModalContact(null); setModalAvatarFile(null) }

  const handleModalSave = async (e: any) => {
    e.preventDefault()
    const form = e.target
    const payload = {
      name: form.name.value,
      email: form.email.value || null,
      phone: form.phone.value || null,
      company: form.company.value || null,
      type: form.type.value || 'default',
    }

    try {
      if (modalContact && modalContact.id) {
        const id = modalContact.id
        await fetch(`/api/contacts/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        if (modalAvatarFile) await uploadAvatar(id, modalAvatarFile, payload.type || 'default')
      } else {
        const res = await fetch('/api/contacts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const created = await res.json()
        if (modalAvatarFile) await uploadAvatar(created.id, modalAvatarFile, created.type || 'default')
      }
    } catch (err) {
      console.error('Save contact failed', err)
      alert('Erro ao salvar contato')
    }

    setShowModal(false)
    setModalContact(null)
    setModalAvatarFile(null)
    fetchContacts()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete contact?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    fetchContacts()
  }

  const uploadAvatar = async (id: string, file: File, type: string) => {
    const fd = new FormData()
    fd.append('avatar', file)
    fd.append('type', type)
    await fetch(`/api/contacts/${id}/avatar`, { method: 'POST', body: fd })
    fetchContacts()
  }

  const grouped: Record<string, Contact[]> = {}
  contacts.forEach(c => {
    const t = c.type || 'default'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(c)
  })

  const getInitials = (n?: string) => {
    if (!n) return ''
    return n.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()
  }

  const searchQuery = search.toLowerCase().trim()
  const isContactVisible = (c: Contact) => {
    // Filtrar por lista selecionada
    if (selectedListId) {
      const selectedList = broadcastLists.find(l => l.id === selectedListId)
      if (selectedList && !selectedList.contacts.includes(c.id)) {
        return false
      }
    }
    
    if (!searchQuery) return true
    return (c.name || '').toLowerCase().includes(searchQuery) || (c.email || '').toLowerCase().includes(searchQuery) || (c.company || '').toLowerCase().includes(searchQuery)
  }

  const visibleCount = Object.entries(grouped).filter(([k]) => filterType === 'all' || k === filterType).reduce((acc, [, items]) => acc + items.filter(isContactVisible).length, 0)

  return (
    <MainLayout>
      <div className="min-h-screen h-screen">
        {/* Header */}
        <div className="flex items-center justify-between h-20">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contatos</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{contacts.length} contatos • {Object.keys(grouped).length} grupos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNewModal} className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg shadow-primary-500/30 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Contato
            </button>
            <button 
              onClick={() => {
                // Filtrar contatos que tenham pelo menos 1 tipo de telefone
                const contactsWithPhone = contacts.filter(c => {
                  if (!c.phone) return false
                  try {
                    const phones = JSON.parse(c.phone)
                    return Object.keys(phones).length > 0
                  } catch {
                    return c.phone.trim().length > 0
                  }
                })
                
                if (contactsWithPhone.length === 0) {
                  alert('Nenhum contato com telefone encontrado')
                  return
                }
                
                // Criar CSV
                const headers = ['nome', 'email', 'telefones', 'empresa']
                const rows = contactsWithPhone.map(c => {
                  let phonesStr = ''
                  if (c.phone) {
                    try {
                      const phones = JSON.parse(c.phone)
                      phonesStr = Object.entries(phones).map(([tipo, numero]) => {
                        if (Array.isArray(numero)) {
                          return `${tipo}: ${numero.join(', ')}`
                        }
                        return `${tipo}: ${numero}`
                      }).join(' / ')
                    } catch {
                      phonesStr = c.phone
                    }
                  }
                  return [
                    c.name,
                    c.email || '',
                    phonesStr,
                    c.company || ''
                  ]
                })
                
                const csv = [headers, ...rows].map(row => 
                  row.map(cell => `"${cell}"`).join(',')
                ).join('\n')
                
                // Download
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `contatos_com_telefone_${new Date().toISOString().split('T')[0]}.csv`
                link.click()
                
                alert(`✅ ${contactsWithPhone.length} contato(s) com telefone exportados!`)
              }}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar c/ Tel
            </button>
            <button onClick={() => setImportOpen(true)} className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-lg shadow-emerald-500/30 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar
            </button>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Sidebar: Broadcast Lists */}
          <aside className="w-80 hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Listas</h3>
                  <button onClick={() => setShowNewListModal(true)} className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all font-medium shadow-sm">+ Nova</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{broadcastLists.length} lista(s) de transmissão</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {broadcastLists.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma lista</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Botão para mostrar todos */}
                    <button
                      onClick={() => setSelectedListId(null)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        selectedListId === null
                          ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">Todos os contatos</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{contacts.length} contatos</div>
                          </div>
                        </div>
                      </div>
                    </button>

                    {broadcastLists.map((l, idx) => (
                      <div key={l.id} className={`p-3 rounded-xl border-2 transition-all ${
                        selectedListId === l.id
                          ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">{l.name}</div>
                            {l.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{l.description}</div>}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {l.contacts?.length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => setSelectedListId(l.id)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors font-medium"
                          >
                            Ver Contatos
                          </button>
                          <button
                            onClick={() => deleteBroadcastList(l.id)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors font-medium"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-8 overflow-hidden">

{/* Filters + Contacts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="p-4 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Buscar por nome, email ou empresa..." 
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all" 
              />
              <select 
                value={sort} 
                onChange={e => setSort(e.target.value as any)} 
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="name">Ordenar: Nome</option>
                <option value="recent">Ordenar: Recentes</option>
              </select>
              <select 
                value={filterType} 
                onChange={e => setFilterType(e.target.value)} 
                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Todos os grupos</option>
                {Object.keys(grouped).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 h-[80vh]">
            {visibleCount === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Nenhum contato encontrado.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Crie um novo contato ou importe um arquivo.</p>
              </div>
            ) : (
              Object.entries(grouped).filter(([k]) => filterType === 'all' || k === filterType).map(([type, items]) => {
                const visible = items
                  .filter(c => isContactVisible(c))
                  .sort((a, b) => {
                    if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
                  const aDate = (a as any).updatedAt || (a as any).createdAt || ''
                  const bDate = (b as any).updatedAt || (b as any).createdAt || ''
                  return bDate.localeCompare(aDate)
                })

              return (
                <div key={type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{type}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{visible.length} de {items.length} contatos</p>
                    </div>
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm font-medium">
                      {visible.length}
                    </div>
                  </div>

                  {visible.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">Nenhum contato encontrado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visible.map(c => (
                        <div key={c.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 transition-all shadow-sm hover:shadow-md">
                          <div className="flex items-start gap-3 mb-3">
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-lg object-cover ring-2 ring-primary-100" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-semibold text-sm shadow-lg shadow-primary-400/30">
                                {getInitials(c.name)}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</div>
                              {c.company && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.company}</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 mb-3 pb-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                            {c.email && (
                              <div className="flex items-center gap-2 truncate">
                                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-2 truncate">
                                <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="truncate">{c.phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => openEditModal(c)} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors">
                              Editar
                            </button>
                            <button onClick={() => remove(c.id)} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
            )}
          </div>
        </div>

          {/* Import modal */}
          {importOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setImportOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-700 dark:to-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Contatos</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">CSV ou XLSX</p>
                  </div>
                  <button onClick={() => setImportOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Upload Section */}
                  {parsedRows.length === 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Selecione um arquivo</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".csv,.xls,.xlsx" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const name = file.name.toLowerCase()

                            if (name.endsWith('.csv')) {
                              const text = await file.text()
                              const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
                              const rows = parsed.data as any[]
                              setParsedRows(rows)
                              setFileColumns(Object.keys(rows[0] || {}))
                              setMapping({ name: Object.keys(rows[0] || {})[0] || null, email: Object.keys(rows[0] || {})[1] || null, phone: null, company: null, type: null })
                            } else {
                              const ab = await file.arrayBuffer()
                              // @ts-ignore - dynamic import for xlsx (types may not be found at build time)
                              const XLSX = (await import('xlsx')) as any
                              const wb = XLSX.read(ab, { type: 'array' })
                              const sheet = wb.Sheets[wb.SheetNames[0]]
                              const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[]
                              setParsedRows(rows)
                              setFileColumns(Object.keys(rows[0] || {}))
                              setMapping({ name: Object.keys(rows[0] || {})[0] || null, email: Object.keys(rows[0] || {})[1] || null, phone: null, company: null, type: null })
                            }
                          }} 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-all">
                          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Clique para selecionar ou arraste um arquivo</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CSV ou XLSX</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mapping and Preview */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                          Mapeamento de Colunas
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['name','email','phone','company'].map(field => (
                            <div key={field}>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">{field}</label>
                              <select 
                                value={mapping[field] || ''} 
                                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))} 
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                              >
                                <option value="">Nenhum</option>
                                {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                            Preview (primeiras 5)
                          </h4>
                          <button
                            onClick={() => {
                              // Otimizar dados: uppercase em nomes, lowercase em emails, formatar telefones
                              setParsedRows(prev => prev.map(row => {
                                const optimized = { ...row }
                                
                                // Nome em UPPERCASE
                                if (mapping.name && row[mapping.name]) {
                                  optimized[mapping.name] = row[mapping.name].toUpperCase()
                                }
                                
                                // Email em lowercase
                                if (mapping.email && row[mapping.email]) {
                                  optimized[mapping.email] = row[mapping.email].toLowerCase()
                                }
                                
                                // Telefone formatado para preview (comercial: (54) 3522-4853)
                                if (mapping.phone && row[mapping.phone]) {
                                  const telefones = extrairTelefones(row[mapping.phone])
                                  optimized[mapping.phone] = formatarTelefonesParaPreview(telefones)
                                }
                                
                                return optimized
                              }))
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all font-medium text-xs shadow-sm flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Otimizar Dados
                          </button>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Nome</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Telefone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">Empresa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.slice(0, 5).map((r, idx) => {
                                const row = {
                                  name: mapping.name ? r[mapping.name] : '—',
                                  email: mapping.email ? r[mapping.email] : '—',
                                  phone: mapping.phone ? r[mapping.phone] : '—',
                                  company: mapping.company ? r[mapping.company] : '—'
                                }
                                return (
                                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-4 py-3 text-gray-900 dark:text-gray-300 text-xs">{row.name}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.email}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.phone}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.company}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {parsedRows.length} registros encontrados
                        </p>
                      </div>

                      {/* Auto-create lists option */}
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-600" checked={autoCreateLists} onChange={e => setAutoCreateLists(e.target.checked)} />
                            <span>Criar listas de transmissão automaticamente (máx. 256 por lista)</span>
                          </label>

                          {autoCreateLists && (
                            <div className="w-full md:w-auto flex items-center gap-2">
                              <input value={autoListBaseName} onChange={e => setAutoListBaseName(e.target.value)} placeholder="Prefixo (ex: Lista)" className="w-full md:w-72 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" />
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">→ Lista #1, Lista #2...</span>
                            </div>
                          )}
                        </div>

                        {/* Mostrar listas que serão criadas */}
                        {autoCreateLists && (() => {
                          const validContacts = parsedRows.filter(r => mapping.name && r[mapping.name])
                          const numLists = Math.ceil(validContacts.length / 256)
                          const baseName = autoListBaseName || 'Lista'
                          
                          if (numLists === 0) return null
                          
                          return (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-base font-bold text-blue-900 dark:text-blue-100 mb-1">
                                    Listas de Transmissão
                                  </h4>
                                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                                    {numLists} lista(s) serão criadas com {validContacts.length} contato(s)
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
                                    {Array.from({ length: numLists }, (_, i) => {
                                      const listName = numLists > 1 ? `${baseName} #${i + 1}` : baseName
                                      const startIdx = i * 256
                                      const endIdx = Math.min(startIdx + 256, validContacts.length)
                                      const count = endIdx - startIdx
                                      
                                      return (
                                        <div key={i} className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg p-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">{listName}</span>
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">
                                              #{i + 1}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="font-medium">{count} contatos</span>
                                          </div>
                                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            Índices {startIdx + 1} - {endIdx}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {importing && (
                  <div className="px-6 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          Importando contatos...
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {importProgress} / {importTotal}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          {importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}% concluído
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-4 overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-end px-2"
                        style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                      >
                        <div className="h-full w-full bg-white/20 animate-pulse rounded-full"></div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 text-center">
                      Aguarde enquanto processamos os contatos...
                    </div>
                  </div>
                )}

                {/* Footer */}
                {parsedRows.length > 0 && (
                  <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button 
                      onClick={() => { setParsedRows([]); setFileColumns([]); setMapping({ name: null, email: null, phone: null, company: null, type: null }); }} 
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
                    >
                      Carregar Novo
                    </button>
                    <button 
                      onClick={async () => {
                        const contactsToImport = parsedRows.map(r => {
                          let phoneValue = mapping.phone ? r[mapping.phone] : undefined
                          
                          // Extrair e separar telefones por vírgula com código do país (55)
                          if (phoneValue) {
                            const telefones = extrairTelefones(phoneValue)
                            const numeros: string[] = []
                            
                            for (const valor of Object.values(telefones)) {
                              if (Array.isArray(valor)) {
                                valor.forEach(v => {
                                  const digitos = v.replace(/\D/g, '')
                                  const comCodigo = digitos.startsWith('55') ? digitos : `55${digitos}`
                                  numeros.push(comCodigo)
                                })
                              } else {
                                const digitos = valor.replace(/\D/g, '')
                                const comCodigo = digitos.startsWith('55') ? digitos : `55${digitos}`
                                numeros.push(comCodigo)
                              }
                            }
                            
                            phoneValue = numeros.join(', ')
                          }
                          
                          return {
                            name: mapping.name ? r[mapping.name] : undefined,
                            email: mapping.email ? r[mapping.email] : undefined,
                            phone: phoneValue,
                            company: mapping.company ? r[mapping.company] : undefined,
                            type: 'default'
                          }
                        }).filter(x => x.name)

                        setImporting(true)
                        setImportTotal(contactsToImport.length)
                        setImportProgress(0)

                        let imported = 0
                        let allListsCreated = []
                        
                        try {
                          // Primeiro: criar todas as listas se necessário
                          if (autoCreateLists) {
                            const numLists = Math.ceil(contactsToImport.length / 256)
                            const baseName = autoListBaseName || 'Lista'
                            
                            console.log(`[Import] Criando ${numLists} listas...`)
                            
                            for (let i = 0; i < numLists; i++) {
                              const index = i + 1
                              const name = (numLists > 1) ? `${baseName} #${index}` : baseName
                              const res = await fetch('/api/broadcast-lists', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name,
                                  description: `Importada em ${new Date().toLocaleString()}`,
                                  contacts: []
                                })
                              })
                              
                              if (res.ok) {
                                const list = await res.json()
                                allListsCreated.push(list)
                                console.log(`[Import] Lista criada: ${name} (${list.id})`)
                              } else {
                                console.error(`[Import] Erro ao criar lista ${name}`)
                              }
                            }
                            
                            console.log(`[Import] ${allListsCreated.length} listas criadas com sucesso`)
                          }

                          // Segundo: importar contatos em lotes
                          const batchSize = 100

                          console.log(`[Import] Total de contatos: ${contactsToImport.length}`)
                          console.log(`[Import] Listas disponíveis: ${allListsCreated.length}`)

                          for (let i = 0; i < contactsToImport.length; i += batchSize) {
                            const batch = contactsToImport.slice(i, i + batchSize)
                            
                            // Adicionar broadcast_id aos contatos do lote
                            const batchWithLists = batch.map((contact, idx) => {
                              const globalIdx = i + idx
                              let broadcastId = null
                              if (autoCreateLists && allListsCreated.length > 0) {
                                const listIndex = Math.floor(globalIdx / 256)
                                broadcastId = allListsCreated[listIndex]?.id || null
                              }
                              return { ...contact, broadcastId }
                            })
                            
                            console.log(`[Import] Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} contatos (${i} a ${i + batch.length - 1})`)
                            
                            const res = await fetch('/api/contacts/import', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ 
                                contacts: batchWithLists, 
                                createLists: false, // Listas já foram criadas
                                listBaseName: autoListBaseName || 'Lista'
                              }) 
                            })
                            
                            if (res.ok) {
                              const data = await res.json()
                              const batchCount = data.count || 0
                              imported += batchCount
                              setImportProgress(imported)
                              console.log(`[Import] Lote concluído: ${batchCount} importados, total acumulado: ${imported}`)
                            } else {
                              console.error(`[Import] Erro no lote: ${res.status} ${res.statusText}`)
                              const error = await res.text()
                              console.error(`[Import] Detalhes do erro: ${error}`)
                            }
                          }

                          console.log(`[Import] Importação finalizada: ${imported} contatos importados`)

                          // Refresh contacts and broadcast lists
                          await fetchContacts()
                          if (allListsCreated.length) {
                            await fetchBroadcastLists()
                          }

                          setImportOpen(false)
                          setParsedRows([])
                          setFileColumns([])
                          setMapping({ name: null, email: null, phone: null, company: null, type: null })
                          
                          if (allListsCreated.length) {
                            alert(`✅ ${imported} contato(s) importado(s) com sucesso!\n${allListsCreated.length} lista(s) de transmissão criada(s).`)
                          } else {
                            alert(`✅ ${imported} contato(s) importado(s) com sucesso!`)
                          }
                        } catch (error) {
                          console.error('Import error:', error)
                          alert('❌ Erro na importação')
                        } finally {
                          setImporting(false)
                          setImportProgress(0)
                          setImportTotal(0)
                        }
                      }} 
                      disabled={importing}
                      className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all font-medium text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {importing ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Importando...
                        </>
                      ) : (
                        `Importar ${parsedRows.length > 0 ? `(${parsedRows.length})` : ''}`
                      )}
                    </button>
                  </div>
                )}

                {parsedRows.length === 0 && (
                  <div className="p-6 text-center">
                    <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Selecione um arquivo para começar</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact modal */}
          {showModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/50" onClick={handleModalCancel} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{modalContact ? 'Editar Contato' : 'Novo Contato'}</h3>
                <form onSubmit={handleModalSave} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                    <input name="name" defaultValue={modalContact?.name || ''} placeholder="Nome completo" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input name="email" defaultValue={modalContact?.email || ''} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                    <input name="phone" defaultValue={modalContact?.phone || ''} placeholder="(11) 98765-4321" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
                    <input name="company" defaultValue={modalContact?.company || ''} placeholder="Nome da empresa" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={handleModalCancel} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm">
                      Cancelar
                    </button>
                    <button type="submit" className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg shadow-primary-500/30 text-sm">
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* New Broadcast List modal */}
          {showNewListModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewListModal(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nova Lista de Transmissão</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                    <input 
                      type="text"
                      value={newListName}
                      onChange={e => setNewListName(e.target.value)}
                      placeholder="Ex: Clientes Premium"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                    <textarea 
                      value={newListDesc}
                      onChange={e => setNewListDesc(e.target.value)}
                      placeholder="Descreva o propósito desta lista..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      onClick={() => setShowNewListModal(false)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={createBroadcastList}
                      className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg shadow-primary-500/30 text-sm"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>
      </div>
    </MainLayout>
  )
}
