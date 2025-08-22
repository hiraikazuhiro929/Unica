"use client";

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export function AutoLogoutConnector() {
  const { logout } = useAuth();
  const { registerLogoutCallback } = useSettings();

  useEffect(() => {
    registerLogoutCallback(() => {
      logout();
    });
  }, [logout, registerLogoutCallback]);

  return null;
}