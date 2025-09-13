import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  useEffect(() => {
    document.title = "MORTIAN - Home";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header with Login Button */}
      <header className="w-full p-6">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Link href="/login" data-testid="link-login">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 text-lg rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
              data-testid="button-login"
            >
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content - MORTIAN in the center */}
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="text-center">
          <h1 
            className="text-8xl md:text-9xl lg:text-[12rem] font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text tracking-wider drop-shadow-2xl"
            style={{ 
              textShadow: '0 0 40px rgba(59, 130, 246, 0.5)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            data-testid="text-mortian"
          >
            MORTIAN
          </h1>
          
          {/* Subtle subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mt-8 font-light tracking-wide">
            Advanced Construction Management Platform
          </p>
          
          {/* Optional decorative elements */}
          <div className="mt-12 flex justify-center space-x-4">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </main>
    </div>
  );
}