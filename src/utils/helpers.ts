export function formatMoonTime(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today ${timeString}`;
  } else if (isYesterday) {
    return `Yesterday ${timeString}`;
  } else {
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const timeDifference = date.getTime() - now.getTime();
  const hoursDifference = Math.round(timeDifference / (1000 * 60 * 60)); // Convert milliseconds to hours

  if (hoursDifference === 0) {
    const minutesDifference = Math.round(timeDifference / (1000 * 60));
    if (minutesDifference === 0) {
      return 'just now';
    } else if (minutesDifference > 0) {
      return `in ${minutesDifference} minutes`;
    } else {
      return `${Math.abs(minutesDifference)} minutes ago`;
    }
  } else if (hoursDifference > 0) {
    return `in ${hoursDifference} hours`;
  } else {
    return `${Math.abs(hoursDifference)} hours ago`;
  }
}

export function formatTimeToHHMM(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
