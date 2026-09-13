'use client';

import { IdeasContainer } from './components/IdeasContainer';
import { GlobalModeHeader } from '@/components/layout/GlobalModeHeader';

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <GlobalModeHeader />
      <IdeasContainer />
    </div>
  );
}
