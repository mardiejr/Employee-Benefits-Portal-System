// utils/dateOverride.ts

// This function returns either the overridden date from the environment 
// or the actual current date if no override exists
export function getCurrentDate(): Date {
  // Check if there's a date override in the environment
  const dateOverride = process.env.DATE_OVERRIDE;
  
  if (dateOverride) {
    try {
      // Try to parse the override date
      const overrideDate = new Date(dateOverride);
      
      // Ensure it's a valid date
      if (!isNaN(overrideDate.getTime())) {
        console.log(`[DEV] Using overridden date: ${overrideDate.toISOString()}`);
        return overrideDate;
      }
    } catch (error) {
      console.error("Invalid DATE_OVERRIDE format", error);
    }
  }
  
  // Return the actual current date if no valid override exists
  return new Date();
}

// Helper to get the current date as an ISO string
export function getCurrentDateISO(): string {
  return getCurrentDate().toISOString();
}

// Helper to check if a date is in the current month
export function isCurrentMonth(date: Date): boolean {
  const currentDate = getCurrentDate();
  return (
    date.getFullYear() === currentDate.getFullYear() &&
    date.getMonth() === currentDate.getMonth()
  );
}

// Helper to check if a date is in the past
export function isPastDate(date: Date): boolean {
  return date < getCurrentDate();
}

// Check if a date is today
export function isToday(date: Date): boolean {
  const currentDate = getCurrentDate();
  return (
    date.getDate() === currentDate.getDate() &&
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear()
  );
}