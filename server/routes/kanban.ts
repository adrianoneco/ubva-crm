import { Router } from 'express'
import { getKanbanUsers, createKanbanUser, updateKanbanUser, deleteKanbanUser } from '../utils/kanban'
import { io } from '../index'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const users = await getKanbanUsers()
    res.json(users)
  } catch (error) {
    console.error('Get kanban users error:', error)
    res.status(500).json({ error: 'Failed to fetch kanban users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, avatar, phone, email, role, kanbanStep } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const user = await createKanbanUser({ name, avatar, phone, email, role, kanbanStep })
    // Emit socket event to notify all clients
    io.emit('kanban-update')
    console.log('[Kanban] Created user, broadcasting update')
    res.status(201).json(user)
  } catch (error) {
    console.error('Create kanban user error:', error)
    res.status(500).json({ error: 'Failed to create kanban user' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id
    const { name, avatar, phone, email, role, kanbanStep } = req.body

    const user = await updateKanbanUser(id, { name, avatar, phone, email, role, kanbanStep })
    // Emit socket event to notify all clients
    console.log('[Kanban] Broadcasting update to', io.engine.clientsCount, 'connected clients')
    io.emit('kanban-update')
    console.log('[Kanban] Updated user', id, ', event emitted')
    res.json(user)
  } catch (error) {
    console.error('Update kanban user error:', error)
    res.status(500).json({ error: 'Failed to update kanban user' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id
    await deleteKanbanUser(id)
    // Emit socket event to notify all clients
    io.emit('kanban-update')
    console.log('[Kanban] Deleted user', id, ', broadcasting update')
    res.status(204).send()
  } catch (error) {
    console.error('Delete kanban user error:', error)
    res.status(500).json({ error: 'Failed to delete kanban user' })
  }
})

export default router
