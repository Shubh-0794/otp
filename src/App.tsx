/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthCard } from './components/AuthCard';
import { SupabaseConfig, SessionData } from './types/auth';
import { loadConfig, getSavedSession, signOutSupabase, getSupabaseClient } from './lib/supabase';

export default function App() {
  const [config] = useState<SupabaseConfig>(loadConfig());
  const [session, setSession] = useState<SessionData | null>(getSavedSession());

  useEffect(() => {
    if (config.isCustom && !config.isDemoMode) {
      try {
        const client = getSupabaseClient();
        const { data: authListener } = client.auth.onAuthStateChange((event, sbSession) => {
          if (event === 'SIGNED_IN' && sbSession?.user) {
            const newSession: SessionData = {
              user: {
                id: sbSession.user.id,
                phone: sbSession.user.phone || '+10000000000',
                fullName: sbSession.user.user_metadata?.full_name || `WhatsApp User`,
                avatarUrl: sbSession.user.user_metadata?.avatar_url,
                role: sbSession.user.role || 'authenticated',
                createdAt: sbSession.user.created_at,
                lastSignInAt: sbSession.user.last_sign_in_at,
                metadata: sbSession.user.user_metadata,
              },
              accessToken: sbSession.access_token,
              refreshToken: sbSession.refresh_token,
              expiresAt: sbSession.expires_at ? sbSession.expires_at * 1000 : Date.now() + 3600 * 1000,
              tokenType: sbSession.token_type || 'bearer',
            };
            setSession(newSession);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (e) {
        console.warn('Supabase auth state listener error:', e);
      }
    }
  }, [config]);

  const handleAuthenticated = (newSession: SessionData) => {
    setSession(newSession);
  };

  const handleSignOut = async () => {
    await signOutSupabase(config);
    setSession(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#070B11] text-slate-100 flex items-center justify-center p-4 sm:p-6 antialiased selection:bg-[#25D366]/20 selection:text-[#25D366]">
      <AuthCard
        config={config}
        session={session}
        onAuthenticated={handleAuthenticated}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
