import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppConfigProvider } from './contexts/AppConfigContext.js';
import { AuthProvider } from './contexts/AuthContext.js';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext.js';
import { AppRoutes } from './routes/AppRoutes.js';

export const App: React.FC = () => {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <AppConfigProvider>
          <AuthProvider>
            <AudioPlayerProvider>
              <AppRoutes />
            </AudioPlayerProvider>
          </AuthProvider>
        </AppConfigProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default App;
