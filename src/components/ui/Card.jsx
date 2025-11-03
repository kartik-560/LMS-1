import React from 'react'
import { cn } from '../../utils/cn'

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-gray-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </div>
  )
}

const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3
      className={cn(
        'text-lg font-semibold text-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
}

Card.Header = CardHeader
Card.Content = CardContent
Card.Title = CardTitle

export default Card