import { ReactNode } from 'react'

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

interface StatusBadgeProps {
  status: StatusType
  children: ReactNode
  className?: string
}

const statusStyles = {
  success: 'status-success',
  warning: 'status-warning', 
  error: 'status-error',
  info: 'status-info',
  pending: 'status-badge bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

export function StatusBadge({ status, children, className = '' }: StatusBadgeProps) {
  return (
    <span className={`${statusStyles[status]} ${className}`}>
      {children}
    </span>
  )
}