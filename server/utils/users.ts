import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from './auth'

export async function getUsers() {
  try {
    // Don't return passwords
    const allUsers = await db.select().from(users)
    return allUsers.map(({ password: _, ...user }) => user)
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

export async function createUser(name: string, email: string, password: string, role: string = 'user', phone?: string, phoneCountry?: string, avatar?: string) {
  try {
    const hashedPassword = await hashPassword(password)
    
    const [user] = await db
      .insert(users)
      .values({ name, email, password: hashedPassword, role, phone, phoneCountry: phoneCountry || 'BR', avatar: avatar || null })
      .returning()
    
    // Don't return password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export async function updateUser(id: string, data: { name?: string; email?: string; role?: string; password?: string; phone?: string; phoneCountry?: string; avatar?: string }) {
  try {
    const updateData: any = {}
    if (data.name) updateData.name = data.name
    if (data.email) updateData.email = data.email
    if (data.role) updateData.role = data.role
    if (data.password) {
      updateData.password = await hashPassword(data.password)
    }
    if (data.phone !== undefined) updateData.phone = data.phone || null
    if (data.phoneCountry !== undefined) updateData.phoneCountry = data.phoneCountry || 'BR'
    if (data.avatar !== undefined) updateData.avatar = data.avatar || null

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning()
    
    if (!user) return null
    
    // Don't return password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Error updating user:', error)
    throw error
  }
}

export async function deleteUser(id: string) {
  try {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning()
    
    return user ? true : false
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}
