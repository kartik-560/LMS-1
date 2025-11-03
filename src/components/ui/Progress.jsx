import React from 'react'
import { cn } from '../../utils/cn'

const Progress = ({ 
  value, 
  max = 100, 
  size = 'md', 
  variant = 'primary',
  showLabel = true,
  className = '' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
    xl: 'h-6'
  }
  
  const variants = {
    primary: 'bg-primary-600',
    accent: 'bg-accent-600',
    secondary: 'bg-gray-600',
    danger: 'bg-red-600',
    warning: 'bg-yellow-600',
    success: 'bg-green-600'
  }
  
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizes[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default Progress
