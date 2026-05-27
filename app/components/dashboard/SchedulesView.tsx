'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, List } from 'lucide-react';
import { ScheduleCalendarView } from '@/app/components/dashboard/ScheduleCalendarView';
import { ScheduleListView } from '@/app/components/dashboard/ScheduleListView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ScheduleListItem } from '@/lib/parent-dashboard-sections';

export type ScheduleViewMode = 'list' | 'calendar';

type Props = {
  items: ScheduleListItem[];
  defaultView?: ScheduleViewMode;
};

export function SchedulesView({ items, defaultView = 'list' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramView = searchParams.get('view');
  const initialView: ScheduleViewMode =
    paramView === 'calendar' || paramView === 'list' ? paramView : defaultView;

  const [view, setView] = useState<ScheduleViewMode>(initialView);

  useEffect(() => {
    if (paramView === 'calendar' || paramView === 'list') {
      setView(paramView);
    }
  }, [paramView]);

  function onViewChange(next: string) {
    const mode = next as ScheduleViewMode;
    setView(mode);
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', mode);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={view} onValueChange={onViewChange} className='mt-6'>
      <TabsList className='grid w-full max-w-xs grid-cols-2'>
        <TabsTrigger value='list' className='gap-2'>
          <List className='h-4 w-4' aria-hidden />
          List
        </TabsTrigger>
        <TabsTrigger value='calendar' className='gap-2'>
          <CalendarDays className='h-4 w-4' aria-hidden />
          Calendar
        </TabsTrigger>
      </TabsList>

      <TabsContent value='list' className='mt-6'>
        <ScheduleListView items={items} />
      </TabsContent>

      <TabsContent value='calendar' className='mt-6'>
        <ScheduleCalendarView items={items} />
      </TabsContent>
    </Tabs>
  );
}
