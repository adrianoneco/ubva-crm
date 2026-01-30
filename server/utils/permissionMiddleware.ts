import { Request, Response, NextFunction } from 'express'
import { getUserPermissions, hasPermission } from './permissions'
import { db } from '../db'
import { permissions } from '../db/schema'

export interface AuthRequest extends Request {
  userId?: string
  userPermissions?: string[]
  permissionKeys?: string[]
}

export async function requirePermission(permissionKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      const hasAccess = await hasPermission(userId, permissionKey)
      if (!hasAccess) {
        return res.status(403).json({ error: 'Permission denied' })
      }

      next()
    } catch (error) {
      res.status(500).json({ error: 'Permission check failed' })
    }
  }
}

export async function checkPermission(req: AuthRequest, permissionKey: string): Promise<boolean> {
  try {
    const userId = req.userId
    if (!userId) return false
    return await hasPermission(userId, permissionKey)
  } catch (error) {
    return false
  }
}

export async function loadUserPermissions(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const userId = req.userId
    if (userId) {
      const permissionIds = await getUserPermissions(userId)
      
      // Convert permission IDs to keys
      const allPermissions = await db.select().from(permissions)
      const permKeyMap = new Map(allPermissions.map(p => [p.id, p.key]))
      
      req.userPermissions = permissionIds
        .map(id => permKeyMap.get(id))
        .filter(Boolean) as string[]
        
      req.permissionKeys = req.userPermissions
    }
    next()
  } catch (error) {
    console.error('Error loading user permissions:', error)
    next()
  }
}
