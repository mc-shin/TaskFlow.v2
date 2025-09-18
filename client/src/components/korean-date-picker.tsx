import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

interface KoreanDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function KoreanDatePicker({ 
  value, 
  onChange, 
  placeholder = "날짜 선택", 
  className 
}: KoreanDatePickerProps) {
  const [open, setOpen] = useState(false);
  
  // Parse the date string (expected format: YYYY-MM-DD, but handle ISO format too)
  const parseDate = (dateString: string) => {
    // Handle ISO format by taking only the date part
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    return parse(dateOnly, 'yyyy-MM-dd', new Date());
  };
  
  const selectedDate = value ? parseDate(value) : undefined;
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Format as YYYY-MM-DD for backend compatibility
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
      setOpen(false);
    }
  };

  // Format display text in Korean style
  const displayText = selectedDate 
    ? format(selectedDate, 'M월 d일', { locale: ko })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-6 text-xs px-2",
            !selectedDate && "text-muted-foreground",
            className
          )}
          data-testid={`button-date-picker`}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={ko}
          initialFocus
          className="rounded-md border"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "day-outside text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}