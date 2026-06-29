import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './db.js';
import mongoose from 'mongoose';

// Routes imports
import authRoutes from './routes/authRoutes.js';
import logRoutes from './routes/logRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';
import caseRoutes from './routes/caseRoutes.js';

// Services
import { initAnalyzer } from './services/analyzer.js';
import { initHostCollector } from './services/hostCollector.js';

// Seed Helpers
import User from './models/User.js';
import Rule from './models/Rule.js';

dotenv.config();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  path: '/ws'
});

app.locals.io = io;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'sandbox-memory-mode',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/rules', ruleRoutes);
app.use('/api/v1/cases', caseRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('🔌 New client connected to SIEM gateway:', socket.id);
  socket.emit('connected', { message: 'Connected to SIEM real-time correlation feed' });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Seed Database with Default Admins & Correlation Rules
const seedDatabase = async () => {
  if (mongoose.connection.readyState !== 1) return;

  try {
    // 1. Seed Default Users
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding default users...');
      
      const admin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123', // Will be hashed via pre-save hook
        role: 'Admin'
      });
      await admin.save();

      const analyst = new User({
        username: 'analyst',
        email: 'analyst@example.com',
        password: 'analyst123',
        role: 'Analyst'
      });
      await analyst.save();

      const viewer = new User({
        username: 'viewer',
        email: 'viewer@example.com',
        password: 'viewer123',
        role: 'Viewer'
      });
      await viewer.save();
      
      console.log('✅ Default users seeded successfully (Passwords: admin123, analyst123, viewer123)');
    }

    // 2. Seed Correlation Rules
    const ruleCount = await Rule.countDocuments();
    if (ruleCount === 0) {
      console.log('🌱 Seeding default correlation rules...');
      const defaultRules = [
        {
          name: 'Brute Force Attack Detected',
          description: 'Detects multiple failed logins from the same source IP in a short period',
          conditionField: 'action',
          conditionOperator: 'equals',
          conditionValue: 'failed_login',
          thresholdCount: 3,
          thresholdWindowMinutes: 1,
          severity: 'critical',
          mitreTactic: 'Credential Access',
          active: true
        },
        {
          name: 'Suspicious Port Scan',
          description: 'Detects access attempts to multiple closed ports from a single source',
          conditionField: 'action',
          conditionOperator: 'equals',
          conditionValue: 'port_scan',
          thresholdCount: 5,
          thresholdWindowMinutes: 2,
          severity: 'high',
          mitreTactic: 'Discovery',
          active: true
        },
        {
          name: 'Potential Data Exfiltration',
          description: 'Detects large size file download actions by non-admin accounts',
          conditionField: 'action',
          conditionOperator: 'equals',
          conditionValue: 'data_download',
          thresholdCount: 1,
          thresholdWindowMinutes: 5,
          severity: 'high',
          mitreTactic: 'Exfiltration',
          active: true
        },
        {
          name: 'Unauthorized Administrative Action',
          description: 'Detects administrative commands run by non-authorized users',
          conditionField: 'action',
          conditionOperator: 'equals',
          conditionValue: 'unauthorized_sudo',
          thresholdCount: 1,
          thresholdWindowMinutes: 1,
          severity: 'medium',
          mitreTactic: 'Privilege Escalation',
          active: true
        }
      ];
      await Rule.insertMany(defaultRules);
      console.log('✅ Default correlation rules seeded successfully');
    }
  } catch (error) {
    console.error('❌ Database seeding error:', error);
  }
};

// Start Server function
const startServer = async () => {
  // Connect database
  await connectDB();
  
  // Seed Database if connected
  await seedDatabase();

  // Initialize rules engine analyzer with socket.io instance
  initAnalyzer(io);

  // Start real-time host log collector (Windows Security Events, TCP, Processes)
  initHostCollector(io);

  const PORT = process.env.PORT || 3001;

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the conflicting process or set PORT to a free port in your environment.`);
      process.exit(1);
    }
    console.error('Server error:', error);
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`🚀 SIEM API Gateway running on https://siem-td7e.onrender.com:${PORT}`);
    console.log(`📡 Real-time WebSocket server ready on /ws`);
  });
};

startServer();
