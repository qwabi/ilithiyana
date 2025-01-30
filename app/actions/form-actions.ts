'use server';

import { put } from '@vercel/blob';
import { revalidatePath } from 'next/cache';
import { putSubmission } from '@/lib/blob-storage';
import { date } from 'zod';

export async function submitFormData(type: string, formData: any) {
  const jsonData = JSON.stringify({
    ...formData,
    date: new Date().toISOString(),
  });

  try {
    const result = await putSubmission(type, jsonData);

    console.log(`Form data saved `, result);
    revalidatePath('/');
    return { success: true, message: 'Form submitted successfully!', result };
  } catch (error) {
    console.error('Error saving form data:', error);
    return {
      success: false,
      message: 'Error submitting form. Please try again.',
    };
  }
}
