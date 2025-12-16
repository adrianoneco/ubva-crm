import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'
import * as Papa from 'papaparse'


interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  type?: string
  avatar?: string | null
}


export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filterType, setFilterType] = useState<string>('all')

  // Import modal state
  const [importOpen, setImportOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileColumns, setFileColumns] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({ name: null, email: null, phone: null, company: null, type: null })
  const [previewCount, setPreviewCount] = useState(5)

  // UI helpers
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'name'|'recent'>('name')

  // Modal for add/edit contact
  const [showModal, setShowModal] = useState(false)
  const [modalContact, setModalContact] = useState<Contact | null>(null)
  const [modalAvatarFile, setModalAvatarFile] = useState<File | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
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

  return (
    <MainLayout>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-3">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contatos</h2>
                <div className="text-sm text-gray-500 dark:text-gray-400">{contacts.length} contatos • {Object.keys(grouped).length} grupos</div>
              </div>
              <div className="flex-1 md:hidden">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, email, empresa..." className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, email, empresa..." className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm" />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value as any)} className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm">
                <option value="name">Ordenar: Nome</option>
                <option value="recent">Ordenar: Recentes</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700 text-sm">
                <option value="all">Todos</option>
                {Object.keys(grouped).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={openNewModal} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Novo</button>
              <button onClick={() => setImportOpen(true)} className="px-4 py-2 rounded-lg bg-emerald-500 text-white" title="Importar CSV / XLSX">Importar</button>
            </div>
          </div>



          <div className="grid grid-cols-1 gap-6">
            {Object.entries(grouped).filter(([k]) => filterType === 'all' || k === filterType).map(([type, items]) => {
              const visible = items
                .filter(c => {
                  const q = search.toLowerCase().trim()
                  if (!q) return true
                  return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q)
                })
                .sort((a, b) => {
                  if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
                  // recent: newer updatedAt first
                  const aDate = (a as any).updatedAt || (a as any).createdAt || ''
                  const bDate = (b as any).updatedAt || (b as any).createdAt || ''
                  return bDate.localeCompare(aDate)
                })

              return (
                <div key={type} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">{type} <span className="text-sm text-gray-500 dark:text-gray-400">({visible.length}/{items.length})</span></h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400">&nbsp;</div>
                  </div>

                  {visible.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Nenhum contato encontrado neste grupo.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visible.map(c => (
                        <div key={c.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border hover:shadow-md transition">
                          <div className="flex items-start gap-3">
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-semibold">{getInitials(c.name)}</div>
                            )}

                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{c.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{c.company}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.email}{c.phone ? ` • ${c.phone}` : ''}</div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <label className="cursor-pointer text-sm px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) await uploadAvatar(c.id, e.target.files[0], c.type || 'default') }} />
                                <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3m10 0h3a1 1 0 001-1V7M16 3H8v4h8V3z" /></svg>
                              </label>
                              <div className="flex gap-2">
                                <button onClick={() => openEditModal(c)} className="px-2 py-1 rounded-md text-sm bg-blue-50 text-blue-600 hover:bg-blue-100">Editar</button>
                                <button onClick={() => remove(c.id)} className="px-2 py-1 rounded-md text-sm text-red-600 hover:bg-red-50">Excluir</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Import modal */}
          {importOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
              <div className="absolute inset-0 bg-black/40" onClick={() => setImportOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-3xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">Importar contatos (CSV / XLSX)</h3>

                <div className="mb-4">
                  <input type="file" accept=".csv,.xls,.xlsx" onChange={async (e) => {
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
                  }} />
                </div>

                {parsedRows.length > 0 && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium mb-2">Mapeamento de colunas</h4>
                        <div className="space-y-2">
                          {['name','email','phone','company','type'].map(field => (
                            <div key={field} className="flex items-center gap-2">
                              <div className="w-24 font-medium text-gray-700 dark:text-gray-300">{field}</div>
                              <select value={mapping[field] || ''} onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))} className="px-3 py-2 rounded-lg border">
                                <option value="">— nenhum —</option>
                                {fileColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Preview (primeiras {previewCount})</h4>
                          <select value={previewCount} onChange={e => setPreviewCount(Number(e.target.value))} className="px-2 py-1 rounded-lg border text-sm">
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                          </select>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <table className="w-full table-auto">
                            <thead>
                              <tr>
                                <th className="text-left">Nome</th>
                                <th className="text-left">Email</th>
                                <th className="text-left">Telefone</th>
                                <th className="text-left">Empresa</th>
                                <th className="text-left">Tipo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsedRows.slice(0, previewCount).map((r, idx) => {
                                const row = {
                                  name: mapping.name ? r[mapping.name] : '',
                                  email: mapping.email ? r[mapping.email] : '',
                                  phone: mapping.phone ? r[mapping.phone] : '',
                                  company: mapping.company ? r[mapping.company] : '',
                                  type: mapping.type ? r[mapping.type] : ''
                                }
                                return (
                                  <tr key={idx} className="odd:bg-gray-50 dark:odd:bg-gray-900">
                                    <td className="py-1 pr-3">{row.name}</td>
                                    <td className="py-1 pr-3">{row.email}</td>
                                    <td className="py-1 pr-3">{row.phone}</td>
                                    <td className="py-1 pr-3">{row.company}</td>
                                    <td className="py-1 pr-3">{row.type}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setParsedRows([]); setFileColumns([]); setMapping({ name: null, email: null, phone: null, company: null, type: null }); setImportOpen(false) }} className="px-3 py-2 rounded-lg">Cancelar</button>
                      <button onClick={async () => {
                        // perform import
                        const contactsToImport = parsedRows.map(r => ({
                          name: mapping.name ? r[mapping.name] : undefined,
                          email: mapping.email ? r[mapping.email] : undefined,
                          phone: mapping.phone ? r[mapping.phone] : undefined,
                          company: mapping.company ? r[mapping.company] : undefined,
                          type: mapping.type ? r[mapping.type] : 'default'
                        })).filter(x => x.name)

                        const res = await fetch('/api/contacts/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: contactsToImport }) })
                        if (res.ok) {
                          fetchContacts()
                          setImportOpen(false)
                          setParsedRows([])
                          setFileColumns([])
                          setMapping({ name: null, email: null, phone: null, company: null, type: null })
                          alert('Importação concluída')
                        } else {
                          const err = await res.json()
                          alert('Import failed: ' + (err.error || res.statusText))
                        }
                      }} className="px-4 py-2 rounded-lg bg-emerald-500 text-white">Importar</button>
                    </div>
                  </div>
                )}

                {parsedRows.length === 0 && (
                  <div className="text-sm text-gray-500">Carregue um arquivo CSV ou XLSX para começar. O parser detectará os cabeçalhos automaticamente.</div>
                )}
              </div>
            </div>
          )}

          {/* Contact modal */}
          {showModal && (
            <div className="fixed inset-0 z-60 flex items-start justify-center p-6">
              <div className="absolute inset-0 bg-black/40" onClick={handleModalCancel} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-4">{modalContact ? 'Editar contato' : 'Novo contato'}</h3>
                <form onSubmit={handleModalSave} className="space-y-3">
                  <input name="name" defaultValue={modalContact?.name || ''} placeholder="Nome" required className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" />
                  <input name="email" defaultValue={modalContact?.email || ''} placeholder="Email" className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" />
                  <input name="phone" defaultValue={modalContact?.phone || ''} placeholder="Telefone" className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" />
                  <input name="company" defaultValue={modalContact?.company || ''} placeholder="Empresa" className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" />
                  <input name="type" defaultValue={modalContact?.type || 'default'} placeholder="Tipo" className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avatar (opcional)</label>
                    <input type="file" accept="image/*" onChange={e => setModalAvatarFile(e.target.files?.[0] || null)} />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleModalCancel} className="px-3 py-2 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Salvar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
    </MainLayout>
  )
}
