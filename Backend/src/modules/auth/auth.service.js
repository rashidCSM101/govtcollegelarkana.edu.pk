const bcrypt = require('bcrypt');
const { query, getClient } = require('../../config/database');
const { generateToken, verifyToken } = require('../../middleware/auth.middleware');
const { sendEmail, emailTemplates } = require('../../utils/email');
const { generatePassword, generateToken: generateRandomToken } = require('../../utils/helper');
const { isValidEmail, isStrongPassword, validateRequired } = require('../../utils/validator');

const SALT_ROUNDS = 10;

class AuthService {
  
  // ==================== REGISTRATION ====================
  
  async register(userData) {
    const { email, password, role, name, ...additionalData } = userData;
    
    // Validate required fields
    const validation = validateRequired({ email, password, role, name }, ['email', 'password', 'role', 'name']);
    if (!validation.isValid) {
      throw { status: 400, message: validation.errors.join(', ') };
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
      throw { status: 400, message: 'Invalid email format' };
    }
    
    // Validate password strength
    if (!isStrongPassword(password)) {
      throw { status: 400, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' };
    }
    
    // Check valid roles
    const validRoles = ['student', 'teacher', 'admin', 'staff'];
    if (!validRoles.includes(role)) {
      throw { status: 400, message: 'Invalid role. Must be: student, teacher, admin, or staff' };
    }
    
    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      throw { status: 409, message: 'Email already registered' };
    }
    
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      
      // Generate verification token
      const verificationToken = generateRandomToken(32);
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create user
      const userResult = await client.query(
        `INSERT INTO users (email, password, role, is_active, verification_token, verification_expiry, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, email, role, is_active, created_at`,
        [email.toLowerCase(), hashedPassword, role, false, verificationToken, verificationExpiry]
      );
      
      const user = userResult.rows[0];
      
      // Create role-specific profile
      let profileId;
      
      if (role === 'student') {
        const studentResult = await client.query(
          `INSERT INTO students (user_id, name, roll_no, father_name, phone, status)
           VALUES ($1, $2, $3, $4, $5, 'active')
           RETURNING id`,
          [user.id, name, additionalData.roll_no || null, additionalData.father_name || null, additionalData.phone || null]
        );
        profileId = studentResult.rows[0].id;
      } else if (role === 'teacher') {
        const teacherResult = await client.query(
          `INSERT INTO teachers (user_id, name, phone, designation)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [user.id, name, additionalData.phone || null, additionalData.designation || null]
        );
        profileId = teacherResult.rows[0].id;
      } else if (role === 'admin') {
        const adminResult = await client.query(
          `INSERT INTO admins (user_id, name, role)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [user.id, name, additionalData.admin_role || 'admin']
        );
        profileId = adminResult.rows[0].id;
      }
      
      await client.query('COMMIT');
      
      // Send verification email (non-blocking)
      this.sendVerificationEmail(email, name, verificationToken).catch(console.error);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: name,
          profileId: profileId
        },
        message: 'Registration successful. Please check your email to verify your account.'
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // ==================== LOGIN ====================
  
  async login(email, password) {
    if (!email || !password) {
      throw { status: 400, message: 'Email and password are required' };
    }
    
    // Get user with profile info
    const result = await query(
      `SELECT u.id, u.email, u.password, u.role, u.is_active, u.email_verified,
              CASE 
                WHEN u.role = 'student' THEN s.name
                WHEN u.role = 'teacher' THEN t.name
                WHEN u.role = 'admin' THEN a.name
              END as name,
              CASE 
                WHEN u.role = 'student' THEN s.id
                WHEN u.role = 'teacher' THEN t.id
                WHEN u.role = 'admin' THEN a.id
              END as profile_id,
              CASE 
                WHEN u.role = 'student' THEN s.photo
                WHEN u.role = 'teacher' THEN t.photo
              END as photo
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id AND u.role = 'student'
       LEFT JOIN teachers t ON u.id = t.user_id AND u.role = 'teacher'
       LEFT JOIN admins a ON u.id = a.user_id AND u.role = 'admin'
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      throw { status: 401, message: 'Invalid email or password' };
    }
    
    const user = result.rows[0];
    
    // Check if account is active
    if (!user.is_active) {
      throw { status: 403, message: 'Account is inactive. Please verify your email or contact admin.' };
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw { status: 401, message: 'Invalid email or password' };
    }
    
    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      profileId: user.profile_id
    };
    
    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRandomToken(64);
    
    // Store refresh token (optional - for refresh token functionality)
    await query(
      `UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2`,
      [refreshToken, user.id]
    );
    
    // Log activity
    await this.logActivity(user.id, 'LOGIN', 'auth', { email: user.email });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        profileId: user.profile_id,
        photo: user.photo
      },
      accessToken,
      refreshToken,
      redirectUrl: this.getRedirectUrl(user.role)
    };
  }
  
  // ==================== LOGOUT ====================
  
  async logout(userId) {
    await query(
      `UPDATE users SET refresh_token = NULL WHERE id = $1`,
      [userId]
    );
    
    await this.logActivity(userId, 'LOGOUT', 'auth', {});
    
    return { message: 'Logged out successfully' };
  }
  
  // ==================== EMAIL VERIFICATION ====================
  
  async verifyEmail(token) {
    const result = await query(
      `SELECT id, email, verification_expiry FROM users 
       WHERE verification_token = $1 AND email_verified = false`,
      [token]
    );
    
    if (result.rows.length === 0) {
      throw { status: 400, message: 'Invalid or expired verification token' };
    }
    
    const user = result.rows[0];
    
    if (new Date() > new Date(user.verification_expiry)) {
      throw { status: 400, message: 'Verification token has expired. Please request a new one.' };
    }
    
    await query(
      `UPDATE users SET email_verified = true, is_active = true, 
       verification_token = NULL, verification_expiry = NULL 
       WHERE id = $1`,
      [user.id]
    );
    
    return { message: 'Email verified successfully. You can now login.' };
  }
  
  async resendVerificationEmail(email) {
    const result = await query(
      `SELECT u.id, u.email_verified,
              CASE 
                WHEN u.role = 'student' THEN s.name
                WHEN u.role = 'teacher' THEN t.name
                WHEN u.role = 'admin' THEN a.name
              END as name
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN admins a ON u.id = a.user_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      throw { status: 404, message: 'Email not found' };
    }
    
    const user = result.rows[0];
    
    if (user.email_verified) {
      throw { status: 400, message: 'Email is already verified' };
    }
    
    const verificationToken = generateRandomToken(32);
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await query(
      `UPDATE users SET verification_token = $1, verification_expiry = $2 WHERE id = $3`,
      [verificationToken, verificationExpiry, user.id]
    );
    
    await this.sendVerificationEmail(email, user.name, verificationToken);
    
    return { message: 'Verification email sent successfully' };
  }
  
  // ==================== PASSWORD MANAGEMENT ====================
  
  async forgotPassword(email) {
    const result = await query(
      `SELECT u.id,
              CASE 
                WHEN u.role = 'student' THEN s.name
                WHEN u.role = 'teacher' THEN t.name
                WHEN u.role = 'admin' THEN a.name
              END as name
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN admins a ON u.id = a.user_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    // Don't reveal if email exists
    if (result.rows.length === 0) {
      return { message: 'If the email exists, a password reset link will be sent.' };
    }
    
    const user = result.rows[0];
    const resetToken = generateRandomToken(32);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await query(
      `UPDATE users SET reset_token = $1, reset_expiry = $2 WHERE id = $3`,
      [resetToken, resetExpiry, user.id]
    );
    
    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const emailContent = emailTemplates.resetPassword(user.name, resetLink);
    
    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
    });
    
    return { message: 'If the email exists, a password reset link will be sent.' };
  }
  
  async resetPassword(token, newPassword) {
    if (!isStrongPassword(newPassword)) {
      throw { status: 400, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' };
    }
    
    const result = await query(
      `SELECT id, reset_expiry FROM users WHERE reset_token = $1`,
      [token]
    );
    
    if (result.rows.length === 0) {
      throw { status: 400, message: 'Invalid or expired reset token' };
    }
    
    const user = result.rows[0];
    
    if (new Date() > new Date(user.reset_expiry)) {
      throw { status: 400, message: 'Reset token has expired. Please request a new one.' };
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await query(
      `UPDATE users SET password = $1, reset_token = NULL, reset_expiry = NULL WHERE id = $2`,
      [hashedPassword, user.id]
    );
    
    await this.logActivity(user.id, 'PASSWORD_RESET', 'auth', {});
    
    return { message: 'Password reset successfully. You can now login with your new password.' };
  }
  
  async changePassword(userId, currentPassword, newPassword) {
    if (!isStrongPassword(newPassword)) {
      throw { status: 400, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' };
    }
    
    const result = await query('SELECT password FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      throw { status: 404, message: 'User not found' };
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValidPassword) {
      throw { status: 401, message: 'Current password is incorrect' };
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
    
    await this.logActivity(userId, 'PASSWORD_CHANGE', 'auth', {});
    
    return { message: 'Password changed successfully' };
  }
  
  // ==================== REFRESH TOKEN ====================
  
  async refreshToken(refreshToken) {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.is_active,
              CASE 
                WHEN u.role = 'student' THEN s.id
                WHEN u.role = 'teacher' THEN t.id
                WHEN u.role = 'admin' THEN a.id
              END as profile_id
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN admins a ON u.id = a.user_id
       WHERE u.refresh_token = $1`,
      [refreshToken]
    );
    
    if (result.rows.length === 0) {
      throw { status: 401, message: 'Invalid refresh token' };
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      throw { status: 403, message: 'Account is inactive' };
    }
    
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      profileId: user.profile_id
    };
    
    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRandomToken(64);
    
    await query(
      `UPDATE users SET refresh_token = $1 WHERE id = $2`,
      [newRefreshToken, user.id]
    );
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
  
  // ==================== PROFILE MANAGEMENT ====================
  
  async getProfile(userId, role) {
    let queryText;
    
    if (role === 'student') {
      queryText = `
        SELECT u.id as user_id, u.email, u.role, u.created_at, u.last_login,
               s.id, s.name, s.roll_no, s.father_name, s.dob, s.cnic, s.phone, 
               s.address, s.photo, s.batch, s.semester, s.status,
               d.name as department_name, d.code as department_code
        FROM users u
        JOIN students s ON u.id = s.user_id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE u.id = $1
      `;
    } else if (role === 'teacher') {
      queryText = `
        SELECT u.id as user_id, u.email, u.role, u.created_at, u.last_login,
               t.id, t.name, t.cnic, t.phone, t.designation, t.qualification, 
               t.experience, t.photo,
               d.name as department_name, d.code as department_code
        FROM users u
        JOIN teachers t ON u.id = t.user_id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE u.id = $1
      `;
    } else if (role === 'admin') {
      queryText = `
        SELECT u.id as user_id, u.email, u.role as user_role, u.created_at, u.last_login,
               a.id, a.name, a.role as admin_role
        FROM users u
        JOIN admins a ON u.id = a.user_id
        WHERE u.id = $1
      `;
    } else {
      throw { status: 400, message: 'Invalid role' };
    }
    
    const result = await query(queryText, [userId]);
    
    if (result.rows.length === 0) {
      throw { status: 404, message: 'Profile not found' };
    }
    
    return result.rows[0];
  }
  
  async updateProfile(userId, role, profileData) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');
      
      if (role === 'student') {
        const { name, father_name, dob, cnic, phone, address } = profileData;
        await client.query(
          `UPDATE students SET 
           name = COALESCE($1, name),
           father_name = COALESCE($2, father_name),
           dob = COALESCE($3, dob),
           cnic = COALESCE($4, cnic),
           phone = COALESCE($5, phone),
           address = COALESCE($6, address)
           WHERE user_id = $7`,
          [name, father_name, dob, cnic, phone, address, userId]
        );
      } else if (role === 'teacher') {
        const { name, cnic, phone, qualification, experience } = profileData;
        await client.query(
          `UPDATE teachers SET 
           name = COALESCE($1, name),
           cnic = COALESCE($2, cnic),
           phone = COALESCE($3, phone),
           qualification = COALESCE($4, qualification),
           experience = COALESCE($5, experience)
           WHERE user_id = $6`,
          [name, cnic, phone, qualification, experience, userId]
        );
      } else if (role === 'admin') {
        const { name } = profileData;
        await client.query(
          `UPDATE admins SET name = COALESCE($1, name) WHERE user_id = $2`,
          [name, userId]
        );
      }
      
      await client.query('COMMIT');
      
      await this.logActivity(userId, 'PROFILE_UPDATE', 'auth', profileData);
      
      return await this.getProfile(userId, role);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async uploadPhoto(userId, role, photoPath) {
    let tableName;
    
    if (role === 'student') {
      tableName = 'students';
    } else if (role === 'teacher') {
      tableName = 'teachers';
    } else {
      throw { status: 400, message: 'Photo upload not supported for this role' };
    }
    
    await query(
      `UPDATE ${tableName} SET photo = $1 WHERE user_id = $2`,
      [photoPath, userId]
    );
    
    await this.logActivity(userId, 'PHOTO_UPLOAD', 'auth', { photo: photoPath });
    
    return { 
      message: 'Photo uploaded successfully',
      photo: photoPath
    };
  }
  
  // ==================== HELPER METHODS ====================
  
  async getCurrentUser(userId) {
    const result = await query(
      `SELECT u.id, u.email, u.role, u.is_active, u.last_login,
              CASE 
                WHEN u.role = 'student' THEN s.name
                WHEN u.role = 'teacher' THEN t.name
                WHEN u.role = 'admin' THEN a.name
              END as name,
              CASE 
                WHEN u.role = 'student' THEN s.id
                WHEN u.role = 'teacher' THEN t.id
                WHEN u.role = 'admin' THEN a.id
              END as profile_id,
              CASE 
                WHEN u.role = 'student' THEN s.photo
                WHEN u.role = 'teacher' THEN t.photo
              END as photo
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN admins a ON u.id = a.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw { status: 404, message: 'User not found' };
    }
    
    return result.rows[0];
  }
  
  getRedirectUrl(role) {
    const redirects = {
      admin: '/admin/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      staff: '/staff/dashboard'
    };
    return redirects[role] || '/dashboard';
  }
  
  async sendVerificationEmail(email, name, token) {
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - Government College Larkana',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a5f7a;">Verify Your Email</h2>
          <p>Dear ${name},</p>
          <p>Thank you for registering at Government College Larkana.</p>
          <p>Please click the button below to verify your email address:</p>
          <a href="${verificationLink}" style="display: inline-block; background-color: #1a5f7a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>Government College Larkana</p>
        </div>
      `
    });
  }
  
  async logActivity(userId, action, module, details) {
    try {
      await query(
        `INSERT INTO activity_logs (user_id, action, module, details, timestamp)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, action, module, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }
}

module.exports = new AuthService();
