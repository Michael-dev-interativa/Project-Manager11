import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

const RadioGroup = React.forwardRef(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('flex gap-2', className)} {...props}>
    {children}
  </RadioGroupPrimitive.Root>
))
RadioGroup.displayName = 'RadioGroup'

const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item ref={ref} className={cn('w-4 h-4 rounded-full border', className)} {...props} />
))
RadioGroupItem.displayName = 'RadioGroupItem'

export { RadioGroup, RadioGroupItem }