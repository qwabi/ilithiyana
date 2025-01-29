'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { submitFormData } from '../actions/form-actions';

export default function AcademicsForm() {
  const [formData, setFormData] = useState({
    // Parent/Guardian Information
    parentName: '',
    parentSurname: '',
    address: '',
    cellNumber: '',
    email: '',

    // Learner Information
    learnerName: '',
    learnerSurname: '',
    dateOfBirth: '',
    schoolName: '',
    grade: '',

    // Subject Selection
    subjects: [],
    package: '',

    // Schedule
    availableDays: {
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
    timeSlots: {
      tuesday: { start: '', end: '' },
      wednesday: { start: '', end: '' },
      thursday: { start: '', end: '' },
      friday: { start: '', end: '' },
      saturday: { start: '', end: '' },
    },
  });

  const subjects = [
    'English',
    'Life Sciences',
    'Mathematics',
    'Natural Sciences',
    'Physical Sciences',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    submitFormData('academics', formData);
    console.log(formData);
    alert('Application submitted successfully! We will contact you shortly.');
  };

  return (
    <div className='w-full mx-auto bg-white  p-8'>
      <form onSubmit={handleSubmit} className='full-page-form space-y-8'>
        <Card>
          <CardHeader>
            <CardTitle>Parent/Guardian Information</CardTitle>
          </CardHeader>
          <CardContent className='form-grid gap-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='parentName'>Name(s)</Label>
                <Input
                  id='parentName'
                  value={formData.parentName}
                  onChange={(e) =>
                    setFormData({ ...formData, parentName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='parentSurname'>Surname</Label>
                <Input
                  id='parentSurname'
                  value={formData.parentSurname}
                  onChange={(e) =>
                    setFormData({ ...formData, parentSurname: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor='address'>Home Address</Label>
              <Input
                id='address'
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='cellNumber'>Cell Number</Label>
                <Input
                  id='cellNumber'
                  type='tel'
                  value={formData.cellNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, cellNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learner Information</CardTitle>
          </CardHeader>
          <CardContent className='form-grid gap-4'>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='learnerName'>Name(s)</Label>
                <Input
                  id='learnerName'
                  value={formData.learnerName}
                  onChange={(e) =>
                    setFormData({ ...formData, learnerName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='learnerSurname'>Surname</Label>
                <Input
                  id='learnerSurname'
                  value={formData.learnerSurname}
                  onChange={(e) =>
                    setFormData({ ...formData, learnerSurname: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='dateOfBirth'>Date of Birth</Label>
                <Input
                  id='dateOfBirth'
                  type='date'
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    setFormData({ ...formData, dateOfBirth: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor='schoolName'>Name of School</Label>
                <Input
                  id='schoolName'
                  value={formData.schoolName}
                  onChange={(e) =>
                    setFormData({ ...formData, schoolName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor='grade'>Current Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select grade' />
                </SelectTrigger>
                <SelectContent>
                  {[8, 9, 10, 11, 12].map((grade) => (
                    <SelectItem key={grade} value={grade.toString()}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject Selection & Package</CardTitle>
          </CardHeader>
          <CardContent className='form-grid gap-4'>
            <div className='space-y-2'>
              <Label>Subjects for Tutoring</Label>
              {subjects.map((subject) => (
                <div key={subject} className='flex items-center space-x-2'>
                  <Checkbox
                    id={subject}
                    checked={formData.subjects.includes(subject)}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        subjects: checked
                          ? [...formData.subjects, subject]
                          : formData.subjects.filter((s) => s !== subject),
                      });
                    }}
                  />
                  <Label htmlFor={subject}>{subject}</Label>
                </div>
              ))}
            </div>
            <div>
              <Label>Selected Package</Label>
              <Select
                value={formData.package}
                onValueChange={(value) =>
                  setFormData({ ...formData, package: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select package' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='package-a'>
                    Package A - R1000/month
                  </SelectItem>
                  <SelectItem value='package-b'>
                    Package B - R175/lesson
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Days & Times</CardTitle>
          </CardHeader>
          <CardContent className='form-grid'>
            <div className='space-y-4'>
              {['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(
                (day) => (
                  <div key={day} className='flex items-center space-x-4'>
                    <Checkbox
                      id={day}
                      checked={formData.availableDays[day]}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          availableDays: {
                            ...formData.availableDays,
                            [day]: checked,
                          },
                        });
                      }}
                    />
                    <Label htmlFor={day} className='capitalize w-24'>
                      {day}
                    </Label>
                    {formData.availableDays[day] && (
                      <div className='flex items-center space-x-2'>
                        <Input
                          type='time'
                          value={formData.timeSlots[day].start}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timeSlots: {
                                ...formData.timeSlots,
                                [day]: {
                                  ...formData.timeSlots[day],
                                  start: e.target.value,
                                },
                              },
                            })
                          }
                        />
                        <span>to</span>
                        <Input
                          type='time'
                          value={formData.timeSlots[day].end}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              timeSlots: {
                                ...formData.timeSlots,
                                [day]: {
                                  ...formData.timeSlots[day],
                                  end: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <div className='flex justify-end'>
          <Button type='submit' size='lg'>
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  );
}
