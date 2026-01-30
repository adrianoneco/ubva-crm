import { Router } from 'express'
import { getUsers, createUser, updateUser, deleteUser } from '../utils/users'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const users = await getUsers()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone, phoneCountry, avatar } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    const user = await createUser(name, email, password, role, phone, phoneCountry, avatar)
    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, role, password, phone, phoneCountry, avatar } = req.body
    
    const user = await updateUser(id, { name, email, role, password, phone, phoneCountry, avatar })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const deleted = await deleteUser(id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
