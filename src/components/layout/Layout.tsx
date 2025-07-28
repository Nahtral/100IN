
import React from 'react';
import Navigation from './Navigation';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: {
    name: string;
    role: string;
    avatar: string;
  };
}

const Layout = ({ children, currentUser }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <Header currentUser={currentUser} />
      <main className="ml-64 pt-20 p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
