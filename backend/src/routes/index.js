import { Router } from 'express';
import authRoutes from './authRoutes.js';
import labRoutes from './labRoutes.js';
import manufacturerRoutes from './manufacturerRoutes.js';
import instrumentRoutes from './instrumentRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import mpeRuleRoutes from './mpeRuleRoutes.js';
import { rootAttachmentRouter } from './attachmentRoutes.js';
import reportRoutes from './reportRoutes.js';
import verifyRoutes from './verifyRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

// Mounted Feature Routers
router.use('/auth', authRoutes);                      // Authentication & Users
router.use('/labs', labRoutes);                      // Laboratories (Public & Admin)
router.use('/manufacturers', manufacturerRoutes);    // Manufacturers (Dropdown & creation)
router.use('/instruments', instrumentRoutes);        // Instruments (CRUD & photo uploads)
router.use('/sessions', sessionRoutes);              // Sessions, Conditions, Tests, Summary & Attachments
router.use('/attachments', rootAttachmentRouter);    // Standalone Attachment operations (DELETE by ID)
router.use('/mpe-rules', mpeRuleRoutes);             // Centralized OIML MPE calculation rules
router.use('/reports', reportRoutes);                // Reports list, PDF download, and digital signatures
router.use('/verify', verifyRoutes);                 // Public QR code verification landing page
router.use('/notifications', notificationRoutes);    // User notifications

export default router;
