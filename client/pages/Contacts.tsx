import { useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'

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
  const [editing, setEditing] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    const res = await fetch('/api/contacts')
    const data = await res.json()
    setContacts(data)
  }

  const save = async (e: any) => {
    e.preventDefault()
    const form = e.target
    const id = editing?.id
    const payload = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value,
      company: form.company.value,
      type: form.type.value,
    }

    if (id) {
      await fetch(`/api/contacts/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    } else {
      await fetch(`/api/contacts`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    }
    setShowForm(false)
    setEditing(null)
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

  return (
    <MainLayout>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contatos</h2>
            <div className="flex items-center gap-2">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg border">
                <option value="all">Todos</option>
                {Object.keys(grouped).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={() => { setEditing(null); setShowForm(true) }} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Novo</button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={save} className="grid grid-cols-2 gap-4 mb-6">
              <input name="name" defaultValue={editing?.name} placeholder="Nome" required className="px-3 py-2 rounded-lg border" />
              <input name="email" defaultValue={editing?.email} placeholder="Email" className="px-3 py-2 rounded-lg border" />
              <input name="phone" defaultValue={editing?.phone} placeholder="Telefone" className="px-3 py-2 rounded-lg border" />
              <input name="company" defaultValue={editing?.company} placeholder="Empresa" className="px-3 py-2 rounded-lg border" />
              <input name="type" defaultValue={editing?.type || 'default'} placeholder="Tipo" className="px-3 py-2 rounded-lg border" />
              <div className="col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }} className="px-3 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">Salvar</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(grouped).filter(([k]) => filterType === 'all' || k === filterType).map(([type, items]) => (
              <div key={type} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h3 className="font-semibold mb-3">{type} ({items.length})</h3>
                <div className="space-y-3">
                  {items.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <img src={c.avatar || '/default-avatar.png'} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-gray-500">{c.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) await uploadAvatar(c.id, e.target.files[0], c.type || 'default') }} />
                          Foto
                        </label>
                        <button onClick={() => { setEditing(c); setShowForm(true) }} className="px-3 py-2 rounded-lg">Editar</button>
                        <button onClick={() => remove(c.id)} className="px-3 py-2 rounded-lg text-red-600">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
    </MainLayout>
  )
}
