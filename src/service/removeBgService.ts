/**
 * Service to call Remove.bg API for professional AI background removal
 */
export async function removeBackground(imageSrc: string): Promise<string> {
  const apiKey = (import.meta.env.VITE_REMOVE_BG_API_KEY as string | undefined) || 'PAQpVLbWqj1oaEfr91RXwe4Z';

  if (!apiKey) {
    throw new Error('Remove.bg API Key is missing in environment variables.');
  }

  // Convert Base64 / Blob URL into a Blob
  const res = await fetch(imageSrc);
  const blob = await res.blob();

  const formData = new FormData();
  formData.append('image_file', blob, 'avatar.png');
  formData.append('size', 'auto');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { errors?: Array<{ title?: string }> } | null;
    const message = errorData?.errors?.[0]?.title || `Remove.bg API error (Status ${response.status})`;
    throw new Error(message);
  }

  const resultBlob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(resultBlob);
  });
}
