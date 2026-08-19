'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page has been superseded by the Sandbox (/sandbox) which includes
// the full consent modal flow. Redirect users there automatically.
export default function RequestRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sandbox');
  }, [router]);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#8892a4', fontSize: '14px' }}>
      Redirecting to Sandbox...
    </div>
  );
}
