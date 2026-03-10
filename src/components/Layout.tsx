import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-app">
      <header className="bg-teal text-white px-4 py-3 shadow-md">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <main style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </main>
    </div>
  );
}
