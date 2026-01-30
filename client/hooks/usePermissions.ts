import { useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config'

// Cache for permissions
let permissionsCache: string[] | null = null
let cacheUserId: string | null = null

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPermissions = useCallback(async () => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        setPermissions([])
        setLoading(false)
        return
      }

      const user = JSON.parse(userStr)
      
      // Admin has all permissions
      if (user.role === 'admin') {
        const allPerms = [
          'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
          'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete',
          'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.delete',
          'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
          'settings.view', 'settings.manage_users', 'settings.manage_groups', 'settings.manage_webhooks',
        ]
        setPermissions(allPerms)
        permissionsCache = allPerms
        cacheUserId = user.id
        setLoading(false)
        return
      }

      // Check cache
      if (cacheUserId === user.id && permissionsCache) {
        setPermissions(permissionsCache)
        setLoading(false)
        return
      }

      const res = await fetch(`${API_URL}/api/auth/me/${user.id}/permissions`)
      if (res.ok) {
        const data = await res.json()
        const perms = data.permissions || []
        setPermissions(perms)
        permissionsCache = perms
        cacheUserId = user.id
      } else {
        setPermissions([])
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission)
  }, [permissions])

  const can = useCallback((action: 'view' | 'create' | 'edit' | 'delete' | 'execute', resource: string): boolean => {
    const permission = `${resource}.${action}`
    return permissions.includes(permission)
  }, [permissions])

  const canView = useCallback((resource: string) => can('view', resource), [can])
  const canCreate = useCallback((resource: string) => can('create', resource), [can])
  const canEdit = useCallback((resource: string) => can('edit', resource), [can])
  const canDelete = useCallback((resource: string) => can('delete', resource), [can])

  // Refresh permissions (useful after role changes)
  const refreshPermissions = useCallback(() => {
    permissionsCache = null
    cacheUserId = null
    setLoading(true)
    fetchPermissions()
  }, [fetchPermissions])

  return {
    permissions,
    loading,
    hasPermission,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    refreshPermissions,
  }
}

// Clear cache on logout
export function clearPermissionsCache() {
  permissionsCache = null
  cacheUserId = null
}
