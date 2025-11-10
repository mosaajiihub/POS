import { Router } from 'express'
import { MFAController, mfaValidation } from '../controllers/mfaController'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

/**
 * @route POST /api/mfa/setup
 * @desc Setup MFA for authenticated user
 * @access Private
 */
router.post('/setup',
  requireAuth,
  MFAController.setupMFA
)

/**
 * @route POST /api/mfa/verify-setup
 * @desc Verify MFA setup with TOTP token
 * @access Private
 */
router.post('/verify-setup',
  requireAuth,
  mfaValidation.verifySetup,
  MFAController.verifyMFASetup
)

/**
 * @route POST /api/mfa/verify
 * @desc Verify MFA token during login
 * @access Public
 */
router.post('/verify',
  mfaValidation.verifyMFA,
  MFAController.verifyMFA
)

/**
 * @route POST /api/mfa/disable
 * @desc Disable MFA for authenticated user
 * @access Private
 */
router.post('/disable',
  requireAuth,
  mfaValidation.disableMFA,
  MFAController.disableMFA
)

/**
 * @route POST /api/mfa/backup-codes
 * @desc Generate new backup codes
 * @access Private
 */
router.post('/backup-codes',
  requireAuth,
  mfaValidation.generateBackupCodes,
  MFAController.generateBackupCodes
)

/**
 * @route GET /api/mfa/status
 * @desc Get MFA status for authenticated user
 * @access Private
 */
router.get('/status',
  requireAuth,
  MFAController.getMFAStatus
)

/**
 * @route POST /api/mfa/reset
 * @desc Reset MFA for a user (admin only)
 * @access Admin
 */
router.post('/reset',
  requireAdmin,
  mfaValidation.resetMFA,
  MFAController.resetMFA
)

export default router