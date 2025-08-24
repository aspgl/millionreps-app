import { forwardRef } from 'react';

const AuthButton = forwardRef(({ 
  children, 
  variant = "primary", 
  loading = false,
  className = "",
  ...props 
}, ref) => {
  const baseClasses = `
    w-full px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-medium
    text-sm sm:text-base
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:scale-[1.02] active:scale-[0.98]
    relative overflow-hidden
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-dark-accent dark:to-purple-600
      hover:from-indigo-700 hover:to-purple-700 dark:hover:from-dark-accent-hover dark:hover:to-purple-700
      focus:ring-indigo-500 dark:focus:ring-dark-accent
      text-white
      shadow-lg shadow-indigo-500/25 dark:shadow-dark-accent/25
    `,
    secondary: `
      bg-white dark:bg-dark-secondary border border-gray-300 dark:border-dark-border
      hover:bg-gray-50 dark:hover:bg-dark-primary hover:border-gray-400 dark:hover:border-dark-accent/50
      focus:ring-gray-500 dark:focus:ring-dark-accent
      text-gray-700 dark:text-dark-text
      shadow-sm
    `,
    outline: `
      bg-transparent border-2 border-gray-300 dark:border-dark-border
      hover:bg-gray-50 dark:hover:bg-dark-secondary hover:border-gray-400 dark:hover:border-dark-accent/50
      focus:ring-gray-500 dark:focus:ring-dark-accent
      text-gray-700 dark:text-dark-text
    `
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={loading}
      {...props}
    >
      {/* Content */}
      <div className="relative flex items-center justify-center">
        {loading && (
          <div className="mr-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          </div>
        )}
        {children}
      </div>
    </button>
  );
});

AuthButton.displayName = 'AuthButton';

export default AuthButton;
