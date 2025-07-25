import { HomeAssistant } from '../../ha';

type IMAGE = {
  url: string;
  name: string;
};

export async function uploadImage(hass: HomeAssistant, file: File): Promise<IMAGE | null> {
  console.log('Uploading image:', file.name);

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await hass.fetchWithAuth('/api/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.error('Failed to upload image, response status:', response.status);
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    console.log('Response data:', data);

    const imageId = data.id;
    if (!imageId) {
      console.error('Image ID is missing in the response');
      return null;
    }

    return {
      url: `/api/image/serve/${imageId}/original`,
      name: file.name,
    };
  } catch (err) {
    console.error('Error during image upload:', err);
    throw err;
  }
}
