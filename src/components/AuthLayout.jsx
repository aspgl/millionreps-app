import { useState, useEffect } from 'react';
import ParticleBackground from './ParticleBackground';
import millionrepsLogo from '../utils/img/millionreps.svg';

export default function AuthLayout({ children, title, subtitle }) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Simulate loading effect
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Floating Elements */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {/* Floating circles */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl animate-pulse delay-1500"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex min-h-screen items-center justify-center p-4">
        <div className={`w-full max-w-md transform transition-all duration-700 ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 border border-white/20 shadow-2xl">
              <img 
                src={millionrepsLogo} 
                alt="MillionReps" 
                className="w-12 h-12"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-300 text-sm">
                {subtitle}
              </p>
            )}
          </div>

          {/* Auth Form Container */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-gray-400 text-xs">
              © 2024 MillionReps. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-5">
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
    </div>
  );
}
