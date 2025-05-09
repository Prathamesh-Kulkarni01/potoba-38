require('dotenv').config({ path: `${__dirname}/../.env` }); // Explicitly specify the .env file path
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const WebSocket = require('ws');
// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
// Import other routes as needed

// Connect to MongoDB
connectDB();

const app = express();

// Debugging CORS
app.use((req, res, next) => {
  console.log(`CORS Debug: Origin - ${req.headers.origin}`);
  console.log(`Auth Header: ${req.headers.authorization ? 'Present' : 'Not present'}`);
  next();
});

// Middleware
// List of allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'https://potoba-pos.netlify.app',
  'https://*.potoba-pos.netlify.app', // Allow all subdomains
  'https://potoba-38.onrender.com',
  process.env.CORS_ORIGIN, // e.g., https://your-prod-domain.com
].filter(Boolean); // Remove undefined/null values

// Enhanced CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
        return pattern.test(origin);
      }
      return allowedOrigin === origin;
    })) {
      callback(null, true);
    } else {
      console.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurants', require('./routes/restaurants'));
app.use('/api/sync', require('./routes/sync')); // Add the new sync route
app.use('/api/restaurants/:restaurantId/menu', require('./routes/menu')); // Add menu route
app.use('/api/restaurants/:restaurantId/tables', tableRoutes);
app.use('/api/restaurants/:restaurantId/orders', orderRoutes);
app.use('/api/restaurants/:restaurantId/categories', require('./routes/categories'));
// Add other routes here

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Sync databases endpoint - easier to access without authentication during development
app.post('/api/sync-databases', async (req, res) => {
  try {
    const syncController = require('./controllers/sync');
    await syncController.syncDatabases(req, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 5000;
const MONGO_URI = process.env.MONGO_URI || 'Unknown MongoDB URI';

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 8081 });

wss.on('connection', (ws) => {
  console.log('Frontend connected to WebSocket');
  
  // Send connection details to the frontend
  ws.send(`Backend connected successfully to port ${PORT} and MongoDB at ${MONGO_URI}`);

  ws.on('close', () => {
    console.log('Frontend disconnected from WebSocket');
    // Notify all clients about the disconnection
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('Frontend disconnected from WebSocket');
      }
    });
  });
});

function logToFrontend(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message); 
    }
  });
}

// Export WebSocket for use in other modules
module.exports.wss = wss;
module.exports.logToFrontend = logToFrontend;

// Example: Log a message to the frontend
logToFrontend('Backend is running');

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));