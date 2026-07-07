import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ResetPasswordHtmlRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: '/reset-password',
      search: window.location.search,
      hash: window.location.hash,
    });
  }, [router]);

  return null;
}
