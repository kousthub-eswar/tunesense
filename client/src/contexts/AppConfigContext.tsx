import React, { createContext, useContext, useState } from 'react';

export interface AppConfigContextType {
  theme: 'dark';
  vibeModeEnabled: boolean;
  toggleVibeMode: () => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vibeModeEnabled, setVibeModeEnabled] = useState(true);

  const toggleVibeMode = () => {
    setVibeModeEnabled((prev) => !prev);
  };

  return (
    <AppConfigContext.Provider
      value={{
        theme: 'dark',
        vibeModeEnabled,
        toggleVibeMode,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
};

export function useAppConfig(): AppConfigContextType {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}
