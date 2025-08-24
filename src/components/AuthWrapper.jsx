import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Login from '../Login';
import Signup from '../Signup';

export default function AuthWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(location.pathname === '/login');

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const switchToSignup = () => {
    setIsLogin(false);
    navigate('/signup');
  };

  const switchToLogin = () => {
    setIsLogin(true);
    navigate('/login');
  };

  return (
    <div>
      {isLogin ? (
        <Login onSwitch={switchToSignup} />
      ) : (
        <Signup onSwitch={switchToLogin} />
      )}
    </div>
  );
}
