import React, { createContext, useContext, ReactNode } from 'react';

interface ApiContextType {
  apiBaseUrl: string;
  fetchData: (endpoint: string, params?: Record<string, any>) => Promise<any>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

interface ApiProviderProps {
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const apiBaseUrl = 'http://127.0.0.1:5000/api'; // Update this to your API URL

  const fetchData = async (endpoint: string, params?: Record<string, any>) => {
    try {
      const url = new URL(`${apiBaseUrl}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.append(key, value.toString());
          }
        });
      }
      
      console.log('Fetching:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  };

  return (
    <ApiContext.Provider value={{ apiBaseUrl, fetchData }}>
      {children}
    </ApiContext.Provider>
  );
};