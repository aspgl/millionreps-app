import millionrepsLogo from '../utils/img/millionreps.svg';
import millionrepsLogoDark from '../utils/img/logo_darktheme.svg';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary flex flex-col justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={millionrepsLogo} 
            alt="MillionReps" 
            className="w-24 h-9 sm:w-32 sm:h-12 dark:hidden"
          />
          <img 
            src={millionrepsLogoDark} 
            alt="MillionReps" 
            className="w-24 h-9 sm:w-32 sm:h-12 hidden dark:block"
          />
        </div>
        
        {/* Title */}
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text">
          {title}
        </h2>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary px-4">
            {subtitle}
          </p>
        )}
      </div>

      {/* Form Container */}
      <div className="mt-6 sm:mt-8 w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-dark-card py-6 px-4 sm:py-8 sm:px-6 lg:px-10 shadow-xl rounded-2xl border border-gray-200 dark:border-dark-border">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
          © 2024 MillionReps. All rights reserved.
        </p>
      </div>
    </div>
  );
}
