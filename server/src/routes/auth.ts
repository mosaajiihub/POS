import { Router } from 'express'
import { AuthController, authValidation } from '../controllers/authController'
import { 
  requireAuth, 
  requireAdmin, 
  authRateLimit, 
  validateSession,
  auditLog 
} from '../middleware/auth'
import { validateRequest, limitRequestSize, validateContentType } from '../middleware/inputValidation'

const router = Router()

/**
 * Authentication Routes
 */

// Public routes (no authentication required)
router.post('/login', 
  limitRequestSize(1024 * 1024), // 1MB limit
  validateContentType(['application/json']),
  validateRequest({ sanitize: true }),
  authRateLimit(),
  authValidation.login,
  auditLog('LOGIN'),
  AuthController.login
)

router.post('/complete-mfa-login',
  limitRequestSize(1024 * 1024), // 1MB limit
  validateContentType(['application/json']),
  validateRequest({ sanitize: true }),
  authRateLimit(),
  authValidation.completeMFALogin,
  auditLog('COMPLETE_MFA_LOGIN'),
  AuthController.completeMFALogin
)

router.post('/verify-otp',
  limitRequestSize(1024 * 1024), // 1MB limit
  validateContentType(['application/json']),
  validateRequest({ sanitize: true }),
  authRateLimit(),
  authValidation.verifyOTP,
  auditLog('VERIFY_OTP'),
  AuthController.verifyOTP
)

router.post('/refresh-token',
  authValidation.refreshToken,
  auditLog('REFRESH_TOKEN'),
  AuthController.refreshToken
)

// Protected routes (authentication required)
router.get('/profile',
  requireAuth,
  AuthController.getProfile
)

router.get('/validate',
  requireAuth,
  AuthController.validateToken
)

router.post('/logout',
  requireAuth,
  validateSession(),
  auditLog('LOGOUT'),
  AuthController.logout
)

router.post('/logout-all',
  requireAuth,
  auditLog('LOGOUT_ALL'),
  AuthController.logoutAll
)

router.post('/change-password',
  requireAuth,
  validateSession(),
  authValidation.changePassword,
  auditLog('CHANGE_PASSWORD'),
  AuthController.changePassword
)

// Admin only routes
router.post('/register',
  requireAdmin,
  authValidation.register,
  auditLog('REGISTER_USER', 'users'),
  AuthController.register
)

router.post('/generate-otp',
  requireAdmin,
  authValidation.generateOTP,
  auditLog('GENERATE_OTP'),
  AuthController.generateOTP
)

export default router