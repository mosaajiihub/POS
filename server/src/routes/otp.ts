import { Router } from 'express'
import { OTPController, otpValidation } from '../controllers/otpController'
import { requireAdmin, auditLog } from '../middleware/auth'

const router = Router()

/**
 * OTP Management Routes
 * All routes require admin authentication
 */

// Generate and deliver OTP
router.post('/generate',
  requireAdmin,
  otpValidation.generateOTP,
  auditLog('GENERATE_OTP'),
  OTPController.generateOTP
)

// Verify OTP (public endpoint for user activation)
router.post('/verify',
  otpValidation.verifyOTP,
  auditLog('VERIFY_OTP'),
  OTPController.verifyOTP
)

// Get OTP status
router.get('/status/:userId',
  requireAdmin,
  OTPController.getOTPStatus
)

// Resend existing OTP
router.post('/resend',
  requireAdmin,
  otpValidation.resendOTP,
  auditLog('RESEND_OTP'),
  OTPController.resendOTP
)

// Cancel OTP
router.post('/cancel',
  requireAdmin,
  otpValidation.cancelOTP,
  auditLog('CANCEL_OTP'),
  OTPController.cancelOTP
)

// Cleanup expired OTPs (admin utility)
router.post('/cleanup',
  requireAdmin,
  auditLog('CLEANUP_EXPIRED_OTP'),
  OTPController.cleanupExpired
)

export default router