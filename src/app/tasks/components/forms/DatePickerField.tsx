import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/app/tasks/constants";

interface DatePickerFieldProps {
  date: string;
  onDateChange: (date: Date | undefined) => void;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  date,
  onDateChange,
  label,
  icon = <CalendarDays className="w-3 h-3 text-gray-600" />,
  variant = "default",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "compact") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={`h-auto p-1 hover:bg-white/20 rounded ${className}`}
          >
            <div className="flex items-center gap-1">
              {icon}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-600">{label}:</span>
                <span className="text-xs font-medium">{formatDate(date)}</span>
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate);
              setIsOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left border-green-300 hover:border-green-500"
          >
            <div className="flex items-center gap-2">
              {icon}
              <span>{formatDate(date)}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate);
              setIsOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
