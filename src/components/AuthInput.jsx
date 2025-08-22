import { forwardRef } from 'react';

const AuthInput = forwardRef(({ 
  label, 
  type = "text", 
  placeholder, 
  error, 
  icon: Icon,
  className = "",
  ...props 
}, ref) => {
  return (
    <div className={`mb-6 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-200 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors duration-200">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`
            w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl
            text-white placeholder-gray-400
            backdrop-blur-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400
            transition-all duration-200
            ${Icon ? 'pl-12' : ''}
            ${error ? 'border-red-400 focus:ring-red-500/50' : ''}
            hover:bg-white/15
          `}
          {...props}
        />
        
        {/* Glow effect on focus */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 -z-10 blur-sm"></div>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

AuthInput.displayName = 'AuthInput';

export default AuthInput;
