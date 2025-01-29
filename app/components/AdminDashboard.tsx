'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FormSubmission {
  id: string;
  type: string;
  data: any;
  createdAt: string;
}

export function AdminDashboard() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    } else {
      fetchSubmissions();
    }
  }, [router]);

  const fetchSubmissions = async () => {
    // In a real application, you would fetch this data from your API
    // For this example, we'll use mock data
    const mockSubmissions: FormSubmission[] = [
      {
        id: '1',
        type: 'Academics',
        data: { name: 'John Doe', grade: '10' },
        createdAt: '2023-05-01T12:00:00Z',
      },
      {
        id: '2',
        type: 'Vehicle Care',
        data: { companyName: 'ABC Corp', fleetSize: '50' },
        createdAt: '2023-05-02T14:30:00Z',
      },
      {
        id: '3',
        type: 'Infrastructure',
        data: { projectType: 'Civil Engineering', budget: '$1M' },
        createdAt: '2023-05-03T09:15:00Z',
      },
    ];
    setSubmissions(mockSubmissions);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <div className='container mx-auto py-8'>
      <Card>
        <CardHeader className='flex justify-between items-center'>
          <CardTitle>Admin Dashboard</CardTitle>
          <Button onClick={handleLogout}>Logout</Button>
        </CardHeader>
        <CardContent>
          <h2 className='text-2xl font-bold mb-4'>Form Submissions</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.id}</TableCell>
                  <TableCell>{submission.type}</TableCell>
                  <TableCell>{JSON.stringify(submission.data)}</TableCell>
                  <TableCell>
                    {new Date(submission.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
