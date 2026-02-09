// Load environment variables first
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const { privateAuth, adminAuth } = require('./middleware/auth')

// Database
const db = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './data.sqlite',
  },
  useNullAsDefault: true,
})

// Configure Express
const app = express()

// Security headers
app.use(helmet({ contentSecurityPolicy: false }))

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : []
app.use(
  cors(
    corsOrigins.length > 0
      ? { origin: corsOrigins, credentials: true }
      : undefined
  )
)

app.use(express.static(path.join(__dirname, 'html')))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Home Route
app.get('/', (req, res) => {
  res.status(200).send('API operational')
})

// Login HTML Route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'))
})

// Auth middleware for route groups
app.use('/api/private', privateAuth(db))
app.use('/api/admin', adminAuth())

// Test routes
app.get('/api/private/test', (req, res) => {
  res.status(200).json({ success: 'Gültigker Token' })
})

app.get('/api/public/test', (req, res) => {
  res.status(200).json({ success: 'API operational' })
})

app.get('/api/admin/test', (req, res) => {
  res.status(200).json({ success: 'Gültige Adminrechte' })
})

// Routes
require('./routes/auth')(app, db)
require('./services/backup')(app, db)
require('./routes/poolparty')(app, db)

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const port = process.env.PORT || 3000
const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`)
  server.close(() => {
    db.destroy().then(() => {
      console.log('Server shut down.')
      process.exit(0)
    })
  })
  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
