'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';

export async function submitFormData(type: string, formData: any) {
  const jsonData = JSON.stringify(formData);

  try {
    const blob = await put(`${type}/submissions/${Date.now()}.json`, jsonData, {
      contentType: 'application/json',
      token: process.env.NEXT_PUBLIC_BLOB_ST_READ_WRITE_TOKEN,
    });

    console.log(`Form data saved to ${blob.url}`);
    revalidatePath('/');
    return { success: true, message: 'Form submitted successfully!' };
  } catch (error) {
    console.error('Error saving form data:', error);
    return {
      success: false,
      message: 'Error submitting form. Please try again.',
    };
  }
}
