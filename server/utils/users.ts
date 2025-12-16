import { db } from '../db'
import { users } from '../db/schema'

export async function getUsers() {
  try {
    return await db.select().from(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

export async function createUser(name: string, email: string) {
  try {
    const [user] = await db
      .insert(users)
      .values({ name, email })
      .returning()
    return user
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}
