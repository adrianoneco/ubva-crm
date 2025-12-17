import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'

const app = express()
const httpServer = createServer(app)
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
})

// Import routes AFTER io is created and exported
import usersRouter from './routes/users'
import contactsRouter from './routes/contacts'
import authRouter from './routes/auth'
import kanbanRouter from './routes/kanban'
import schedulesRouter from './routes/schedules'
import appointmentsRouter from './routes/appointments'
import broadcastsRouter from './routes/broadcasts'

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use('/data', express.static(path.join(process.cwd(), 'data')))


// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    socketConnections: io.engine.clientsCount
  })
})

// Test endpoint to trigger socket event
app.post('/api/test-socket', (_req, res) => {
  console.log('Test socket endpoint called, emitting test event')
  io.emit('kanban-update')
  res.json({ message: 'Socket event emitted' })
})

// API Routes
app.use('/api/users', usersRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/auth', authRouter)
app.use('/api/kanban', kanbanRouter)
app.use('/api/schedules', schedulesRouter)
app.use('/api/agendamento', appointmentsRouter)
app.use('/api/broadcast-lists', broadcastsRouter)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id, 'from', socket.handshake.address)
  console.log('   Origin:', socket.handshake.headers.origin)
  console.log('   Transport:', socket.conn.transport.name)

  socket.on('message', (data) => {
    console.log('Received message:', data)
    // Broadcast to all clients
    io.emit('message', `Server received: ${data}`)
  })

  socket.on('kanban-changed', () => {
    console.log('Kanban changed by', socket.id, '- broadcasting to all clients')
    // Broadcast to ALL clients (including sender for confirmation)
    io.emit('kanban-update')
  })

  socket.on('schedule-changed', () => {
    console.log('Schedule changed by', socket.id, '- broadcasting to all clients')
    // Broadcast to ALL clients (including sender for confirmation)
    io.emit('schedule-update')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Socket.io server ready`)
})
