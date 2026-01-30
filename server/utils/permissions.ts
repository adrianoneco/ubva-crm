import { db } from '../db'
import { groups, permissions, groupPermissions, userGroups, userPermissionOverrides } from '../db/schema'
import { eq, and } from 'drizzle-orm'

// Default permissions
const DEFAULT_PERMISSIONS = [
  // Leads
  { key: 'leads.view', name: 'Visualizar leads', category: 'Leads' },
  { key: 'leads.create', name: 'Criar leads', category: 'Leads' },
  { key: 'leads.edit', name: 'Editar leads', category: 'Leads' },
  { key: 'leads.delete', name: 'Deletar leads', category: 'Leads' },
  // Contacts
  { key: 'contacts.view', name: 'Visualizar contatos', category: 'Contatos' },
  { key: 'contacts.create', name: 'Criar contatos', category: 'Contatos' },
  { key: 'contacts.edit', name: 'Editar contatos', category: 'Contatos' },
  { key: 'contacts.delete', name: 'Deletar contatos', category: 'Contatos' },
  // Appointments
  { key: 'appointments.view', name: 'Visualizar agendamentos', category: 'Agendamentos' },
  { key: 'appointments.create', name: 'Criar agendamentos', category: 'Agendamentos' },
  { key: 'appointments.edit', name: 'Editar agendamentos', category: 'Agendamentos' },
  { key: 'appointments.delete', name: 'Deletar agendamentos', category: 'Agendamentos' },
  // Campaigns
  { key: 'campaigns.view', name: 'Visualizar campanhas', category: 'Campanhas' },
  { key: 'campaigns.create', name: 'Criar campanhas', category: 'Campanhas' },
  { key: 'campaigns.edit', name: 'Editar campanhas', category: 'Campanhas' },
  { key: 'campaigns.execute', name: 'Executar campanhas', category: 'Campanhas' },
  // Settings
  { key: 'settings.view', name: 'Acessar configurações', category: 'Configurações' },
  { key: 'settings.manage_users', name: 'Gerenciar usuários', category: 'Configurações' },
  { key: 'settings.manage_groups', name: 'Gerenciar grupos', category: 'Configurações' },
  { key: 'settings.manage_webhooks', name: 'Gerenciar webhooks', category: 'Configurações' },
]

export async function ensureDefaultPermissions() {
  try {
    for (const perm of DEFAULT_PERMISSIONS) {
      const exists = await db.select().from(permissions).where(eq(permissions.key, perm.key))
      if (exists.length === 0) {
        await db.insert(permissions).values({
          key: perm.key,
          name: perm.name,
          category: perm.category,
        })
      }
    }
  } catch (error) {
    console.error('Error ensuring default permissions:', error)
  }
}

export async function ensureDefaultGroups() {
  try {
    // Get all permissions
    const allPermissions = await db.select().from(permissions)
    
    const defaultGroups = [
      {
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        // Administrador has all permissions
        permissionKeys: allPermissions.map(p => p.key)
      },
      {
        name: 'Gerente',
        description: 'Acesso a recursos de gerenciamento',
        // Gerente can do almost everything except delete
        permissionKeys: [
          'leads.view', 'leads.create', 'leads.edit',
          'contacts.view', 'contacts.create', 'contacts.edit',
          'appointments.view', 'appointments.create', 'appointments.edit',
          'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.execute',
          'settings.view', 'settings.manage_users',
        ]
      },
      {
        name: 'Usuario',
        description: 'Acesso básico ao sistema',
        // Usuario can only view and create
        permissionKeys: [
          'leads.view', 'leads.create',
          'contacts.view', 'contacts.create',
          'appointments.view', 'appointments.create',
          'campaigns.view',
          'settings.view',
        ]
      }
    ]

    for (const groupData of defaultGroups) {
      // Check if group already exists
      const existingGroup = await db
        .select()
        .from(groups)
        .where(eq(groups.name, groupData.name))
      
      let groupId: string
      if (existingGroup.length === 0) {
        // Create group
        const [newGroup] = await db
          .insert(groups)
          .values({ name: groupData.name, description: groupData.description })
          .returning()
        groupId = newGroup.id
        console.log(`Created default group: ${groupData.name}`)
      } else {
        groupId = existingGroup[0].id
      }

      // Assign permissions to group
      for (const permKey of groupData.permissionKeys) {
        const [perm] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.key, permKey))
        
        if (perm) {
          // Check if this permission is already assigned
          const alreadyAssigned = await db
            .select()
            .from(groupPermissions)
            .where(and(
              eq(groupPermissions.groupId, groupId),
              eq(groupPermissions.permissionId, perm.id)
            ))
          
          if (alreadyAssigned.length === 0) {
            await db
              .insert(groupPermissions)
              .values({ groupId, permissionId: perm.id })
          }
        }
      }
    }
    
    console.log('Default groups ensured')
  } catch (error) {
    console.error('Error ensuring default groups:', error)
  }
}

export async function getGroups() {
  try {
    const allGroups = await db.select().from(groups)
    return allGroups
  } catch (error) {
    console.error('Error fetching groups:', error)
    throw error
  }
}

export async function getGroupWithPermissions(groupId: string) {
  try {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId))
    if (!group) return null

    const groupPerms = await db
      .select({ permissionId: groupPermissions.permissionId })
      .from(groupPermissions)
      .where(eq(groupPermissions.groupId, groupId))

    const permissionIds = groupPerms.map(p => p.permissionId)

    const allPerms = await db.select().from(permissions)
    
    return {
      ...group,
      permissions: allPerms.map(p => ({
        ...p,
        enabled: permissionIds.includes(p.id)
      }))
    }
  } catch (error) {
    console.error('Error fetching group with permissions:', error)
    throw error
  }
}

export async function createGroup(name: string, description?: string) {
  try {
    const [group] = await db
      .insert(groups)
      .values({ name, description })
      .returning()
    return group
  } catch (error) {
    console.error('Error creating group:', error)
    throw error
  }
}

export async function updateGroup(groupId: string, name: string, description?: string) {
  try {
    const [group] = await db
      .update(groups)
      .set({ name, description })
      .where(eq(groups.id, groupId))
      .returning()
    return group
  } catch (error) {
    console.error('Error updating group:', error)
    throw error
  }
}

export async function deleteGroup(groupId: string) {
  try {
    // Cascading delete should handle related records
    await db.delete(groups).where(eq(groups.id, groupId))
    return true
  } catch (error) {
    console.error('Error deleting group:', error)
    throw error
  }
}

export async function setGroupPermissions(groupId: string, permissionIds: string[]) {
  try {
    // Delete existing permissions
    await db.delete(groupPermissions).where(eq(groupPermissions.groupId, groupId))
    
    // Insert new permissions
    if (permissionIds.length > 0) {
      await db.insert(groupPermissions).values(
        permissionIds.map(permissionId => ({
          groupId,
          permissionId
        }))
      )
    }
    
    return true
  } catch (error) {
    console.error('Error setting group permissions:', error)
    throw error
  }
}

export async function assignGroupToUser(userId: string, groupId: string) {
  try {
    const [userGroup] = await db
      .insert(userGroups)
      .values({ userId, groupId })
      .returning()
    return userGroup
  } catch (error) {
    console.error('Error assigning group to user:', error)
    throw error
  }
}

export async function removeGroupFromUser(userId: string, groupId: string) {
  try {
    await db.delete(userGroups).where(
      and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId))
    )
    return true
  } catch (error) {
    console.error('Error removing group from user:', error)
    throw error
  }
}

export async function getUserGroups(userId: string) {
  try {
    const userGrps = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId))

    return userGrps.map(ug => ug.groupId)
  } catch (error) {
    console.error('Error fetching user groups:', error)
    throw error
  }
}

export async function getUserPermissions(userId: string) {
  try {
    // Get all permissions from user's groups
    const userGrps = await db
      .select({ groupId: userGroups.groupId })
      .from(userGroups)
      .where(eq(userGroups.userId, userId))

    const groupIds = userGrps.map(ug => ug.groupId)

    let groupPermsResult: any[] = []
    if (groupIds.length > 0) {
      // For each group, get its permissions
      for (const groupId of groupIds) {
        const perms = await db
          .select({ permissionId: groupPermissions.permissionId })
          .from(groupPermissions)
          .where(eq(groupPermissions.groupId, groupId))
        groupPermsResult.push(...perms)
      }
    }

    // Get user's permission overrides
    const userOverrides = await db
      .select()
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId))

    // Combine: group permissions + user overrides
    const permissionIds = new Set(groupPermsResult.map(p => p.permissionId))
    
    for (const override of userOverrides) {
      if (override.granted) {
        permissionIds.add(override.permissionId)
      } else {
        permissionIds.delete(override.permissionId)
      }
    }

    return Array.from(permissionIds)
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    throw error
  }
}

export async function setUserPermissionOverride(userId: string, permissionId: string, granted: boolean) {
  try {
    // Check if override already exists
    const existing = await db
      .select()
      .from(userPermissionOverrides)
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.permissionId, permissionId)
        )
      )

    if (existing.length > 0) {
      // Update existing
      await db
        .update(userPermissionOverrides)
        .set({ granted })
        .where(
          and(
            eq(userPermissionOverrides.userId, userId),
            eq(userPermissionOverrides.permissionId, permissionId)
          )
        )
    } else {
      // Create new
      await db
        .insert(userPermissionOverrides)
        .values({ userId, permissionId, granted })
    }
    
    return true
  } catch (error) {
    console.error('Error setting user permission override:', error)
    throw error
  }
}

export async function removeUserPermissionOverride(userId: string, permissionId: string) {
  try {
    await db
      .delete(userPermissionOverrides)
      .where(
        and(
          eq(userPermissionOverrides.userId, userId),
          eq(userPermissionOverrides.permissionId, permissionId)
        )
      )
    return true
  } catch (error) {
    console.error('Error removing user permission override:', error)
    throw error
  }
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  try {
    // Get user's permissions
    const userPermIds = await getUserPermissions(userId)

    // Get the permission ID for the given key
    const [perm] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, permissionKey))

    if (!perm) return false

    return userPermIds.includes(perm.id)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
