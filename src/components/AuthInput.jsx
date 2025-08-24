import { forwardRef } from 'react';

const AuthInput = forwardRef(({ 
  label, 
  type = "text", 
  placeholder, 
  error, 
  icon: Icon,
  rightIcon: RightIcon,
  className = "",
  ...props 
}, ref) => {
  return (
    <div className={`mb-4 sm:mb-6 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-secondary">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={`
            w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-200 dark:border-dark-border rounded-xl
            text-sm sm:text-base text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary
            bg-white dark:bg-dark-secondary
            focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-accent focus:border-indigo-500 dark:focus:border-dark-accent
            transition-all duration-200
            ${Icon ? 'pl-9 sm:pl-10' : ''}
            ${RightIcon ? 'pr-9 sm:pr-10' : ''}
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
            hover:border-gray-300 dark:hover:border-dark-accent/50
          `}
          {...props}
        />
        
        {RightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-secondary">
            {RightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-2 text-xs sm:text-sm text-red-600 flex items-center">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
