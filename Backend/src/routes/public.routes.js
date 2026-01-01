const express = require('express');
const router = express.Router();
const certificateController = require('../modules/certificate/certificate.controller');

// ==================== CERTIFICATE VERIFICATION ROUTES (Public - No Auth Required) ====================

// Verify certificate by certificate number
router.get('/verify-certificate/:certNo', certificateController.verifyCertificate.bind(certificateController));

// Verify certificate by verification code
router.get('/verify-certificate-code/:code', certificateController.verifyCertificateByCode.bind(certificateController));

module.exports = router;
