import { Suspense } from 'react';

import { ProcessClient } from '@/components/process-client';

export default function ProcessPage() {
  return (
    <Suspense fallback={null}>
      <ProcessClient />
    </Suspense>
  );
}
