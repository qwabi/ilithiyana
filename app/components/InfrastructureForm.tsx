'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { submitFormData } from '../actions/form-actions';

export default function InfrastructureForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    serviceType: '',
    projectDescription: '',
    preferredDate: '',
    preferredTime: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitFormData('infrastructure', formData);
    console.log(formData);
    alert('Form submitted successfully!');
  };

  return (
    <form onSubmit={handleSubmit} className='full-page-form space-y-4'>
      <div className='form-grid'>
        <div>
          <Label htmlFor='companyName'>Company Name</Label>
          <Input
            id='companyName'
            name='companyName'
            value={formData.companyName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='contactPerson'>Contact Person</Label>
          <Input
            id='contactPerson'
            name='contactPerson'
            value={formData.contactPerson}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='email'>Email Address</Label>
          <Input
            id='email'
            name='email'
            type='email'
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='phone'>Phone Number</Label>
          <Input
            id='phone'
            name='phone'
            type='tel'
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='serviceType'>Type of Service Required</Label>
          <Select
            name='serviceType'
            value={formData.serviceType}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, serviceType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='Select service type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='civilEngineering'>
                Civil & Structural Engineering
              </SelectItem>
              <SelectItem value='projectManagement'>
                Project Management
              </SelectItem>
              <SelectItem value='waterInfrastructure'>
                Water Infrastructure
              </SelectItem>
              <SelectItem value='smmeDevelopment'>
                SMME Development & Training
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor='projectDescription'>
            Brief Description of Project/Requirements
          </Label>
          <Textarea
            id='projectDescription'
            name='projectDescription'
            value={formData.projectDescription}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='preferredDate'>Preferred Date for Consultation</Label>
          <Input
            id='preferredDate'
            name='preferredDate'
            type='date'
            value={formData.preferredDate}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='preferredTime'>Preferred Time for Consultation</Label>
          <Input
            id='preferredTime'
            name='preferredTime'
            type='time'
            value={formData.preferredTime}
            onChange={handleChange}
            required
          />
        </div>
      </div>
      <Button type='submit'>Submit</Button>
    </form>
  );
}
