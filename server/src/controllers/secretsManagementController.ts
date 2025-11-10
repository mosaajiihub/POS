import { Request, Response } from 'express';
import secretsManagementService from '../services/secretsManagementService';
import logger from '../utils/logger';

export const storeSecret = async (req: Request, res: Response) => {
  try {
    const { name, value, type, expiresAt, rotationPolicy, metadata } = req.body;

    if (!name || !value || !type) {
      return res.status(400).json({ error: 'Name, value, and type are required' });
    }

    const secret = await secretsManagementService.storeSecret(name, value, type, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      rotationPolicy,
      metadata
    });

    // Don't return the encrypted value
    const { value: _, ...secretWithoutValue } = secret;

    res.json(secretWithoutValue);
  } catch (error) {
    logger.error('Error storing secret:', error);
    res.status(500).json({ error: 'Failed to store secret' });
  }
};

export const retrieveSecret = async (req: Request, res: Response) => {
  try {
    const { secretId } = req.params;
    const userId = (req as any).user?.id || 'anonymous';

    if (!secretId) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    const value = await secretsManagementService.retrieveSecret(secretId, userId);

    res.json({ value });
  } catch (error) {
    logger.error('Error retrieving secret:', error);
    
    if ((error as Error).message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if ((error as Error).message === 'Secret not found') {
      return res.status(404).json({ error: 'Secret not found' });
    }
    
    res.status(500).json({ error: 'Failed to retrieve secret' });
  }
};

export const deleteSecret = async (req: Request, res: Response) => {
  try {
    const { secretId } = req.params;
    const userId = (req as any).user?.id || 'anonymous';

    if (!secretId) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    await secretsManagementService.deleteSecret(secretId, userId);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting secret:', error);
    
    if ((error as Error).message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.status(500).json({ error: 'Failed to delete secret' });
  }
};

export const rotateSecret = async (req: Request, res: Response) => {
  try {
    const { secretId } = req.params;
    const { newValue } = req.body;

    if (!secretId) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    if (!newValue) {
      return res.status(400).json({ error: 'New value is required' });
    }

    const secret = await secretsManagementService.rotateSecret(secretId, newValue);

    // Don't return the encrypted value
    const { value: _, ...secretWithoutValue } = secret;

    res.json(secretWithoutValue);
  } catch (error) {
    logger.error('Error rotating secret:', error);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
};

export const checkRotation = async (req: Request, res: Response) => {
  try {
    const secrets = await secretsManagementService.checkRotationNeeded();

    // Don't return encrypted values
    const secretsWithoutValues = secrets.map(({ value, ...rest }) => rest);

    res.json({ needsRotation: secretsWithoutValues });
  } catch (error) {
    logger.error('Error checking rotation:', error);
    res.status(500).json({ error: 'Failed to check rotation' });
  }
};

export const autoRotate = async (req: Request, res: Response) => {
  try {
    const result = await secretsManagementService.autoRotateSecrets();
    res.json(result);
  } catch (error) {
    logger.error('Error auto-rotating secrets:', error);
    res.status(500).json({ error: 'Failed to auto-rotate secrets' });
  }
};

export const getAccessLogs = async (req: Request, res: Response) => {
  try {
    const { secretId } = req.params;

    if (!secretId) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    const logs = await secretsManagementService.getSecretAccessLogs(secretId);
    res.json({ logs });
  } catch (error) {
    logger.error('Error getting access logs:', error);
    res.status(500).json({ error: 'Failed to get access logs' });
  }
};

export const scanForLeaks = async (req: Request, res: Response) => {
  try {
    const { directory } = req.body;

    if (!directory) {
      return res.status(400).json({ error: 'Directory is required' });
    }

    const result = await secretsManagementService.scanForSecretLeaks(directory);
    res.json(result);
  } catch (error) {
    logger.error('Error scanning for leaks:', error);
    res.status(500).json({ error: 'Failed to scan for leaks' });
  }
};
