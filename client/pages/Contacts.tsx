import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'
import * as Papa from 'papaparse'
import { extrairTelefones, formatarTelefonesParaPreview } from '../utils/phoneExtractor'


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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filterType, setFilterType] = useState<string>('all')

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

  // Modal for add/edit contact
  const [showModal, setShowModal] = useState(false)
  const [modalContact, setModalContact] = useState<Contact | null>(null)
  const [modalAvatarFile, setModalAvatarFile] = useState<File | null>(null)
  const [triggerInstallBot, setTriggerInstallBot] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
    return data
  }

  const openNewModal = () => { setModalContact(null); setModalAvatarFile(null); setTriggerInstallBot(false); setShowModal(true) }
  const openEditModal = (c: Contact) => { setModalContact(c); setModalAvatarFile(null); setTriggerInstallBot(false); setShowModal(true) }

  const handleModalCancel = () => { setShowModal(false); setModalContact(null); setModalAvatarFile(null); setTriggerInstallBot(false) }

  const handleModalSave = async (e: any) => {
    e.preventDefault()
    const form = e.target
    const payload = {
      name: form.name.value,
      email: form.email.value || null,
      phone: form.phone.value || null,
      company: form.company.value || null,
      type: form.type.value || 'default',
      triggerInstallBot: triggerInstallBot,
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
    setTriggerInstallBot(false)
    fetchContacts()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir contato?')) return
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
    if (!searchQuery) return true
    return (c.name || '').toLowerCase().includes(searchQuery) || (c.email || '').toLowerCase().includes(searchQuery) || (c.company || '').toLowerCase().includes(searchQuery) || (c.phone || '').includes(searchQuery)
  }

  const visibleCount = Object.entries(grouped).filter(([k]) => filterType === 'all' || k === filterType).reduce((acc, [, items]) => acc + items.filter(isContactVisible).length, 0)

  return (
    <MainLayout>
      <div className="min-h-screen h-screen">
        {/* Header */}
        <div className="flex items-center justify-between h-20">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contatos</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{contacts.length} contatos</p>
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
                const contactsWithPhone = contacts.filter(c => c.phone && c.phone.trim().length > 0)
                if (contactsWithPhone.length === 0) {
                  alert('Nenhum contato com telefone encontrado')
                  return
                }
                const headers = ['nome', 'email', 'telefone', 'empresa']
                const rows = contactsWithPhone.map(c => [c.name, c.email || '', c.phone || '', c.company || ''])
                const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `contatos_${new Date().toISOString().split('T')[0]}.csv`
                link.click()
                alert(`✅ ${contactsWithPhone.length} contato(s) exportados!`)
              }}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar
            </button>
            <button onClick={() => setImportOpen(true)} className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-lg shadow-emerald-500/30 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Buscar por nome, email, telefone ou empresa..." 
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
            </div>
          </div>

          {/* Contacts Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-h-[calc(100vh-14rem)] overflow-y-auto">
            {visibleCount === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Nenhum contato encontrado.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Crie um novo contato ou importe um arquivo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contacts
                  .filter(c => isContactVisible(c))
                  .sort((a, b) => {
                    if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
                    const aDate = (a as any).updatedAt || (a as any).createdAt || ''
                    const bDate = (b as any).updatedAt || (b as any).createdAt || ''
                    return bDate.localeCompare(aDate)
                  })
                  .map(c => (
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
        </div>

        {/* Import modal */}
        {importOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setImportOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
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

                {parsedRows.length > 0 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Mapeamento de Colunas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['name','email','phone','company'].map(field => (
                          <div key={field}>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">{field}</label>
                            <select 
                              value={mapping[field] || ''} 
                              onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))} 
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                            >
                              <option value="">Nenhum</option>
                              {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Preview ({parsedRows.length} registros)</h4>
                      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Nome</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Email</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Telefone</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Empresa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedRows.slice(0, 5).map((r, idx) => (
                              <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-300 text-xs">{mapping.name ? r[mapping.name] : '—'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{mapping.email ? r[mapping.email] : '—'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{mapping.phone ? r[mapping.phone] : '—'}</td>
                                <td className="px-4 py-2 text-gray-600 dark:text-gray-400 text-xs">{mapping.company ? r[mapping.company] : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {importing && (
                <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Importando...</span>
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">{importProgress} / {importTotal}</span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button 
                    onClick={() => { setParsedRows([]); setFileColumns([]); setMapping({ name: null, email: null, phone: null, company: null, type: null }); }} 
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Novo Arquivo
                  </button>
                  <button 
                    onClick={async () => {
                      const contactsToImport = parsedRows.map(r => ({
                        name: mapping.name ? r[mapping.name] : undefined,
                        email: mapping.email ? r[mapping.email] : undefined,
                        phone: mapping.phone ? r[mapping.phone] : undefined,
                        company: mapping.company ? r[mapping.company] : undefined,
                        type: 'default'
                      })).filter(x => x.name)

                      setImporting(true)
                      setImportTotal(contactsToImport.length)
                      setImportProgress(0)

                      let imported = 0
                      try {
                        const batchSize = 100
                        for (let i = 0; i < contactsToImport.length; i += batchSize) {
                          const batch = contactsToImport.slice(i, i + batchSize)
                          const res = await fetch('/api/contacts/import', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ contacts: batch }) 
                          })
                          if (res.ok) {
                            const data = await res.json()
                            imported += data.count || 0
                            setImportProgress(imported)
                          }
                        }
                        await fetchContacts()
                        setImportOpen(false)
                        setParsedRows([])
                        setFileColumns([])
                        setMapping({ name: null, email: null, phone: null, company: null, type: null })
                        alert(`✅ ${imported} contato(s) importado(s)!`)
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
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {importing ? 'Importando...' : `Importar (${parsedRows.length})`}
                  </button>
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
                  <input name="name" defaultValue={modalContact?.name || ''} placeholder="Nome completo" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input name="email" defaultValue={modalContact?.email || ''} placeholder="email@example.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                  <input name="phone" defaultValue={modalContact?.phone || ''} placeholder="(11) 98765-4321" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
                  <input name="company" defaultValue={modalContact?.company || ''} placeholder="Nome da empresa" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                {!modalContact && (
                  <div className="flex items-center gap-2 pt-2 pb-1">
                    <input 
                      type="checkbox" 
                      id="triggerInstallBot" 
                      checked={triggerInstallBot}
                      onChange={(e) => setTriggerInstallBot(e.target.checked)}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="triggerInstallBot" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Acionar bot de instalação do APP
                    </label>
                  </div>
                )}
                <input type="hidden" name="type" value="default" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={handleModalCancel} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm">Cancelar</button>
                  <button type="submit" className="px-5 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 text-sm">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
