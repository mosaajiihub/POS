import express from 'express';
import * as networkSecurityController from '../controllers/networkSecurityController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Network Segmentation
router.post('/segments', networkSecurityController.createNetworkSegment);
router.post('/segments/micro', networkSecurityController.implementMicroSegmentation);

// Firewall Management
router.post('/security-groups', networkSecurityController.createSecurityGroup);
router.put('/firewall/rules', networkSecurityController.updateFirewallRules);

// Traffic Monitoring
router.post('/traffic/analyze', networkSecurityController.analyzeTraffic);

// Intrusion Detection
router.post('/intrusion/detect', networkSecurityController.detectIntrusion);
router.post('/intrusion/prevention/config', networkSecurityController.configureIPS);

export default router;
