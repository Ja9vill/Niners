import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime()) && typeof date === 'string') {
    // Handle YYYY-MM specifically
    const [year, month] = date.split('-');
    if (year && month) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month)-1]} ${year}`;
    }
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatMonth(yearMonth: string): string {
  if (!yearMonth) return 'N/A';
  if (yearMonth.includes(' ')) return yearMonth; // Already formatted or old format
  
  const [year, month] = yearMonth.split('-');
  if (!month) return yearMonth;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIdx = parseInt(month) - 1;
  return months[mIdx] ? `${months[mIdx]} ${year}` : yearMonth;
}
