import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-5 sm:space-x-6 sm:space-y-0",
        month: "space-y-5",
        caption: "flex justify-center pt-3 relative items-center",
        caption_label: "w-full text-center text-base font-medium lowercase first-letter:uppercase",
        nav: "space-x-2 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-white border border-gray-300 p-0 inline-flex items-center justify-center rounded-full shadow-sm text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        ),
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse space-y-2",
        head_row: "grid grid-cols-7 gap-3",
        head_cell:
          "text-muted-foreground rounded-md w-16 text-center font-normal text-[0.8rem] lowercase",
        row: "grid grid-cols-7 gap-2 w-full mt-3",
        cell: "h-12 w-12 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-12 w-12 p-0 font-normal inline-flex items-center justify-center rounded-xl text-sm font-medium ring-offset-background transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-transparent text-foreground ring-1 ring-black/80 hover:bg-gray-100",
        day_today: "text-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }