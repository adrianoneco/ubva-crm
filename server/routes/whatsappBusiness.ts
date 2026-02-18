import { Router, Request, Response } from 'express'
// @ts-ignore - multer types issue
import multer from 'multer'

const router = Router()

// Configure multer for photo uploads
const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'))
    }
  }
})

// Helper to get Z-API credentials
function getZapiCredentials() {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const instanceToken = process.env.ZAPI_INSTANCE_TOKEN
  const instanceSecret = process.env.ZAPI_INSTANCE_SECRET

  if (!instanceId || !instanceToken) {
    return null
  }

  return { instanceId, instanceToken, instanceSecret }
}

// Helper to make Z-API requests
async function zapiRequest(endpoint: string, method: string = 'GET', body?: any) {
  const creds = getZapiCredentials()
  if (!creds) {
    throw new Error('Z-API credentials not configured')
  }

  // Z-API URL format: https://api.z-api.io/instances/{instanceId}/token/{token}/{endpoint}
  const url = `https://api.z-api.io/instances/${creds.instanceId}/token/${creds.instanceToken}/${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Add client-token header if secret is available
  if (creds.instanceSecret) {
    headers['client-token'] = creds.instanceSecret
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  console.log(`[Z-API] ${method} ${endpoint}`)
  const response = await fetch(url, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Z-API] Error ${response.status}: ${errorText}`)
    throw new Error(`Z-API request failed: ${response.status}`)
  }

  const text = await response.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

// ==================== PROFILE ====================

// Get WhatsApp Business profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string
    
    // Get business profile with phone param if provided
    let profileData: any = {}
    try {
      const endpoint = phone ? `business/profile?phone=${phone}` : 'business/profile'
      profileData = await zapiRequest(endpoint)
    } catch (e) {
      console.log('[Z-API] Could not fetch business profile')
    }
    
    // Get profile name  
    let profileName = ''
    try {
      const nameData = await zapiRequest('profile-name')
      profileName = nameData.name || nameData.value || ''
    } catch (e) {
      console.log('[Z-API] Could not fetch profile name')
    }

    // Get profile status/about
    let profileStatus = ''
    try {
      const statusData = await zapiRequest('profile-status')
      profileStatus = statusData.status || statusData.value || ''
    } catch (e) {
      console.log('[Z-API] Could not fetch profile status')
    }

    // Get profile photo
    let profilePhoto = ''
    try {
      const photoData = await zapiRequest('profile-picture')
      profilePhoto = photoData.profilePictureUrl || photoData.picture || photoData.value || ''
    } catch (e) {
      console.log('[Z-API] Could not fetch profile photo')
    }

    res.json({
      name: profileName,
      status: profileStatus,
      photo: profilePhoto,
      business: {
        description: profileData.description || '',
        address: profileData.address || '',
        email: profileData.email || '',
        websites: profileData.websites || [],
        categories: profileData.categories || [],
        businessHours: profileData.businessHours || [],
        hasCoverPhoto: profileData.hasCoverPhoto || false,
      },
    })
  } catch (error: any) {
    console.error('[WhatsApp Business] Profile fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch profile' })
  }
})

// Update profile name
router.put('/profile/name', async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const result = await zapiRequest('update-profile-name', 'POST', { name })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Name update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update name' })
  }
})

// Update profile status/about
router.put('/profile/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required' })
    }

    const result = await zapiRequest('update-profile-status', 'POST', { status })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Status update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update status' })
  }
})

// Update profile photo
router.post('/profile/photo', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file
    if (!file) {
      return res.status(400).json({ error: 'Photo file is required' })
    }

    // Convert to base64
    const base64Image = file.buffer.toString('base64')
    const mimeType = file.mimetype
    const dataUri = `data:${mimeType};base64,${base64Image}`

    const result = await zapiRequest('update-profile-picture', 'POST', { image: dataUri })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Photo update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update photo' })
  }
})

// Remove profile photo
router.delete('/profile/photo', async (_req: Request, res: Response) => {
  try {
    const result = await zapiRequest('delete-profile-picture', 'DELETE')
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Photo delete error:', error)
    res.status(500).json({ error: error.message || 'Failed to remove photo' })
  }
})

// ==================== BUSINESS PROFILE ====================

// Update business profile (description, email, website, address)
router.put('/business/profile', async (req: Request, res: Response) => {
  try {
    const { description, email, websites, address } = req.body
    const results: any = {}

    // Update description
    if (description !== undefined) {
      try {
        results.description = await zapiRequest('business/company-description', 'POST', { value: description })
      } catch (e) {
        console.error('[Z-API] Failed to update description:', e)
      }
    }

    // Update email
    if (email !== undefined) {
      try {
        results.email = await zapiRequest('business/company-email', 'POST', { value: email })
      } catch (e) {
        console.error('[Z-API] Failed to update email:', e)
      }
    }

    // Update address
    if (address !== undefined) {
      try {
        results.address = await zapiRequest('business/company-address', 'POST', { value: address })
      } catch (e) {
        console.error('[Z-API] Failed to update address:', e)
      }
    }

    // Update websites (if supported by a separate endpoint)
    if (websites !== undefined) {
      try {
        const websiteList = Array.isArray(websites) ? websites : [websites]
        results.websites = await zapiRequest('business/company-websites', 'POST', { value: websiteList })
      } catch (e) {
        console.error('[Z-API] Failed to update websites:', e)
      }
    }

    res.json({ success: true, results })
  } catch (error: any) {
    console.error('[WhatsApp Business] Business profile update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update business profile' })
  }
})

// Update company description
router.put('/business/description', async (req: Request, res: Response) => {
  try {
    const { value } = req.body
    if (!value) {
      return res.status(400).json({ error: 'Description value is required' })
    }
    const result = await zapiRequest('business/company-description', 'POST', { value })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Description update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update description' })
  }
})

// Update company email
router.put('/business/email', async (req: Request, res: Response) => {
  try {
    const { value } = req.body
    if (!value) {
      return res.status(400).json({ error: 'Email value is required' })
    }
    const result = await zapiRequest('business/company-email', 'POST', { value })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Email update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update email' })
  }
})

// Update company address
router.put('/business/address', async (req: Request, res: Response) => {
  try {
    const { value } = req.body
    if (!value) {
      return res.status(400).json({ error: 'Address value is required' })
    }
    const result = await zapiRequest('business/company-address', 'POST', { value })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Address update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update address' })
  }
})

// ==================== BUSINESS HOURS ====================

// Get business hours (from business profile)
router.get('/business/hours', async (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string
    const endpoint = phone ? `business/profile?phone=${phone}` : 'business/profile'
    const result = await zapiRequest(endpoint)
    res.json({
      businessHours: result.businessHours || [],
      timezone: result.timezone || 'America/Sao_Paulo'
    })
  } catch (error: any) {
    console.error('[WhatsApp Business] Business hours fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch business hours' })
  }
})

// Update business hours
// Z-API format: { timezone, days: [{ dayOfWeek, openTime, closeTime }], mode }
router.put('/business/hours', async (req: Request, res: Response) => {
  try {
    const { timezone, days, mode } = req.body
    
    // days format: [{ dayOfWeek: "MONDAY", openTime: "08:00", closeTime: "18:00" }, ...]
    // mode: "specificHours", "alwaysOpen", "appointmentOnly"
    
    if (!days && mode !== 'alwaysOpen') {
      return res.status(400).json({ error: 'Days array is required for specificHours mode' })
    }

    const result = await zapiRequest('business/hours', 'POST', {
      timezone: timezone || 'America/Sao_Paulo',
      days: days || [],
      mode: mode || 'specificHours'
    })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Business hours update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update business hours' })
  }
})

// ==================== AUTO-REPLY MESSAGES ====================

// Get greeting message
router.get('/messages/greeting', async (_req: Request, res: Response) => {
  try {
    const result = await zapiRequest('queue/greeting-message')
    res.json(result)
  } catch (error: any) {
    console.error('[WhatsApp Business] Greeting message fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch greeting message' })
  }
})

// Update greeting message
router.put('/messages/greeting', async (req: Request, res: Response) => {
  try {
    const { message, enabled } = req.body

    const result = await zapiRequest('queue/greeting-message', 'POST', {
      message,
      enabled: enabled !== false
    })
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Greeting message update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update greeting message' })
  }
})

// Get away message
router.get('/messages/away', async (_req: Request, res: Response) => {
  try {
    const result = await zapiRequest('queue/away-message')
    res.json(result)
  } catch (error: any) {
    console.error('[WhatsApp Business] Away message fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch away message' })
  }
})

// Update away message
router.put('/messages/away', async (req: Request, res: Response) => {
  try {
    const { message, enabled, schedule } = req.body
    
    // schedule format: { startTime: "18:00", endTime: "08:00" }
    const payload: any = {
      message,
      enabled: enabled !== false
    }

    if (schedule) {
      payload.schedule = schedule
    }

    const result = await zapiRequest('queue/away-message', 'POST', payload)
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Away message update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update away message' })
  }
})

// ==================== PRIVACY ====================

// Get privacy settings
router.get('/privacy', async (_req: Request, res: Response) => {
  try {
    // Z-API may have different endpoints for each privacy setting
    const results: any = {}

    try {
      const lastSeen = await zapiRequest('privacy/settings')
      results.settings = lastSeen
    } catch (e) {
      console.log('[Z-API] Could not fetch privacy settings')
    }

    res.json(results)
  } catch (error: any) {
    console.error('[WhatsApp Business] Privacy fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch privacy settings' })
  }
})

// Update privacy settings
router.put('/privacy', async (req: Request, res: Response) => {
  try {
    const { readReceipts, groupAdd, profilePhoto, status, lastSeen } = req.body

    const payload: any = {}
    if (readReceipts !== undefined) payload.readReceipts = readReceipts
    if (groupAdd !== undefined) payload.groupAdd = groupAdd
    if (profilePhoto !== undefined) payload.profilePhoto = profilePhoto // 'all', 'contacts', 'nobody'
    if (status !== undefined) payload.status = status // 'all', 'contacts', 'nobody'  
    if (lastSeen !== undefined) payload.lastSeen = lastSeen // 'all', 'contacts', 'nobody'

    const result = await zapiRequest('privacy/settings', 'POST', payload)
    res.json({ success: true, result })
  } catch (error: any) {
    console.error('[WhatsApp Business] Privacy update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update privacy settings' })
  }
})

// ==================== CONNECTION STATUS ====================

// Get WhatsApp connection status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const result = await zapiRequest('status')
    res.json(result)
  } catch (error: any) {
    console.error('[WhatsApp Business] Status fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch status' })
  }
})

// Get phone number info
router.get('/phone', async (_req: Request, res: Response) => {
  try {
    const result = await zapiRequest('phone')
    res.json(result)
  } catch (error: any) {
    console.error('[WhatsApp Business] Phone fetch error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch phone info' })
  }
})

export default router
