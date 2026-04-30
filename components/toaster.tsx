'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.75)',
          color: '#dae2fd',
          border: '1px solid rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(12px)'
        }
      }}
    />
  );
}
