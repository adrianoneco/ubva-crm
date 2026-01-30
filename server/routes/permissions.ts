import { Router } from 'express'
import {
  getGroups,
  getGroupWithPermissions,
  createGroup,
  updateGroup,
  deleteGroup,
  setGroupPermissions,
  assignGroupToUser,
  removeGroupFromUser,
  getUserGroups,
  setUserPermissionOverride,
  removeUserPermissionOverride,
  ensureDefaultPermissions
} from '../utils/permissions'
import { db } from '../db'
import { permissions, groupPermissions } from '../db/schema'
import { eq } from 'drizzle-orm'

const router = Router()

// Ensure default permissions on startup
ensureDefaultPermissions()

// Get all groups
router.get('/groups', async (_req, res) => {
  try {
    const allGroups = await getGroups()
    // Fetch permissions for each group to show correct count
    const groupsWithPerms = await Promise.all(
      allGroups.map(async (group) => {
        const groupPerms = await db
          .select({ permissionId: groupPermissions.permissionId })
          .from(groupPermissions)
          .where(eq(groupPermissions.groupId, group.id))
        
        const permissionIds = groupPerms.map(p => p.permissionId)
        const allPermissions = await db.select().from(permissions)
        
        return {
          ...group,
          permissions: allPermissions.map(p => ({
            ...p,
            enabled: permissionIds.includes(p.id)
          }))
        }
      })
    )
    res.json(groupsWithPerms)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' })
  }
})

// Get group with permissions
router.get('/groups/:id', async (req, res) => {
  try {
    const group = await getGroupWithPermissions(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group' })
  }
})

// Create group
router.post('/groups', async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const group = await createGroup(name, description)
    res.status(201).json(group)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' })
  }
})

// Update group
router.put('/groups/:id', async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })

    const group = await updateGroup(req.params.id, name, description)
    res.json(group)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update group' })
  }
})

// Delete group
router.delete('/groups/:id', async (req, res) => {
  try {
    await deleteGroup(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' })
  }
})

// Set group permissions
router.post('/groups/:id/permissions', async (req, res) => {
  try {
    const { permissionIds } = req.body
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds must be an array' })
    }

    await setGroupPermissions(req.params.id, permissionIds)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to set group permissions' })
  }
})

// Get all permissions
router.get('/permissions', async (_req, res) => {
  try {
    const allPerms = await db.select().from(permissions)
    
    // Group by category
    const grouped = allPerms.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = []
      acc[perm.category].push(perm)
      return acc
    }, {} as Record<string, typeof allPerms>)

    res.json(grouped)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions' })
  }
})

// Assign group to user
router.post('/users/:userId/groups', async (req, res) => {
  try {
    const { groupId } = req.body
    if (!groupId) return res.status(400).json({ error: 'groupId is required' })

    await assignGroupToUser(req.params.userId, groupId)
    res.status(201).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign group to user' })
  }
})

// Remove group from user
router.delete('/users/:userId/groups/:groupId', async (req, res) => {
  try {
    await removeGroupFromUser(req.params.userId, req.params.groupId)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove group from user' })
  }
})

// Get user groups
router.get('/users/:userId/groups', async (req, res) => {
  try {
    const userGroupIds = await getUserGroups(req.params.userId)
    res.json(userGroupIds)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user groups' })
  }
})

// Set user permission override
router.post('/users/:userId/overrides', async (req, res) => {
  try {
    const { permissionId, granted } = req.body
    if (!permissionId || granted === undefined) {
      return res.status(400).json({ error: 'permissionId and granted are required' })
    }

    await setUserPermissionOverride(req.params.userId, permissionId, granted)
    res.status(201).json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to set permission override' })
  }
})

// Remove user permission override
router.delete('/users/:userId/overrides/:permissionId', async (req, res) => {
  try {
    await removeUserPermissionOverride(req.params.userId, req.params.permissionId)
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permission override' })
  }
})

export default router
