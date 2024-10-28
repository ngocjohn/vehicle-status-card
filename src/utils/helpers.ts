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
    return date.toLocaleString([], { day: 'numeric', hour: '2-digit', minute: '2-digit', month: 'short' });
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

export function isEmpty(input: any): boolean {
  if (Array.isArray(input)) {
    // Check if array is empty
    return input.length === 0;
  } else if (input && typeof input === 'object') {
    // Check if object is empty
    return Object.keys(input).length === 0;
  } else {
    // For other types (null, undefined, etc.), treat as not empty
    return true;
  }
}

export async function getAddressFromOpenStreet(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      // Extract address components from the response
      const address = {
        streetNumber: data.address.house_number || '', // Retrieve street number
        streetName: data.address.road || '',
        sublocality: data.address.suburb || data.address.village || '',
        city: data.address.city || data.address.town || '',
        state: data.address.state || data.address.county || '',
        country: data.address.country || '',
        postcode: data.address.postcode || '',
      };

      return address;
    } else {
      throw new Error('Failed to fetch address OpenStreetMap');
    }
  } catch (error) {
    // console.error('Error fetching address:', error);
    return;
  }
}

export async function getAddressFromGoggle(lat: number, lon: number, apiKey: string) {
  console.log('getAddressFromGoggle');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK') {
      const addressComponents = data.results[0].address_components;
      const adress = {
        streetNumber: '',
        streetName: '',
        sublocality: '',
        city: '',
      };

      addressComponents.forEach((component) => {
        if (component.types.includes('street_number')) {
          adress.streetNumber = component.long_name;
        }
        if (component.types.includes('route')) {
          adress.streetName = component.long_name;
        }
        if (component.types.includes('sublocality')) {
          adress.sublocality = component.short_name;
        }

        if (component.types.includes('locality')) {
          adress.city = component.long_name;
        }
        // Sometimes city might be under 'administrative_area_level_2' or 'administrative_area_level_1'
        if (!adress.city && component.types.includes('administrative_area_level_2')) {
          adress.city = component.short_name;
        }
        if (!adress.city && component.types.includes('administrative_area_level_1')) {
          adress.city = component.short_name;
        }
      });

      return adress;
    } else {
      throw new Error('No results found');
    }
  } catch (error) {
    console.error('Error fetching address:', error);
    return;
  }
}
