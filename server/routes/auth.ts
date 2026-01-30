import { Router } from 'express'
import { registerUser, loginUser, getUserByEmail, hashPassword } from '../utils/auth'
import { getUserPermissions } from '../utils/permissions'
import { db } from '../db'
import { users, otpCodes, permissions } from '../db/schema'
import { eq, gt, and, isNull, isNotNull, desc, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

const router = Router()

// Get authentication configuration (email enabled etc)
router.get('/config', (_req, res) => {
  res.json({
    emailVerificationEnabled: !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_PORT && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASSWORD
    ),
    smtpConfigured: !!(
      process.env.SMTP_HOST && 
      process.env.SMTP_USER && 
      process.env.SMTP_PASSWORD && 
      process.env.SMTP_FROM
    )
  })
})

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

// Get user permissions by user ID
router.get('/me/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get user's permission IDs
    const permissionIds = await getUserPermissions(userId)
    
    // Get the permission keys
    let permissionKeys: string[] = []
    if (permissionIds.length > 0) {
      const perms = await db
        .select({ key: permissions.key })
        .from(permissions)
        .where(inArray(permissions.id, permissionIds))
      
      permissionKeys = perms.map(p => p.key)
    }
    
    // Admin role gets all permissions by default
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    if (user?.role === 'admin') {
      const allPerms = await db.select({ key: permissions.key }).from(permissions)
      permissionKeys = allPerms.map(p => p.key)
    }

    res.json({ permissions: permissionKeys })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    res.status(500).json({ error: 'Failed to fetch permissions' })
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
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email))

    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Request OTP for password recovery via WhatsApp
router.post('/request-otp', async (req, res) => {
  try {
    const { email, phone } = req.body

    if (!email || !phone) {
      return res.status(400).json({ error: 'Email and phone are required' })
    }

    // Verify user exists
    const user = await getUserByEmail(email)
    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ success: true, expiresIn: 300 })
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Get OTP expiry from env (default 5 minutes = 300 seconds)
    const otpExpireSeconds = parseInt(process.env.OTP_EXPIRES_IN || '300', 10)
    const expiresAt = new Date(Date.now() + otpExpireSeconds * 1000)

    // Store OTP in database
    await db.insert(otpCodes).values({
      phone,
      code,
      expiresAt,
    })

    // Send OTP via Z-API WhatsApp
    try {
      const zapiInstanceId = process.env.ZAPI_INSTANCE_ID || ''
      const zapiInstanceToken = process.env.ZAPI_INSTANCE_TOKEN || ''
      const zapiSecurityToken = process.env.ZAPI_SECURITY_TOKEN || process.env.ZAPI_INSTANCE_SECRET || ''

      const response = await fetch(
        `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/send-button-otp`,
        {
          method: 'POST',
          headers: {
            'client-token': zapiSecurityToken,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            phone: phone,
            message: `Seu código de verificação UBVA CRM é: ${code}`,
            code: code,
          }),
        }
      )

      if (!response.ok) {
        console.error('Z-API error:', await response.text())
        return res.status(500).json({ error: 'Failed to send OTP via WhatsApp' })
      }

      res.json({ success: true, expiresIn: otpExpireSeconds })
    } catch (zapiError) {
      console.error('Z-API fetch error:', zapiError)
      // Don't fail the request - OTP is stored, send might have failed
      res.json({ success: true, expiresIn: otpExpireSeconds, warning: 'OTP stored but WhatsApp send may have failed' })
    }
  } catch (error) {
    console.error('OTP request error:', error)
    res.status(500).json({ error: 'Failed to request OTP' })
  }
})

// Verify OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' })
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' })
    }

    // Find matching OTP code
    const otpRecord = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.code, otp),
        gt(otpCodes.expiresAt, new Date()),
        isNull(otpCodes.usedAt)
      )
    ).orderBy(desc(otpCodes.createdAt)).limit(1)

    if (!otpRecord || otpRecord.length === 0) {
      // Increment failed attempts for this OTP
      await db.update(otpCodes).set({
        attempts: sql`attempts + 1`
      }).where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, otp)
        )
      )
      
      return res.status(401).json({ error: 'Invalid or expired OTP' })
    }

    const validOtp = otpRecord[0]

    // Mark OTP as used
    await db.update(otpCodes).set({
      usedAt: new Date()
    }).where(eq(otpCodes.id, validOtp.id))

    res.json({ success: true, message: 'OTP verified successfully' })
  } catch (error) {
    console.error('OTP verification error:', error)
    res.status(500).json({ error: 'Failed to verify OTP' })
  }
})

// Reset password after OTP verification
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body

    if (!email || !phone || !newPassword) {
      return res.status(400).json({ error: 'Email, phone, and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Verify OTP was used for this phone
    const validOtp = await db.select().from(otpCodes).where(
      and(
        eq(otpCodes.phone, phone),
        isNotNull(otpCodes.usedAt)
      )
    ).orderBy(desc(otpCodes.usedAt)).limit(1)

    if (!validOtp || validOtp.length === 0) {
      return res.status(401).json({ error: 'OTP not verified for this phone' })
    }

    // Get user by email
    const user = await getUserByEmail(email)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword)

    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email))

    // Clean up old OTP codes for this phone (older than 1 hour)
    await db.delete(otpCodes).where(
      and(
        eq(otpCodes.phone, phone),
        sql`created_at < NOW() - INTERVAL '1 hour'`
      )
    )

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Password reset OTP error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router
