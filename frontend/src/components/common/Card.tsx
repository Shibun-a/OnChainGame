import { cn } from '@/utils/format'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-gray-800 rounded-xl p-6 border border-gray-700', className)}>
      {children}
    </div>
  )
}
