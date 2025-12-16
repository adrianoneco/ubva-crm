import { Router } from 'express'
import { getUsers, createUser } from '../utils/users'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const users = await getUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    const user = await createUser(name, email)
    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
