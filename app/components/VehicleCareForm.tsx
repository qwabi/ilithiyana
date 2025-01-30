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
import { toast } from 'react-hot-toast';

export default function VehicleCareForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    fleetSize: '',
    serviceFrequency: '',
    additionalNotes: '',
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
    submitFormData('vehicleCare', formData);
    console.log(formData);
    toast.success('Form submitted successfully!');
    setFormData({
      companyName: '',
      contactPerson: '',
      email: '',
      phone: '',
      fleetSize: '',
      serviceFrequency: '',
      additionalNotes: '',
    });
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
          <Label htmlFor='fleetSize'>Number of Vehicles in Fleet</Label>
          <Input
            id='fleetSize'
            name='fleetSize'
            type='number'
            value={formData.fleetSize}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor='serviceFrequency'>Preferred Service Frequency</Label>
          <Select
            name='serviceFrequency'
            value={formData.serviceFrequency}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, serviceFrequency: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder='Select service frequency' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='weekly'>Weekly</SelectItem>
              <SelectItem value='monthly'>Monthly</SelectItem>
              <SelectItem value='onDemand'>On-Demand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor='additionalNotes'>Additional Notes/Requests</Label>
          <Textarea
            id='additionalNotes'
            name='additionalNotes'
            value={formData.additionalNotes}
            onChange={handleChange}
          />
        </div>
      </div>
      <Button type='submit'>Submit</Button>
    </form>
  );
}
