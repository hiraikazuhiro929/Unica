import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
    max?: number
  }
>(({ className, value = 0, max = 100, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-blue-600 transition-all duration-300 ease-in-out rounded-full"
      style={{ width: `${Math.min(Math.max((value || 0), 0), max)}%` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }