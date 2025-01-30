async function blobFetch(method: string, body?: any) {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ilithiyana.vercel.app';
  const url = new URL('/api/blob-proxy', baseUrl);
  console.log('fetching from url', url);
  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    console.log(`HTTP error! status: ${response.status}`);
    return [];
  }

  return response.json();
}

export async function getSubmissions(type: string) {
  try {
    console.log(`Fetching ${type} submissions`);
    const { blobs } = await blobFetch('GET');
    const filteredBlobs = blobs.filter((blob: any) =>
      blob.pathname.startsWith(`${type}/submissions/`)
    );

    // Fetch and parse the JSON content for each blob
    const submissions = await Promise.all(
      filteredBlobs.map(async (blob: any) => {
        const response = await fetch(blob.url);
        const data = await response.json();

        return {
          id: blob.pathname.split('/').pop()?.replace('.json', ''),
          ...data,
        };
      })
    );

    return submissions;
  } catch (error) {
    console.error(`Error fetching ${type} submissions:`, error);
    return [];
  }
}

export async function putSubmission(type: string, data: any) {
  const name = `${type}/submissions/${Date.now()}`;
  const options = {
    token: process.env.NEXT_PUBLIC_BLOB_ST__READ_WRITE_TOKEN,
    access: 'public',
  };

  try {
    const result = await blobFetch('POST', {
      name,
      data,
      options,
    });
    return result;
  } catch (error) {
    console.error(`Error putting ${type} submission:`, error);
    throw error;
  }
}

export async function deleteSubmission(url: string) {
  try {
    const result = await blobFetch('DELETE', { url });
    return result;
  } catch (error) {
    console.error(`Error deleting submission:`, error);
    throw error;
  }
}
