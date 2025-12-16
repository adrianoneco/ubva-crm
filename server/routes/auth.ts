import { Router } from 'express'
import { registerUser, loginUser, getUserByEmail, hashPassword } from '../utils/auth'

const router = Router()

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' })
    }

    const user = await registerUser(name, email, password)
    res.status(201).json({ user, message: 'User registered successfully' })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await loginUser(email, password)

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    res.json({ user, message: 'Login successful' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

// Request password recovery (simplified - in production, send email with token)
router.post('/recover', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await getUserByEmail(email)

    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ message: 'If the email exists, a recovery link will be sent' })
    }

    // In a real app, generate a token and send email
    // For now, just return success
    res.json({ message: 'If the email exists, a recovery link will be sent' })
  } catch (error) {
    console.error('Recovery error:', error)
    res.status(500).json({ error: 'Failed to process recovery request' })
  }
})

// Reset password (simplified)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' })
    }

    // In production, verify token here
    const user = await getUserByEmail(email)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const hashedPassword = await hashPassword(newPassword)
    
    // Update password in database
    const { db } = await import('../db')
    const { users } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email))

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router
