import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { logger } from '../utils/logger'

interface WebSocketClient {
  id: string
  ws: WebSocket
  subscriptions: Set<string>
  userId?: string
}

interface WebSocketMessage {
  type: string
  event?: string
  data?: any
}

/**
 * WebSocket Service for real-time updates
 * Manages WebSocket connections and broadcasts real-time events
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null
  private clients: Map<string, WebSocketClient> = new Map()
  private static instance: WebSocketService

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    })

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId()
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set()
      }

      this.clients.set(clientId, client)
      logger.info(`WebSocket client connected: ${clientId}`)

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        data: { clientId }
      })

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          this.handleMessage(clientId, message)
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error)
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid message format' }
          })
        }
      })

      ws.on('close', () => {
        this.clients.delete(clientId)
        logger.info(`WebSocket client disconnected: ${clientId}`)
      })

      ws.on('error', (error) => {
        logger.error(`WebSocket client error (${clientId}):`, error)
        this.clients.delete(clientId)
      })
    })

    logger.info('WebSocket server initialized')
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'subscribe':
        if (message.event) {
          client.subscriptions.add(message.event)
          logger.info(`Client ${clientId} subscribed to ${message.event}`)
          this.sendToClient(clientId, {
            type: 'subscribed',
            data: { event: message.event }
          })
        }
        break

      case 'unsubscribe':
        if (message.event) {
          client.subscriptions.delete(message.event)
          logger.info(`Client ${clientId} unsubscribed from ${message.event}`)
          this.sendToClient(clientId, {
            type: 'unsubscribed',
            data: { event: message.event }
          })
        }
        break

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: new Date().toISOString() }
        })
        break

      default:
        logger.warn(`Unknown message type: ${message.type}`)
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: 'Unknown message type' }
        })
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message))
      } catch (error) {
        logger.error(`Failed to send message to client ${clientId}:`, error)
      }
    }
  }

  // Broadcast methods for different event types
  broadcastStockUpdate(productId: string, newStock: number, oldStock: number): void {
    this.broadcast('stock_update', {
      productId,
      newStock,
      oldStock,
      timestamp: new Date().toISOString()
    })
  }

  broadcastSaleCompleted(transactionId: string, amount: number, items: any[]): void {
    this.broadcast('sale_completed', {
      transactionId,
      amount,
      items,
      timestamp: new Date().toISOString()
    })
  }

  broadcastLowStockAlert(productId: string, productName: string, currentStock: number, minStock: number): void {
    this.broadcast('low_stock_alert', {
      productId,
      productName,
      currentStock,
      minStock,
      timestamp: new Date().toISOString()
    })
  }

  broadcastUserActivity(userId: string, action: string): void {
    this.broadcast('user_activity', {
      userId,
      action,
      timestamp: new Date().toISOString()
    })
  }

  broadcastDashboardUpdate(metrics: any): void {
    this.broadcast('dashboard_update', {
      metrics,
      timestamp: new Date().toISOString()
    })
  }

  private broadcast(eventType: string, data: any): void {
    const message: WebSocketMessage = {
      type: eventType,
      data
    }

    let sentCount = 0
    this.clients.forEach((client) => {
      if (client.subscriptions.has(eventType) && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message))
          sentCount++
        } catch (error) {
          logger.error(`Failed to broadcast to client ${client.id}:`, error)
        }
      }
    })

    logger.info(`Broadcasted ${eventType} to ${sentCount} clients`)
  }

  // Get connection statistics
  getStats(): { totalClients: number; subscriptions: Record<string, number> } {
    const subscriptions: Record<string, number> = {}
    
    this.clients.forEach((client) => {
      client.subscriptions.forEach((event) => {
        subscriptions[event] = (subscriptions[event] || 0) + 1
      })
    })

    return {
      totalClients: this.clients.size,
      subscriptions
    }
  }

  // Close all connections
  close(): void {
    this.clients.forEach((client) => {
      client.ws.close()
    })
    this.clients.clear()
    
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
    
    logger.info('WebSocket service closed')
  }
}

export const webSocketService = WebSocketService.getInstance()