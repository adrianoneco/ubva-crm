import { Router } from 'express'
import { getBroadcastLists, createBroadcastList, deleteBroadcastList } from '../utils/broadcasts'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const lists = await getBroadcastLists()
    res.json(lists)
  } catch (err) {
    console.error('Failed to get broadcast lists', err)
    res.status(500).json({ error: 'Failed to get broadcast lists' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, description, contacts } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const list = await createBroadcastList(name, description || null, Array.isArray(contacts) ? contacts : [])
    res.status(201).json(list)
  } catch (err) {
    console.error('Failed to create broadcast list', err)
    res.status(500).json({ error: 'Failed to create broadcast list' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await deleteBroadcastList(id)
    res.status(204).send()
  } catch (err) {
    console.error('Failed to delete broadcast list', err)
    res.status(500).json({ error: 'Failed to delete broadcast list' })
  }
})

export default router
