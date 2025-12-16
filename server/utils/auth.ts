import argon2 from 'argon2'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

// Argon2id configuration (recommended for password hashing)
const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, hashOptions)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch (error) {
    return false
  }
}

export async function registerUser(name: string, email: string, password: string) {
  const hashedPassword = await hashPassword(password)
  
  const [user] = await db.insert(users).values({
    name,
    email,
    password: hashedPassword,
  }).returning()

  // Don't return the password hash
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function loginUser(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email))

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(user.password, password)
  
  if (!isValid) {
    return null
  }

  // Don't return the password hash
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email))
  
  if (!user) {
    return null
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}
