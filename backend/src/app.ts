import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import examinationRoutes from './routes/examinationRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import allocationRoutes from './routes/allocationRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import { seedService } from './services/seedService.js';

// Auto-seed mockup dataset on initial server spin-up
seedService.runSeed().catch(err => console.error('[AutoSeed error]', err));

export const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/examinations', examinationRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/allocations', allocationRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/staff', staffRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Express Error Handler]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
};

export const app = createApp();
