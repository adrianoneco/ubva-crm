import { db } from '../db'
import { users } from '../db/schema'

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

export async function createUser(name: string, email: string, password: string) {
  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, password })
      .returning()
    
    // Don't return password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}
