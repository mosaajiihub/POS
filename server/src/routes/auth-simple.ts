import { Router } from 'express'
import { AuthController, authValidation } from '../controllers/authController-simple'

const router = Router()

// Health check
router.get('/health', AuthController.health)

// Login
router.post('/login', authValidation.login, AuthController.login)

export default router