import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'

// Import routes
import usersRouter from './routes/users'
import contactsRouter from './routes/contacts'
import authRouter from './routes/auth'
import kanbanRouter from './routes/kanban'
import schedulesRouter from './routes/schedules'
import appointmentsRouter from './routes/appointments'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use('/data', express.static(path.join(process.cwd(), 'data')))


// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/users', usersRouter)
app.use('/api/contacts', contactsRouter)
app.use('/api/auth', authRouter)
app.use('/api/kanban', kanbanRouter)
app.use('/api/schedules', schedulesRouter)
app.use('/api/agendamento', appointmentsRouter)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('message', (data) => {
    console.log('Received message:', data)
    // Broadcast to all clients
    io.emit('message', `Server received: ${data}`)
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
