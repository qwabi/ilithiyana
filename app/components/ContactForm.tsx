'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { submitContactMessage } from '../actions/contact-actions';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
});

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await submitContactMessage(formData);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success('Message sent successfully!');

      setFormData({ name: '', email: '', phone: '', message: '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-[0.5px] border-[hsl(214,32%,91%)] bg-white p-6 shadow-none md:p-8 ${jakarta.className}`}
    >
      <h2
        className={`${dmSerif.className} mb-6 text-[20px] text-[hsl(210,100%,25%)]`}
      >
        Send a message
      </h2>

      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            name='name'
            value={formData.name}
            onChange={handleChange}
            required
            className='mt-1'
          />
        </div>
        <div>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            value={formData.email}
            onChange={handleChange}
            required
            className='mt-1'
          />
        </div>
        <div className='md:col-span-2'>
          <Label htmlFor='phone'>Phone</Label>
          <Input
            id='phone'
            name='phone'
            type='tel'
            value={formData.phone}
            onChange={handleChange}
            className='mt-1'
          />
        </div>
        <div className='md:col-span-2'>
          <Label htmlFor='message'>Message</Label>
          <Textarea
            id='message'
            name='message'
            value={formData.message}
            onChange={handleChange}
            rows={5}
            required
            className='mt-1'
          />
        </div>
      </div>

      <Button
        type='submit'
        disabled={submitting}
        className='mt-6 w-full rounded-full bg-primary text-white hover:bg-primary/90 md:w-auto md:px-10'
      >
        {submitting ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Sending…
          </>
        ) : (
          'Send message'
        )}
      </Button>
    </form>
  );
}
