// Priority mapping utility functions

export const PRIORITY_LABELS = {
  "1": "높음",    // 긴급하고 중요한 일
  "2": "낮음",    // 긴급하지만 중요하지 않은 일  
  "3": "중요",    // 긴급하지 않지만 중요한 일
  "4": "미정",    // 긴급하지도 중요하지도 않은 일
} as const;

export const LEGACY_PRIORITY_LABELS = {
  "높음": "높음",
  "중간": "중요", 
  "낮음": "낮음",
} as const;

/**
 * Convert numeric or legacy priority value to display label
 * @param priority - Priority value ("1", "2", "3", "4" or legacy "높음", "중간", "낮음")
 * @returns Display label for priority
 */
export function mapPriorityToLabel(priority: string | null | undefined): string {
  if (!priority) return "미정";
  
  // Handle numeric priorities (new system)
  if (priority in PRIORITY_LABELS) {
    return PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS];
  }
  
  // Handle legacy priorities (old system)
  if (priority in LEGACY_PRIORITY_LABELS) {
    return LEGACY_PRIORITY_LABELS[priority as keyof typeof LEGACY_PRIORITY_LABELS];
  }
  
  // Default fallback
  return "미정";
}

/**
 * Get badge variant based on priority value
 * @param priority - Priority value ("1", "2", "3", "4" or legacy)
 * @returns Badge variant
 */
export function getPriorityBadgeVariant(priority: string | null | undefined): "destructive" | "default" | "secondary" | "outline" {
  const label = mapPriorityToLabel(priority);
  
  switch (label) {
    case "높음": return "destructive";  // Red for high priority
    case "중요": return "default";      // Blue for important
    case "낮음": return "secondary";    // Gray for low priority  
    case "미정": return "outline";      // Light for undefined
    default: return "outline";
  }
}

/**
 * Get priority color class for styling
 * @param priority - Priority value
 * @returns Tailwind color class
 */
export function getPriorityColorClass(priority: string | null | undefined): string {
  const label = mapPriorityToLabel(priority);
  
  switch (label) {
    case "높음": return "text-red-600 dark:text-red-400";
    case "중요": return "text-blue-600 dark:text-blue-400";
    case "낮음": return "text-gray-400 dark:text-gray-500";  // 밝은 회색
    case "미정": return "text-gray-700 dark:text-gray-300";  // 어두운 회색
    default: return "text-gray-600 dark:text-gray-400";
  }
}