const authService = require('./auth.service');

class AuthController {
  
  // ==================== REGISTRATION ====================
  
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.user
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== LOGIN ====================
  
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          redirectUrl: result.redirectUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== LOGOUT ====================
  
  async logout(req, res, next) {
    try {
      const result = await authService.logout(req.user.userId);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== EMAIL VERIFICATION ====================
  
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      const result = await authService.verifyEmail(token);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationEmail(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== PASSWORD MANAGEMENT ====================
  
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const result = await authService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== REFRESH TOKEN ====================
  
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== PROFILE MANAGEMENT ====================
  
  async getProfile(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.userId, req.user.role);
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateProfile(req, res, next) {
    try {
      const profile = await authService.updateProfile(req.user.userId, req.user.role, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
  
  async uploadPhoto(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No photo file provided'
        });
      }
      
      const photoPath = `/uploads/profiles/${req.file.filename}`;
      const result = await authService.uploadPhoto(req.user.userId, req.user.role, photoPath);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: { photo: result.photo }
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== CURRENT USER ====================
  
  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.userId);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
  
  // ==================== VERIFY TOKEN ====================
  
  async verifyToken(req, res, next) {
    try {
      // If we reach here, token is valid (middleware already verified)
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
