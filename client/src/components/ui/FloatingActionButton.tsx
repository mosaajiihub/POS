import { ReactNode } from 'react'
import { Plus } from 'lucide-react'

interface FloatingActionButtonProps {
  onClick: () => void
  icon?: ReactNode
  className?: string
  tooltip?: string
}

export function FloatingActionButton({ 
  onClick, 
  icon = <Plus className="w-6 h-6" />, 
  className = '',
  tooltip = 'Quick Action'
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`floating-action group ${className}`}
      title={tooltip}
    >
      <div className="relative z-10 transition-transform duration-200 group-hover:rotate-90">
        {icon}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
    </button>
  )
}