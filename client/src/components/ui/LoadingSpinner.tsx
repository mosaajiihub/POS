import { ReactNode } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12'
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-gray-700"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-600 animate-spin"></div>
        <div className="absolute inset-1 rounded-full border border-transparent border-t-blue-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
      </div>
      {text && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
          {text}
        </p>
      )}
    </div>
  )
}

export function LoadingSkeleton({ className = '', children }: { className?: string, children?: ReactNode }) {
  return (
    <div className={`loading-elegant ${className}`}>
      {children}
    </div>
  )
}