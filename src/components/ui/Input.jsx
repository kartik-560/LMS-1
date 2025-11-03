import React from 'react'
import { cn } from '../../utils/cn'

const Input = React.forwardRef(({ 
  label, 
  error, 
  leftElement,
  rightElement,
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftElement}
        <input
          ref={ref}
          className={cn(
            'w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500',
            className
          )}
          {...props}
        />
        {rightElement}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
