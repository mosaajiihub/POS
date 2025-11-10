import express from 'express';
import * as infrastructureSecurityController from '../controllers/infrastructureSecurityController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// IaC Security Scanning
router.post('/scan', infrastructureSecurityController.scanIaCTemplate);

// Infrastructure Provisioning
router.post('/provision', infrastructureSecurityController.provisionInfrastructure);

// Compliance Validation
router.post('/compliance/validate', infrastructureSecurityController.validateCompliance);

// Compliance Reporting
router.post('/compliance/report', infrastructureSecurityController.generateComplianceReport);

export default router;
