import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LoginHtmlRedirect() {
  const router = useRouter();

  useEffect(() => {
    const nextPath = `/login${window.location.hash || ''}`;
    router.replace(nextPath);
  }, [router]);

  return null;
}
