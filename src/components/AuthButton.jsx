import { forwardRef } from 'react';

const AuthButton = forwardRef(({ 
  children, 
  variant = "primary", 
  loading = false,
  className = "",
  ...props 
}, ref) => {
  const baseClasses = `
    w-full px-6 py-4 rounded-xl font-semibold text-white
    transition-all duration-200 transform
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:scale-[1.02] active:scale-[0.98]
    relative overflow-hidden
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-blue-600 to-purple-600
      hover:from-blue-700 hover:to-purple-700
      focus:ring-blue-500
      shadow-lg shadow-blue-500/25
    `,
    secondary: `
      bg-white/10 backdrop-blur-sm border border-white/20
      hover:bg-white/20
      focus:ring-white/50
      text-white
    `,
    outline: `
      bg-transparent border-2 border-white/30
      hover:bg-white/10 hover:border-white/50
      focus:ring-white/50
      text-white
    `
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      disabled={loading}
      {...props}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
      
      {/* Content */}
      <div className="relative flex items-center justify-center">
        {loading && (
          <div className="mr-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          </div>
        )}
        {children}
      </div>
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </button>
  );
});

AuthButton.displayName = 'AuthButton';

export default AuthButton;
