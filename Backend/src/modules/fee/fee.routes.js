const express = require('express');
const router = express.Router();
const feeController = require('./fee.controller');

// ==================== FEE STRUCTURE ROUTES ====================

// Create fee structure
// POST /api/admin/fee-structure
router.post('/fee-structure', feeController.createFeeStructure);

// Get all fee structures with filters
// GET /api/admin/fee-structure?department_id=1&session_id=1&semester_number=1
router.get('/fee-structure', feeController.getFeeStructures);

// Update fee structure
// PUT /api/admin/fee-structure/:id
router.put('/fee-structure/:id', feeController.updateFeeStructure);

// ==================== STUDENT FEE ASSIGNMENT ROUTES ====================

// Auto-assign fees to students
// POST /api/admin/assign-fees
// Body: { department_id, semester_id, fee_structure_id, due_date, apply_to_all, student_ids }
router.post('/assign-fees', feeController.autoAssignFees);

// Manual fee assignment
// POST /api/admin/assign-fee-manual
// Body: { student_id, semester_id, fee_structure_id, custom_amount, due_date, remarks }
router.post('/assign-fee-manual', feeController.manualAssignFee);

// ==================== VOUCHER ROUTES ====================

// Generate fee voucher
// POST /api/admin/generate-voucher
// Body: { student_id, student_fee_id, valid_days, bank_name }
router.post('/generate-voucher', feeController.generateVoucher);

// ==================== PAYMENT ROUTES ====================

// Record payment
// POST /api/admin/record-payment
// Body: { student_fee_id, amount, payment_method, transaction_id, payment_date }
router.post('/record-payment', feeController.recordPayment);

// ==================== REPORTS ROUTES ====================

// Get unpaid fees report
// GET /api/admin/fee-reports/unpaid?department_id=1&semester_id=1&status=pending&page=1&limit=50
router.get('/fee-reports/unpaid', feeController.getUnpaidFeesReport);

// Get collection report
// GET /api/admin/fee-reports/collection?start_date=2024-01-01&end_date=2024-12-31&department_id=1&group_by=date
router.get('/fee-reports/collection', feeController.getCollectionReport);

// Get fee statistics
// GET /api/admin/fee-reports/statistics?department_id=1&session_id=1
router.get('/fee-reports/statistics', feeController.getFeeStatistics);

module.exports = router;
