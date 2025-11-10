import { Request, Response } from 'express';
import infrastructureSecurityService from '../services/infrastructureSecurityService';
import logger from '../utils/logger';

export const scanIaCTemplate = async (req: Request, res: Response) => {
  try {
    const { id, name, type, content, version } = req.body;
    
    if (!id || !name || !type || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await infrastructureSecurityService.scanIaCTemplate({
      id,
      name,
      type,
      content,
      version: version || '1.0'
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Error scanning IaC template:', error);
    res.status(500).json({ error: 'Failed to scan IaC template' });
  }
};

export const provisionInfrastructure = async (req: Request, res: Response) => {
  try {
    const { template, policies } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: 'Template is required' });
    }
    
    const result = await infrastructureSecurityService.provisionSecureInfrastructure(
      template,
      policies || []
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error provisioning infrastructure:', error);
    res.status(500).json({ error: 'Failed to provision infrastructure' });
  }
};

export const validateCompliance = async (req: Request, res: Response) => {
  try {
    const { template, standard } = req.body;
    
    if (!template || !standard) {
      return res.status(400).json({ error: 'Template and standard are required' });
    }
    
    const result = await infrastructureSecurityService.validateCompliance(template, standard);
    
    res.json(result);
  } catch (error) {
    logger.error('Error validating compliance:', error);
    res.status(500).json({ error: 'Failed to validate compliance' });
  }
};

export const generateComplianceReport = async (req: Request, res: Response) => {
  try {
    const { templateId, standards } = req.body;
    
    if (!templateId || !standards || !Array.isArray(standards)) {
      return res.status(400).json({ error: 'Template ID and standards array are required' });
    }
    
    const report = await infrastructureSecurityService.generateComplianceReport(
      templateId,
      standards
    );
    
    res.json(report);
  } catch (error) {
    logger.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
};
