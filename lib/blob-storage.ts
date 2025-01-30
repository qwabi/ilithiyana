import { list } from '@vercel/blob';

export async function getSubmissions(type: string) {
  try {
    const { blobs } = await list({
      prefix: `${type}/submissions/`,
      token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
    });

    // Fetch and parse the JSON content for each blob
    const submissions = await Promise.all(
      blobs.map(async (blob) => {
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
    throw error;
  }
}
