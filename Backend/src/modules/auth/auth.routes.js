const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middleware/auth.middleware');
const { uploadSingle } = require('../../middleware/upload.middleware');

// ==================== PUBLIC ROUTES ====================

// Registration
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Password management (public)
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// ==================== PROTECTED ROUTES ====================

// Logout (requires auth)
router.post('/logout', authMiddleware, authController.logout);

// Change password (requires auth)
router.post('/change-password', authMiddleware, authController.changePassword);

// Profile management (requires auth)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/upload-photo', authMiddleware, uploadSingle('profile'), authController.uploadPhoto);

// Current user info (requires auth)
router.get('/me', authMiddleware, authController.getCurrentUser);

// Verify token validity (requires auth)
router.post('/verify-token', authMiddleware, authController.verifyToken);

module.exports = router;
