import { AppProps } from 'next/app';
import Head from 'next/head';
import { createContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import MobileNav from '../components/MobileNav';
import '../styles/globals.css';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export default function App({ Component, pageProps }: AppProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="FeetSocial" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FeetSocial" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#9333ea" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </Head>
      
      <div className="pb-16 md:pb-0">
        <Component {...pageProps} />
        <MobileNav currentUserId={user?.id} />
      </div>
    </AuthContext.Provider>
  );
}

