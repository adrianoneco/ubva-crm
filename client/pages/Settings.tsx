import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '../config'
import ToggleSwitch from '../components/ToggleSwitch'

type SettingsPage = 'geral' | 'kanban' | 'webhooks' | 'usuarios' | 'grupos' | 'api' | 'whatsapp'

interface WebhookEvent {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface WebhookConfig {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  enabled: boolean
}

interface User {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  phoneCountry?: string
  avatar?: string
  createdAt: string
}

interface Group {
  id: string
  name: string
  description?: string
  createdAt: string
  permissions?: Permission[]
}

interface Permission {
  id: string
  key: string
  name: string
  category: string
  enabled?: boolean
}

export default function Settings() {
  const navigate = useNavigate()
  const { page } = useParams<{ page?: SettingsPage }>()
  const activeTab = (page || 'geral') as SettingsPage

  // ==================== GERAL ====================
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [companyName, setCompanyName] = useState('UBVA CRM')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // ==================== KANBAN ====================
  const [days, setDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('18:00')
  const [intervalMinutes, setIntervalMinutes] = useState(60)
  const [autoMoveOnSchedule, setAutoMoveOnSchedule] = useState(true)
  const [defaultMeetingDuration, setDefaultMeetingDuration] = useState(30)

  // ==================== WEBHOOKS ====================
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
  const [webhookForm, setWebhookForm] = useState<WebhookConfig>({
    id: '',
    name: '',
    url: '',
    secret: '',
    events: [],
    enabled: true
  })

  const availableEvents: WebhookEvent[] = [
    { id: 'lead.created', name: 'Lead Criado', description: 'Disparado quando um novo lead é adicionado', enabled: false },
    { id: 'lead.updated', name: 'Lead Atualizado', description: 'Disparado quando dados de um lead são modificados', enabled: false },
    { id: 'lead.deleted', name: 'Lead Removido', description: 'Disparado quando um lead é excluído', enabled: false },
    { id: 'kanban.position_changed', name: 'Posição no Kanban', description: 'Disparado quando um lead muda de etapa', enabled: false },
    { id: 'appointment.created', name: 'Agendamento Criado', description: 'Disparado quando uma reunião é agendada', enabled: false },
    { id: 'appointment.updated', name: 'Agendamento Atualizado', description: 'Disparado quando uma reunião é reagendada', enabled: false },
    { id: 'appointment.canceled', name: 'Agendamento Cancelado', description: 'Disparado quando uma reunião é cancelada', enabled: false },
    { id: 'contact.created', name: 'Contato Criado', description: 'Disparado quando um novo contato é adicionado', enabled: false },
    { id: 'broadcast.sent', name: 'Broadcast Enviado', description: 'Disparado quando uma mensagem em massa é enviada', enabled: false },
  ]

  // ==================== API ====================
  const [apiKey, setApiKey] = useState('')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  // ==================== USUARIOS ====================
  const [usersList, setUsersList] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    phoneCountry: 'BR',
    avatar: ''
  })
  const [userFormError, setUserFormError] = useState('')
  const [fetchWhatsAppProfile, setFetchWhatsAppProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [_previewAvatar, setPreviewAvatar] = useState<string | null>(null)

  // ==================== GRUPOS ====================
  const [groupsList, setGroupsList] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: ''
  })
  const [groupFormError, setGroupFormError] = useState('')
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({})
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  // ==================== WHATSAPP ====================
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState('')
  const [waSuccess, setWaSuccess] = useState('')
  const [waProfile, setWaProfile] = useState({
    name: '',
    status: '',
    photo: '',
    business: {
      description: '',
      email: '',
      websites: [] as string[],
      address: '',
      vertical: ''
    }
  })
  const [waBusinessHours, setWaBusinessHours] = useState<Record<string, { open: string, close: string } | null>>({
    monday: { open: '08:00', close: '18:00' },
    tuesday: { open: '08:00', close: '18:00' },
    wednesday: { open: '08:00', close: '18:00' },
    thursday: { open: '08:00', close: '18:00' },
    friday: { open: '08:00', close: '18:00' },
    saturday: null,
    sunday: null
  })
  const [waGreetingMessage, setWaGreetingMessage] = useState({ message: '', enabled: false })
  const [waAwayMessage, setWaAwayMessage] = useState({ message: '', enabled: false, schedule: { startTime: '18:00', endTime: '08:00' } })
  const [waPrivacy, setWaPrivacy] = useState({
    profilePhoto: 'all' as 'all' | 'contacts' | 'nobody',
    status: 'all' as 'all' | 'contacts' | 'nobody',
    lastSeen: 'all' as 'all' | 'contacts' | 'nobody',
    readReceipts: true,
    groupAdd: 'all' as 'all' | 'contacts' | 'nobody'
  })
  const [waPhotoFile, setWaPhotoFile] = useState<File | null>(null)
  const [waPhotoPreview, setWaPhotoPreview] = useState<string | null>(null)

  const [savedOk, setSavedOk] = useState(false)
  const [copySuccess, setCopySuccess] = useState('')

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem('ubva_settings')
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    
    // Set theme from localStorage first (don't change DOM, MainLayout handles that)
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.theme) setTheme(parsed.theme)
    }
    
    if (saved) {
      const parsed = JSON.parse(saved)
      setTimezone(parsed.timezone || timezone)
      // Theme already set above
      setCompanyName(parsed.companyName || companyName)
      setNotificationsEnabled(parsed.notificationsEnabled ?? true)
      setDays(parsed.days || days)
      setStartTime(parsed.startTime || startTime)
      setEndTime(parsed.endTime || endTime)
      setIntervalMinutes(parsed.intervalMinutes || intervalMinutes)
      setAutoMoveOnSchedule(parsed.autoMoveOnSchedule ?? true)
      setDefaultMeetingDuration(parsed.defaultMeetingDuration || 30)
      setWebhooks(parsed.webhooks || [])
      setApiKey(parsed.apiKey || generateApiKey())
    } else {
      setApiKey(generateApiKey())
    }

    // Load permissions on mount
    fetchPermissions()
  }, [])

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'ubva_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const generateWebhookId = () => {
    return 'wh_' + Math.random().toString(36).substr(2, 9)
  }

  const toggleDay = (d: string) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const openWebhookModal = (webhook?: WebhookConfig) => {
    if (webhook) {
      setEditingWebhook(webhook)
      setWebhookForm({ ...webhook })
    } else {
      setEditingWebhook(null)
      setWebhookForm({
        id: generateWebhookId(),
        name: '',
        url: '',
        secret: '',
        events: [],
        enabled: true
      })
    }
    setWebhookModalOpen(true)
  }

  const saveWebhook = async () => {
    if (!webhookForm.name || !webhookForm.url) return
    
    try {
      if (editingWebhook) {
        // Update existing webhook
        const res = await fetch(`${API_URL}/api/webhooks-config/${editingWebhook.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: webhookForm.name,
            url: webhookForm.url,
            events: webhookForm.events,
            active: webhookForm.enabled
          })
        })
        if (res.ok) {
          await fetchWebhooks()
        }
      } else {
        // Create new webhook
        const res = await fetch(`${API_URL}/api/webhooks-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: webhookForm.name,
            url: webhookForm.url,
            events: webhookForm.events,
            active: webhookForm.enabled
          })
        })
        if (res.ok) {
          await fetchWebhooks()
        }
      }
    } catch (error) {
      console.error('Failed to save webhook:', error)
    }
    setWebhookModalOpen(false)
  }

  const deleteWebhook = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este webhook?')) {
      try {
        const res = await fetch(`${API_URL}/api/webhooks-config/${id}`, { method: 'DELETE' })
        if (res.ok) {
          await fetchWebhooks()
        }
      } catch (error) {
        console.error('Failed to delete webhook:', error)
      }
    }
  }

  const toggleWebhookEnabled = async (id: string) => {
    const webhook = webhooks.find(w => w.id === id)
    if (!webhook) return
    
    try {
      const res = await fetch(`${API_URL}/api/webhooks-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !webhook.enabled })
      })
      if (res.ok) {
        await fetchWebhooks()
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error)
    }
  }

  const toggleFormEvent = (eventId: string) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }))
  }

  // ==================== USER MANAGEMENT ====================
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/users`)
      const data = await res.json()
      setUsersList(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'usuarios') {
      fetchUsers()
    } else if (activeTab === 'grupos') {
      fetchGroups()
      fetchPermissions()
    } else if (activeTab === 'webhooks') {
      fetchWebhooks()
    }
  }, [activeTab])

  // ==================== WEBHOOK API FUNCTIONS ====================
  const fetchWebhooks = async () => {
    setWebhooksLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/webhooks-config`)
      const data = await res.json()
      // Map API response to WebhookConfig format
      setWebhooks(data.map((w: any) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        secret: w.secret || '',
        events: w.events || [],
        enabled: w.active !== false
      })))
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setWebhooksLoading(false)
    }
  }

  const openUserModal = (user?: User) => {
    setUserFormError('')
    if (user) {
      setEditingUser(user)
      setUserForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        phone: (user as any).phone || '',
        phoneCountry: (user as any).phoneCountry || 'BR',
        avatar: (user as any).avatar || ''
      })
    } else {
      setEditingUser(null)
      setUserForm({
        name: '',
        email: '',
        password: '',
        role: 'user',
        phone: '',
        phoneCountry: 'BR',
        avatar: ''
      })
    }
    setUserModalOpen(true)
  }

  const saveUser = async () => {
    setUserFormError('')
    
    if (!userForm.name || !userForm.email) {
      setUserFormError('Nome e email são obrigatórios')
      return
    }
    
    if (!editingUser && !userForm.password) {
      setUserFormError('Senha é obrigatória para novos usuários')
      return
    }

    try {
      let avatarUrl = userForm.avatar || null
      
      // Fetch WhatsApp profile picture if enabled
      if (fetchWhatsAppProfile && userForm.phone) {
        setLoadingProfile(true)
        try {
          const phoneDigits = userForm.phone.replace(/\D/g, '')
          const countryCode = userForm.phoneCountry === 'BR' ? '55' : 
                             userForm.phoneCountry === 'US' ? '1' :
                             userForm.phoneCountry === 'AR' ? '54' :
                             userForm.phoneCountry === 'MX' ? '52' : '55'
          const fullPhone = `${countryCode}${phoneDigits}`
          
          const profileRes = await fetch(`${API_URL}/api/contacts/whatsapp-profile?phone=${fullPhone}`)
          if (profileRes.ok) {
            const profileData = await profileRes.json()
            if (profileData.imageUrl) {
              avatarUrl = profileData.imageUrl
              setPreviewAvatar(profileData.imageUrl)
            }
          }
        } catch (profileError) {
          console.error('Failed to fetch WhatsApp profile:', profileError)
        } finally {
          setLoadingProfile(false)
        }
      }

      if (editingUser) {
        const updateData: any = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          phone: userForm.phone || null,
          phoneCountry: userForm.phoneCountry || 'BR',
          avatar: avatarUrl
        }
        if (userForm.password) {
          updateData.password = userForm.password
        }
        
        const res = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (!res.ok) throw new Error('Failed to update user')
      } else {
        const res = await fetch(`${API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            phone: userForm.phone || null,
            phoneCountry: userForm.phoneCountry || 'BR',
            avatar: avatarUrl
          })
        })
        
        if (!res.ok) throw new Error('Failed to create user')
      }
      
      setUserModalOpen(false)
      setFetchWhatsAppProfile(false)
      setPreviewAvatar(null)
      fetchUsers()
    } catch (error) {
      setUserFormError('Erro ao salvar usuário. Verifique se o email já está em uso.')
    }
  }

  const deleteUserHandler = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Failed to delete user')
      
      fetchUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  // ==================== GROUP MANAGEMENT ====================
  const fetchGroups = async () => {
    setGroupsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/permissions/groups`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setGroupsList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      setGroupsList([])
    } finally {
      setGroupsLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/permissions/permissions`)
      const data = await res.json()
      setAllPermissions(data)
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  const openGroupModal = async (group?: Group) => {
    setGroupFormError('')
    
    // Ensure permissions are loaded
    if (Object.keys(allPermissions).length === 0) {
      await fetchPermissions()
    }
    
    if (group) {
      setEditingGroup(group)
      setGroupForm({
        name: group.name,
        description: group.description || ''
      })
      
      // Fetch the group with its permissions
      try {
        const res = await fetch(`${API_URL}/api/permissions/groups/${group.id}`)
        if (res.ok) {
          const groupWithPerms = await res.json()
          setSelectedPermissions(groupWithPerms.permissions?.filter((p: any) => p.enabled).map((p: any) => p.id) || [])
        }
      } catch (error) {
        console.error('Failed to fetch group permissions:', error)
      }
    } else {
      setEditingGroup(null)
      setGroupForm({
        name: '',
        description: ''
      })
      setSelectedPermissions([])
    }
    setGroupModalOpen(true)
  }

  const saveGroup = async () => {
    setGroupFormError('')
    
    if (!groupForm.name) {
      setGroupFormError('Nome é obrigatório')
      return
    }

    try {
      let groupId = editingGroup?.id
      
      if (editingGroup) {
        const res = await fetch(`${API_URL}/api/permissions/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupForm.name,
            description: groupForm.description
          })
        })
        
        if (!res.ok) {
          throw new Error('Failed to update group')
        }
      } else {
        const res = await fetch(`${API_URL}/api/permissions/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupForm.name,
            description: groupForm.description
          })
        })
        
        if (!res.ok) {
          throw new Error('Failed to create group')
        }

        const newGroup = await res.json()
        groupId = newGroup.id
      }

      // Save permissions for group
      const permRes = await fetch(`${API_URL}/api/permissions/groups/${groupId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: selectedPermissions })
      })

      if (!permRes.ok) {
        throw new Error('Failed to save group permissions')
      }
      
      setGroupModalOpen(false)
      fetchGroups()
    } catch (error) {
      console.error('Error saving group:', error)
      setGroupFormError(error instanceof Error ? error.message : 'Erro ao salvar grupo')
    }
  }

  const deleteGroupHandler = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return
    
    try {
      const res = await fetch(`${API_URL}/api/permissions/groups/${id}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Failed to delete group')
      
      fetchGroups()
    } catch (error) {
      console.error('Failed to delete group:', error)
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'manager': return 'Gerente'
      case 'user': return 'Usuário'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'manager': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const applyTheme = (t: string) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else if (t === 'light') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.removeItem('theme')
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const save = () => {
    localStorage.setItem('ubva_settings', JSON.stringify({
      timezone,
      theme,
      companyName,
      notificationsEnabled,
      days,
      startTime,
      endTime,
      intervalMinutes,
      autoMoveOnSchedule,
      defaultMeetingDuration,
      webhooks,
      apiKey,
    }))
    applyTheme(theme)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2000)
  }

  const regenerateApiKey = () => {
    if (confirm('Tem certeza? A chave atual será invalidada.')) {
      setApiKey(generateApiKey())
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopySuccess(label)
    setTimeout(() => setCopySuccess(''), 2000)
  }

  const sidebarItems = [
    { id: 'geral' as SettingsPage, name: 'Geral', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'whatsapp' as SettingsPage, name: 'WhatsApp', icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' },
    { id: 'kanban' as SettingsPage, name: 'Kanban', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { id: 'webhooks' as SettingsPage, name: 'Webhooks', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { id: 'usuarios' as SettingsPage, name: 'Usuários', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'grupos' as SettingsPage, name: 'Grupos', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { id: 'api' as SettingsPage, name: 'API', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  ]

  return (
    <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 px-2">Configurações</h2>
            <nav className="space-y-1">
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/settings/${item.id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    activeTab === item.id
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="font-medium">{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {sidebarItems.find(i => i.id === activeTab)?.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {activeTab === 'geral' && 'Configurações gerais do sistema'}
                {activeTab === 'whatsapp' && 'Configure perfil, mensagens e privacidade do WhatsApp Business'}
                {activeTab === 'kanban' && 'Configure agendamentos e fluxo do Kanban'}
                {activeTab === 'webhooks' && 'Gerencie integrações via webhooks'}
                {activeTab === 'usuarios' && 'Gerencie usuários e permissões de acesso'}
                {activeTab === 'grupos' && 'Configure grupos de permissões e controle de acesso granular'}
                {activeTab === 'api' && 'Controle de acesso à API do CRM'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {savedOk && (
                <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvo!
                </span>
              )}
              <button
                onClick={save}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30"
              >
                Salvar Alterações
              </button>
            </div>
          </div>

          {/* ==================== TAB: GERAL ==================== */}
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome da Empresa</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fuso Horário</label>
                    <input
                      type="text"
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      placeholder="America/Sao_Paulo"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aparência</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'system', name: 'Sistema', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                      { id: 'light', name: 'Claro', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z' },
                      { id: 'dark', name: 'Escuro', icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                          theme === t.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
                        </svg>
                        <span className="font-medium">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notificações</h3>
                <ToggleSwitch
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                  label="Habilitar notificações do sistema"
                  description="Receba notificações importantes do sistema"
                />
              </div>
            </div>
          )}

          {/* ==================== TAB: KANBAN ==================== */}
          {activeTab === 'kanban' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurar Agendamentos</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Dias Disponíveis</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'Mon', name: 'Seg' },
                      { id: 'Tue', name: 'Ter' },
                      { id: 'Wed', name: 'Qua' },
                      { id: 'Thu', name: 'Qui' },
                      { id: 'Fri', name: 'Sex' },
                      { id: 'Sat', name: 'Sáb' },
                      { id: 'Sun', name: 'Dom' },
                    ].map(d => (
                      <button
                        key={d.id}
                        onClick={() => toggleDay(d.id)}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${
                          days.includes(d.id)
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Horário de Início</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Horário de Término</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Intervalo (minutos)</label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={intervalMinutes}
                      onChange={e => setIntervalMinutes(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comportamento do Kanban</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duração Padrão da Reunião</label>
                    <select
                      value={defaultMeetingDuration}
                      onChange={e => setDefaultMeetingDuration(Number(e.target.value))}
                      className="w-full md:w-64 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={90}>1h 30min</option>
                      <option value={120}>2 horas</option>
                    </select>
                  </div>

                  <ToggleSwitch
                    checked={autoMoveOnSchedule}
                    onChange={setAutoMoveOnSchedule}
                    label="Mover lead automaticamente ao agendar"
                    description="Move o lead para a próxima etapa quando uma reunião é agendada"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: WEBHOOKS ==================== */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Webhooks Configurados</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie integrações com sistemas externos</p>
                  </div>
                  <button
                    onClick={() => openWebhookModal()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Webhook
                  </button>
                </div>
                
                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum webhook configurado</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Clique em "Novo Webhook" para adicionar uma integração</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map(webhook => (
                      <div
                        key={webhook.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          webhook.enabled
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              webhook.enabled ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                            }`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{webhook.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate max-w-md">{webhook.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              webhook.enabled
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {webhook.events.length} eventos
                            </span>
                            <button
                              onClick={() => toggleWebhookEnabled(webhook.id)}
                              className={`p-2 rounded-lg transition-all ${
                                webhook.enabled
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
                                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-300'
                              }`}
                              title={webhook.enabled ? 'Desativar' : 'Ativar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {webhook.enabled ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </button>
                            <button
                              onClick={() => openWebhookModal(webhook)}
                              className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteWebhook(webhook.id)}
                              className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                              title="Excluir"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Autenticação Z-API</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Os headers <code className="bg-yellow-100 dark:bg-yellow-800/50 px-1 rounded text-yellow-800 dark:text-yellow-200">X-ZAPI-INSTANCE-ID</code>, <code className="bg-yellow-100 dark:bg-yellow-800/50 px-1 rounded text-yellow-800 dark:text-yellow-200">X-ZAPI-INSTANCE-TOKEN</code> e <code className="bg-yellow-100 dark:bg-yellow-800/50 px-1 rounded text-yellow-800 dark:text-yellow-200">X-ZAPI-INSTANCE-SECRET</code> serão enviados automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: USUARIOS ==================== */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Usuários do Sistema</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie os usuários e suas permissões de acesso</p>
                  </div>
                  <button
                    onClick={() => openUserModal()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Usuário
                  </button>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum usuário cadastrado</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Clique em "Novo Usuário" para adicionar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Permissão</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Criado em</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {usersList.map(user => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">
                              {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openUserModal(user)}
                                  className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                                  title="Editar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteUserHandler(user.id)}
                                  className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                                  title="Excluir"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Permissions Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Níveis de Permissão</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-red-700 dark:text-red-400">Administrador</span>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-300">Acesso total ao sistema, pode gerenciar usuários, configurações e todos os dados.</p>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-purple-700 dark:text-purple-400">Gerente</span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-300">Pode gerenciar leads, agendamentos e contatos. Não tem acesso às configurações do sistema.</p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">Usuário</span>
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Acesso básico para visualizar e gerenciar seus próprios leads e agendamentos.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Modal */}
          {userModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setUserModalOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                  <button
                    onClick={() => setUserModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {userFormError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      {userFormError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                    <input
                      type="text"
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="Nome do usuário"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Senha {editingUser && <span className="text-gray-400 font-normal">(deixe vazio para manter)</span>}
                    </label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={editingUser ? '••••••••' : 'Senha'}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissão</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">Usuário</option>
                      <option value="manager">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">País</label>
                      <select
                        value={userForm.phoneCountry}
                        onChange={e => setUserForm({ ...userForm, phoneCountry: e.target.value })}
                        className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="BR">🇧🇷 BR</option>
                        <option value="US">🇺🇸 US</option>
                        <option value="AR">🇦🇷 AR</option>
                        <option value="MX">🇲🇽 MX</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telefone</label>
                      <input
                        type="tel"
                        value={userForm.phone}
                        onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <input
                      id="fetchWhatsAppProfile"
                      type="checkbox"
                      checked={fetchWhatsAppProfile}
                      onChange={(e) => setFetchWhatsAppProfile(e.target.checked)}
                      className="w-4 h-4 text-blue-500 rounded cursor-pointer"
                    />
                    <label htmlFor="fetchWhatsAppProfile" className="flex-1 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <span>Buscar foto de perfil do WhatsApp</span>
                        {loadingProfile && <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Será usado automaticamente ao salvar</p>
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setUserModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveUser}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30"
                  >
                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Group Modal */}
          {groupModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGroupModalOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                  </h3>
                  <button
                    onClick={() => setGroupModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {groupFormError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                      {groupFormError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                    <input
                      type="text"
                      value={groupForm.name}
                      onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                      placeholder="ex: Vendedores, Gerentes, Suporte"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
                    <textarea
                      value={groupForm.description}
                      onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                      placeholder="Descrição do grupo (opcional)"
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissões</label>
                    <div className="space-y-3">
                      {Object.keys(allPermissions).length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm">Carregando permissões...</p>
                        </div>
                      ) : (
                        Object.entries(allPermissions).map(([category, perms]) => (
                          <div key={category} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-600">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wider opacity-75">{category}</h4>
                            <div className="space-y-2">
                              {perms.map((perm: Permission) => (
                                <div key={perm.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-600/30 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600/50 transition-all">
                                  <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    {perm.name}
                                  </label>
                                  <ToggleSwitch
                                    checked={selectedPermissions.includes(perm.id)}
                                    onChange={() => togglePermission(perm.id)}
                                    size="sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setGroupModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveGroup}
                    disabled={!groupForm.name}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 dark:disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
                  >
                    {editingGroup ? 'Salvar Alterações' : 'Criar Grupo'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhook Modal */}
          {webhookModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setWebhookModalOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
                  </h3>
                  <button
                    onClick={() => setWebhookModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Webhook</label>
                    <input
                      type="text"
                      value={webhookForm.name}
                      onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                      placeholder="Ex: Integração N8N"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL do Webhook</label>
                    <input
                      type="url"
                      value={webhookForm.url}
                      onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                      placeholder="https://seu-servidor.com/webhook"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secret (opcional)</label>
                    <input
                      type="text"
                      value={webhookForm.secret}
                      onChange={e => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                      placeholder="Chave secreta para HMAC-SHA256"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Eventos</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {availableEvents.map(event => (
                        <label
                          key={event.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            webhookForm.events.includes(event.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={webhookForm.events.includes(event.id)}
                            onChange={() => toggleFormEvent(event.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            webhookForm.events.includes(event.id)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            {webhookForm.events.includes(event.id) && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{event.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{event.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
                  <button
                    onClick={() => setWebhookModalOpen(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveWebhook}
                    disabled={!webhookForm.name || !webhookForm.url}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 dark:disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:shadow-none"
                  >
                    {editingWebhook ? 'Salvar Alterações' : 'Criar Webhook'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: GRUPOS ==================== */}
          {activeTab === 'grupos' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Grupos de Permissões</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organize e controle as permissões por grupo</p>
                  </div>
                  <button
                    onClick={() => openGroupModal()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo Grupo
                  </button>
                </div>

                {groupsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : groupsList.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum grupo cadastrado</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Clique em "Novo Grupo" para adicionar</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {groupsList.map(group => (
                      <div key={group.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{group.name}</h4>
                            {group.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{group.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openGroupModal(group)}
                              className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteGroupHandler(group.id)}
                              className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                              title="Excluir"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {group.permissions?.filter(p => p.enabled).length || 0} permissões
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: API ==================== */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Chave de API</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sua API Key</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={apiKeyVisible ? 'text' : 'password'}
                          value={apiKey}
                          readOnly
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        <button
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {apiKeyVisible ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => copyToClipboard(apiKey, 'apiKey')}
                        className={`px-4 py-3 rounded-xl transition-all ${
                          copySuccess === 'apiKey'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {copySuccess === 'apiKey' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={regenerateApiKey}
                        className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                        title="Regenerar chave"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Use esta chave no header <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Authorization: Bearer {'{api_key}'}</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documentação da API</h3>
                
                <div className="space-y-4">
                  {/* Endpoint: Leads */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/kanban</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Lista todos os leads</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/kanban</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cria um novo lead</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">PUT</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/kanban/:id</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Atualiza um lead</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">DELETE</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/kanban/:id</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Remove um lead</span>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/contacts</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Lista todos os contatos</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/contacts</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cria um novo contato</span>
                    </div>
                  </div>

                  {/* Appointments */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/agendamento</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Lista agendamentos</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">POST</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/agendamento</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Cria um agendamento</span>
                    </div>
                  </div>

                  {/* Broadcasts */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center gap-3">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">GET</span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">/api/broadcast-lists</code>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Lista de broadcasts</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Exemplo de Requisição</h4>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "${API_URL}/api/kanban" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB: WHATSAPP ==================== */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              {/* Status Messages */}
              {waError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 dark:text-red-300">{waError}</span>
                  <button onClick={() => setWaError('')} className="ml-auto text-red-500 hover:text-red-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              {waSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-700 dark:text-green-300">{waSuccess}</span>
                  <button onClick={() => setWaSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Load Profile Button */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dados do WhatsApp Business</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Carregue as configurações atuais do WhatsApp para editar</p>
                  </div>
                  <button
                    onClick={async () => {
                      setWaLoading(true)
                      setWaError('')
                      try {
                        const res = await fetch(`${API_URL}/api/whatsapp-business/profile`)
                        if (!res.ok) throw new Error('Falha ao carregar perfil')
                        const data = await res.json()
                        setWaProfile({
                          name: data.name || '',
                          status: data.status || '',
                          photo: data.photo || '',
                          business: {
                            description: data.business?.description || '',
                            email: data.business?.email || '',
                            websites: data.business?.websites || [],
                            address: data.business?.address || '',
                            vertical: data.business?.vertical || ''
                          }
                        })
                        setWaSuccess('Perfil carregado com sucesso!')
                        setTimeout(() => setWaSuccess(''), 3000)
                      } catch (err: any) {
                        setWaError(err.message || 'Erro ao carregar perfil')
                      } finally {
                        setWaLoading(false)
                      }
                    }}
                    disabled={waLoading}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-2"
                  >
                    {waLoading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Carregar Dados
                  </button>
                </div>
              </div>

              {/* Profile Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Perfil</h3>
                
                <div className="flex gap-6">
                  {/* Photo */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                        {(waPhotoPreview || waProfile.photo) ? (
                          <img src={waPhotoPreview || waProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setWaPhotoFile(file)
                              const reader = new FileReader()
                              reader.onload = (e) => setWaPhotoPreview(e.target?.result as string)
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                      </label>
                    </div>
                    {waPhotoFile && (
                      <button
                        onClick={async () => {
                          setWaLoading(true)
                          try {
                            const formData = new FormData()
                            formData.append('photo', waPhotoFile)
                            const res = await fetch(`${API_URL}/api/whatsapp-business/profile/photo`, {
                              method: 'POST',
                              body: formData
                            })
                            if (!res.ok) throw new Error('Falha ao atualizar foto')
                            setWaSuccess('Foto atualizada!')
                            setWaPhotoFile(null)
                            setTimeout(() => setWaSuccess(''), 3000)
                          } catch (err: any) {
                            setWaError(err.message)
                          } finally {
                            setWaLoading(false)
                          }
                        }}
                        disabled={waLoading}
                        className="text-sm px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                      >
                        Enviar Foto
                      </button>
                    )}
                  </div>

                  {/* Profile Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                      <input
                        type="text"
                        value={waProfile.name}
                        onChange={(e) => setWaProfile({ ...waProfile, name: e.target.value })}
                        placeholder="Nome do perfil"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recado / Status</label>
                      <input
                        type="text"
                        value={waProfile.status}
                        onChange={(e) => setWaProfile({ ...waProfile, status: e.target.value })}
                        placeholder="Seu recado ou status"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição do Negócio</label>
                      <textarea
                        value={waProfile.business.description}
                        onChange={(e) => setWaProfile({ ...waProfile, business: { ...waProfile.business, description: e.target.value } })}
                        placeholder="Descrição da sua empresa"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={waProfile.business.email}
                        onChange={(e) => setWaProfile({ ...waProfile, business: { ...waProfile.business, email: e.target.value } })}
                        placeholder="contato@empresa.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
                      <input
                        type="url"
                        value={waProfile.business.websites[0] || ''}
                        onChange={(e) => setWaProfile({ ...waProfile, business: { ...waProfile.business, websites: [e.target.value] } })}
                        placeholder="https://www.empresa.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Endereço</label>
                      <input
                        type="text"
                        value={waProfile.business.address}
                        onChange={(e) => setWaProfile({ ...waProfile, business: { ...waProfile.business, address: e.target.value } })}
                        placeholder="Rua, número, cidade - estado"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                      <select
                        value={waProfile.business.vertical}
                        onChange={(e) => setWaProfile({ ...waProfile, business: { ...waProfile.business, vertical: e.target.value } })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="AUTOMOTIVE">Automotivo</option>
                        <option value="BEAUTY">Beleza & Cosméticos</option>
                        <option value="CLOTHING">Vestuário & Moda</option>
                        <option value="EDUCATION">Educação</option>
                        <option value="ENTERTAINMENT">Entretenimento</option>
                        <option value="EVENTS">Eventos</option>
                        <option value="FINANCE">Finanças</option>
                        <option value="GROCERY">Alimentação</option>
                        <option value="HEALTH">Saúde</option>
                        <option value="HOTEL">Hotelaria</option>
                        <option value="NONPROFIT">ONG / Sem fins lucrativos</option>
                        <option value="PROFESSIONAL_SERVICES">Serviços Profissionais</option>
                        <option value="REAL_ESTATE">Imobiliário</option>
                        <option value="RESTAURANT">Restaurante</option>
                        <option value="RETAIL">Varejo</option>
                        <option value="TRAVEL">Viagens & Turismo</option>
                        <option value="OTHER">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={async () => {
                      setWaLoading(true)
                      try {
                        // Update name
                        if (waProfile.name) {
                          await fetch(`${API_URL}/api/whatsapp-business/profile/name`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: waProfile.name })
                          })
                        }
                        // Update status
                        await fetch(`${API_URL}/api/whatsapp-business/profile/status`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: waProfile.status })
                        })
                        // Update business profile
                        await fetch(`${API_URL}/api/whatsapp-business/business/profile`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(waProfile.business)
                        })
                        setWaSuccess('Perfil atualizado com sucesso!')
                        setTimeout(() => setWaSuccess(''), 3000)
                      } catch (err: any) {
                        setWaError(err.message || 'Erro ao atualizar perfil')
                      } finally {
                        setWaLoading(false)
                      }
                    }}
                    disabled={waLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </div>

              {/* Business Hours */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Horário de Funcionamento</h3>
                
                <div className="space-y-3">
                  {[
                    { key: 'monday', label: 'Segunda-feira' },
                    { key: 'tuesday', label: 'Terça-feira' },
                    { key: 'wednesday', label: 'Quarta-feira' },
                    { key: 'thursday', label: 'Quinta-feira' },
                    { key: 'friday', label: 'Sexta-feira' },
                    { key: 'saturday', label: 'Sábado' },
                    { key: 'sunday', label: 'Domingo' }
                  ].map(day => (
                    <div key={day.key} className="flex items-center gap-4">
                      <div className="w-32">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={waBusinessHours[day.key] !== null}
                            onChange={(e) => {
                              setWaBusinessHours({
                                ...waBusinessHours,
                                [day.key]: e.target.checked ? { open: '08:00', close: '18:00' } : null
                              })
                            }}
                            className="w-4 h-4 rounded text-green-500 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day.label}</span>
                        </label>
                      </div>
                      {waBusinessHours[day.key] && (
                        <>
                          <input
                            type="time"
                            value={waBusinessHours[day.key]?.open || '08:00'}
                            onChange={(e) => setWaBusinessHours({
                              ...waBusinessHours,
                              [day.key]: { ...waBusinessHours[day.key]!, open: e.target.value }
                            })}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                          <span className="text-gray-500">às</span>
                          <input
                            type="time"
                            value={waBusinessHours[day.key]?.close || '18:00'}
                            onChange={(e) => setWaBusinessHours({
                              ...waBusinessHours,
                              [day.key]: { ...waBusinessHours[day.key]!, close: e.target.value }
                            })}
                            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                        </>
                      )}
                      {!waBusinessHours[day.key] && (
                        <span className="text-gray-400 text-sm">Fechado</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={async () => {
                      setWaLoading(true)
                      try {
                        await fetch(`${API_URL}/api/whatsapp-business/business/hours`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            timezone: 'America/Sao_Paulo',
                            businessHours: waBusinessHours 
                          })
                        })
                        setWaSuccess('Horários atualizados!')
                        setTimeout(() => setWaSuccess(''), 3000)
                      } catch (err: any) {
                        setWaError(err.message || 'Erro ao atualizar horários')
                      } finally {
                        setWaLoading(false)
                      }
                    }}
                    disabled={waLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all"
                  >
                    Salvar Horários
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mensagens Automáticas</h3>
                
                {/* Greeting Message */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Mensagem de Saudação</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enviada quando alguém entra em contato pela primeira vez</p>
                    </div>
                    <ToggleSwitch
                      checked={waGreetingMessage.enabled}
                      onChange={(checked) => setWaGreetingMessage({ ...waGreetingMessage, enabled: checked })}
                    />
                  </div>
                  {waGreetingMessage.enabled && (
                    <textarea
                      value={waGreetingMessage.message}
                      onChange={(e) => setWaGreetingMessage({ ...waGreetingMessage, message: e.target.value })}
                      placeholder="Olá! Seja bem-vindo(a)! Como posso ajudar?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    />
                  )}
                </div>

                {/* Away Message */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Mensagem de Ausência</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enviada fora do horário de atendimento</p>
                    </div>
                    <ToggleSwitch
                      checked={waAwayMessage.enabled}
                      onChange={(checked) => setWaAwayMessage({ ...waAwayMessage, enabled: checked })}
                    />
                  </div>
                  {waAwayMessage.enabled && (
                    <>
                      <textarea
                        value={waAwayMessage.message}
                        onChange={(e) => setWaAwayMessage({ ...waAwayMessage, message: e.target.value })}
                        placeholder="Obrigado pelo contato! No momento estamos fora do horário de atendimento. Retornaremos em breve!"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none mb-3"
                      />
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Ativar das</span>
                        <input
                          type="time"
                          value={waAwayMessage.schedule.startTime}
                          onChange={(e) => setWaAwayMessage({
                            ...waAwayMessage,
                            schedule: { ...waAwayMessage.schedule, startTime: e.target.value }
                          })}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">às</span>
                        <input
                          type="time"
                          value={waAwayMessage.schedule.endTime}
                          onChange={(e) => setWaAwayMessage({
                            ...waAwayMessage,
                            schedule: { ...waAwayMessage.schedule, endTime: e.target.value }
                          })}
                          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={async () => {
                      setWaLoading(true)
                      try {
                        await fetch(`${API_URL}/api/whatsapp-business/messages/greeting`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(waGreetingMessage)
                        })
                        await fetch(`${API_URL}/api/whatsapp-business/messages/away`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(waAwayMessage)
                        })
                        setWaSuccess('Mensagens atualizadas!')
                        setTimeout(() => setWaSuccess(''), 3000)
                      } catch (err: any) {
                        setWaError(err.message || 'Erro ao atualizar mensagens')
                      } finally {
                        setWaLoading(false)
                      }
                    }}
                    disabled={waLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all"
                  >
                    Salvar Mensagens
                  </button>
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacidade</h3>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Confirmação de Leitura</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Mostrar quando você leu as mensagens</p>
                    </div>
                    <ToggleSwitch
                      checked={waPrivacy.readReceipts}
                      onChange={(checked) => setWaPrivacy({ ...waPrivacy, readReceipts: checked })}
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 dark:text-white mb-2">Foto do Perfil</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quem pode ver sua foto de perfil</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'all', label: 'Todos' },
                        { value: 'contacts', label: 'Contatos' },
                        { value: 'nobody', label: 'Ninguém' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setWaPrivacy({ ...waPrivacy, profilePhoto: opt.value as any })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            waPrivacy.profilePhoto === opt.value
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 dark:text-white mb-2">Visto por Último</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quem pode ver quando você esteve online</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'all', label: 'Todos' },
                        { value: 'contacts', label: 'Contatos' },
                        { value: 'nobody', label: 'Ninguém' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setWaPrivacy({ ...waPrivacy, lastSeen: opt.value as any })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            waPrivacy.lastSeen === opt.value
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 dark:text-white mb-2">Recado / Status</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quem pode ver seu recado</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'all', label: 'Todos' },
                        { value: 'contacts', label: 'Contatos' },
                        { value: 'nobody', label: 'Ninguém' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setWaPrivacy({ ...waPrivacy, status: opt.value as any })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            waPrivacy.status === opt.value
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 dark:text-white mb-2">Grupos</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quem pode adicionar você a grupos</p>
                    <div className="flex gap-3">
                      {[
                        { value: 'all', label: 'Todos' },
                        { value: 'contacts', label: 'Contatos' },
                        { value: 'nobody', label: 'Ninguém' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setWaPrivacy({ ...waPrivacy, groupAdd: opt.value as any })}
                          className={`px-4 py-2 rounded-lg border transition-all ${
                            waPrivacy.groupAdd === opt.value
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={async () => {
                      setWaLoading(true)
                      try {
                        await fetch(`${API_URL}/api/whatsapp-business/privacy`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(waPrivacy)
                        })
                        setWaSuccess('Privacidade atualizada!')
                        setTimeout(() => setWaSuccess(''), 3000)
                      } catch (err: any) {
                        setWaError(err.message || 'Erro ao atualizar privacidade')
                      } finally {
                        setWaLoading(false)
                      }
                    }}
                    disabled={waLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl transition-all"
                  >
                    Salvar Privacidade
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
