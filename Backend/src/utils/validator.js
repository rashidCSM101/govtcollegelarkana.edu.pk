// Validation utility functions

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate CNIC (Pakistani National ID)
const isValidCNIC = (cnic) => {
  // Format: XXXXX-XXXXXXX-X or without dashes
  const cnicRegex = /^[0-9]{5}-?[0-9]{7}-?[0-9]$/;
  return cnicRegex.test(cnic);
};

// Validate phone number (Pakistani format)
const isValidPhone = (phone) => {
  // Format: 03XX-XXXXXXX or +923XXXXXXXXX
  const phoneRegex = /^(03[0-9]{2}-?[0-9]{7}|\+92[0-9]{10})$/;
  return phoneRegex.test(phone);
};

// Validate password strength
const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate date format (YYYY-MM-DD)
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Validate roll number format
const isValidRollNo = (rollNo) => {
  // Customize based on your college roll number format
  const rollNoRegex = /^[A-Z]{2,4}-?\d{2,4}-?\d{2,4}$/i;
  return rollNoRegex.test(rollNo);
};

// Sanitize string input
const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

// Validate required fields
const validateRequired = (data, requiredFields) => {
  const errors = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate numeric value
const isValidNumber = (value, min = null, max = null) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== null && num < min) return false;
  if (max !== null && num > max) return false;
  return true;
};

// Validate percentage
const isValidPercentage = (value) => {
  return isValidNumber(value, 0, 100);
};

// Validate marks
const isValidMarks = (obtained, total) => {
  return isValidNumber(obtained, 0, total) && isValidNumber(total, 1);
};

module.exports = {
  isValidEmail,
  isValidCNIC,
  isValidPhone,
  isStrongPassword,
  isValidDate,
  isValidRollNo,
  sanitizeString,
  validateRequired,
  isValidNumber,
  isValidPercentage,
  isValidMarks
};
