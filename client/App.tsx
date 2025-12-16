import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    // Connect to Socket.io server
    const socketConnection = io('http://localhost:3001')
    setSocket(socketConnection)

    socketConnection.on('connect', () => {
      console.log('Connected to server')
    })

    socketConnection.on('message', (data: string) => {
      setMessages((prev) => [...prev, data])
    })

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const sendMessage = () => {
    if (socket && message.trim()) {
      socket.emit('message', message)
      setMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          UBVA CRM
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Welcome to UBVA CRM</h2>
          <p className="text-gray-600 mb-4">
            A full-stack CRM application built with:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>React + TypeScript</li>
            <li>Vite</li>
            <li>Tailwind CSS</li>
            <li>Express</li>
            <li>Socket.io</li>
            <li>Drizzle ORM + PostgreSQL</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Real-time Messaging</h3>
          
          <div className="mb-4 h-48 overflow-y-auto border border-gray-300 rounded p-4">
            {messages.length === 0 ? (
              <p className="text-gray-400">No messages yet...</p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="mb-2 p-2 bg-gray-50 rounded">
                  {msg}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
