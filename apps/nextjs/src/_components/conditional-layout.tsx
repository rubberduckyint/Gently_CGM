"use client";

import { usePathname } from "next/navigation";

import { Navbar } from "~/_components/navbar";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

// Routes that should not have the default layout container
const PUBLIC_ROUTES = ["/login"];

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (isPublicRoute) {
    // For public routes, only render children without navbar or container
    return <>{children}</>;
  }

  // For authenticated routes, render with navbar and container
  return (
    <>
      <Navbar />
      <div className="bg-muted flex min-h-screen justify-center py-8">
        <div className="flex w-full max-w-4xl flex-col gap-4 px-6">
          {children}
        </div>
      </div>
    </>
  );
}
