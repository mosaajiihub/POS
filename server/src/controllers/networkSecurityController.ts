import { Request, Response } from 'express';
import networkSecurityService from '../services/networkSecurityService';
import logger from '../utils/logger';

export const createNetworkSegment = async (req: Request, res: Response) => {
  try {
    const segment = await networkSecurityService.createNetworkSegment(req.body);
    res.json(segment);
  } catch (error) {
    logger.error('Error creating network segment:', error);
    res.status(500).json({ error: 'Failed to create network segment' });
  }
};

export const implementMicroSegmentation = async (req: Request, res: Response) => {
  try {
    const { segments } = req.body;
    
    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'Segments array is required' });
    }
    
    const result = await networkSecurityService.implementMicroSegmentation(segments);
    res.json(result);
  } catch (error) {
    logger.error('Error implementing micro-segmentation:', error);
    res.status(500).json({ error: 'Failed to implement micro-segmentation' });
  }
};

export const createSecurityGroup = async (req: Request, res: Response) => {
  try {
    const group = await networkSecurityService.createSecurityGroup(req.body);
    res.json(group);
  } catch (error) {
    logger.error('Error creating security group:', error);
    res.status(500).json({ error: 'Failed to create security group' });
  }
};

export const updateFirewallRules = async (req: Request, res: Response) => {
  try {
    const { groupId, rules } = req.body;
    
    if (!groupId || !rules) {
      return res.status(400).json({ error: 'Group ID and rules are required' });
    }
    
    await networkSecurityService.updateFirewallRules(groupId, rules);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating firewall rules:', error);
    res.status(500).json({ error: 'Failed to update firewall rules' });
  }
};

export const analyzeTraffic = async (req: Request, res: Response) => {
  try {
    const { start, end } = req.body;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const analysis = await networkSecurityService.analyzeNetworkTraffic({
      start: new Date(start),
      end: new Date(end)
    });
    
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing traffic:', error);
    res.status(500).json({ error: 'Failed to analyze traffic' });
  }
};

export const detectIntrusion = async (req: Request, res: Response) => {
  try {
    const { sourceIp, targetIp, pattern } = req.body;
    
    if (!sourceIp || !targetIp || !pattern) {
      return res.status(400).json({ error: 'Source IP, target IP, and pattern are required' });
    }
    
    const alert = await networkSecurityService.detectIntrusion(sourceIp, targetIp, pattern);
    res.json(alert);
  } catch (error) {
    logger.error('Error detecting intrusion:', error);
    res.status(500).json({ error: 'Failed to detect intrusion' });
  }
};

export const configureIPS = async (req: Request, res: Response) => {
  try {
    const { autoBlock, threshold } = req.body;
    
    await networkSecurityService.implementIntrusionPrevention({
      autoBlock: autoBlock !== false,
      threshold: threshold || 5
    });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error configuring IPS:', error);
    res.status(500).json({ error: 'Failed to configure IPS' });
  }
};
