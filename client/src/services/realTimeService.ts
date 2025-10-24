/**
 * Real-time Service - WebSocket connection management
 * Handles real-time updates for inventory, sales, and other live data
 */

interface RealTimeEvent {
  type: string
  data: any
  timestamp: Date
}

interface RealTimeSubscription {
  id: string
  event: string
  callback: (data: any) => void
}

class RealTimeService {
  private ws: WebSocket | null = null
  private subscriptions: Map<string, RealTimeSubscription> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private url: string

  constructor() {
    this.url = process.env.REACT_APP_WS_URL || 'ws://localhost:5000'
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        return
      }

      this.isConnecting = true

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          
          // Resubscribe to all events
          this.subscriptions.forEach(subscription => {
            this.sendMessage({
              type: 'subscribe',
              event: subscription.event
            })
          })

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: RealTimeEvent = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('WebSocket disconnected')
          this.isConnecting = false
          this.ws = null
          this.scheduleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.subscriptions.clear()
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(message: RealTimeEvent): void {
    // Find subscriptions for this event type
    this.subscriptions.forEach(subscription => {
      if (subscription.event === message.type) {
        try {
          subscription.callback(message.data)
        } catch (error) {
          console.error('Error in subscription callback:', error)
        }
      }
    })
  }

  subscribe(event: string, callback: (data: any) => void): string {
    const id = `${event}_${Date.now()}_${Math.random()}`
    
    const subscription: RealTimeSubscription = {
      id,
      event,
      callback
    }

    this.subscriptions.set(id, subscription)

    // Send subscription message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage({
        type: 'subscribe',
        event
      })
    }

    return id
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      this.subscriptions.delete(subscriptionId)

      // Send unsubscribe message if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'unsubscribe',
          event: subscription.event
        })
      }
    }
  }

  // Convenience methods for common events
  onStockUpdate(callback: (data: { productId: string; newStock: number; oldStock: number }) => void): string {
    return this.subscribe('stock_update', callback)
  }

  onSaleCompleted(callback: (data: { transactionId: string; amount: number; items: any[] }) => void): string {
    return this.subscribe('sale_completed', callback)
  }

  onLowStockAlert(callback: (data: { productId: string; productName: string; currentStock: number; minStock: number }) => void): string {
    return this.subscribe('low_stock_alert', callback)
  }

  onUserActivity(callback: (data: { userId: string; action: string; timestamp: Date }) => void): string {
    return this.subscribe('user_activity', callback)
  }

  // Send real-time events (for testing or manual triggers)
  emitStockUpdate(productId: string, newStock: number, oldStock: number): void {
    this.sendMessage({
      type: 'stock_update',
      data: { productId, newStock, oldStock }
    })
  }

  emitSaleCompleted(transactionId: string, amount: number, items: any[]): void {
    this.sendMessage({
      type: 'sale_completed',
      data: { transactionId, amount, items }
    })
  }
}

// Create singleton instance
export const realTimeService = new RealTimeService()

// Auto-connect when service is imported (in production)
if (process.env.NODE_ENV === 'production') {
  realTimeService.connect().catch(error => {
    console.error('Failed to connect to real-time service:', error)
  })
}

export default realTimeService