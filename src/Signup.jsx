import { useState } from "react";
import { supabase, getAuthRedirectUrl } from "./lib/supabase";
import AuthLayout from "./components/AuthLayout";
import AuthInput from "./components/AuthInput";
import AuthButton from "./components/AuthButton";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function Signup({ onSwitch }) {
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError(null);
    if (message) setMessage(null);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // Get the correct redirect URL
      const redirectUrl = getAuthRedirectUrl();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            firstname: form.firstname,
            lastname: form.lastname,
            username: form.username,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) throw signUpError;
      
      setMessage(
        "Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich einloggen."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Konto erstellen" 
      subtitle="Starte deine Lernreise mit MillionReps"
    >
      <form onSubmit={handleSignup} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <AuthInput
            label="Vorname"
            name="firstname"
            placeholder="Max"
            value={form.firstname}
            onChange={handleChange}
            icon={User}
            required
          />
          <AuthInput
            label="Nachname"
            name="lastname"
            placeholder="Mustermann"
            value={form.lastname}
            onChange={handleChange}
            icon={User}
            required
          />
        </div>

        <AuthInput
          label="Benutzername"
          name="username"
          placeholder="maxmustermann"
          value={form.username}
          onChange={handleChange}
          icon={User}
          required
        />

        <AuthInput
          label="E-Mail"
          name="email"
          type="email"
          placeholder="max@example.com"
          value={form.email}
          onChange={handleChange}
          icon={Mail}
          error={error}
          required
        />

        <div className="relative">
          <AuthInput
            label="Passwort"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mindestens 8 Zeichen"
            value={form.password}
            onChange={handleChange}
            icon={Lock}
            error={error}
            required
          />
          
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {/* Password strength indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Passwort-Stärke</span>
            <span className="text-blue-400">Mittel</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-red-500 to-yellow-500 h-2 rounded-full w-2/3"></div>
          </div>
          <div className="flex items-center text-xs text-gray-400">
            <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
            Mindestens 8 Zeichen
          </div>
        </div>

        <div className="flex items-start space-x-3">
                      <input
              type="checkbox"
              id="terms"
              className="mt-1 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              required
            />
          <label htmlFor="terms" className="text-sm text-gray-300">
            Ich stimme den{" "}
            <button type="button" className="text-blue-400 hover:text-blue-300">
              Nutzungsbedingungen
            </button>{" "}
            und der{" "}
            <button type="button" className="text-blue-400 hover:text-blue-300">
              Datenschutzerklärung
            </button>{" "}
            zu
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            {message}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>
          {loading ? "Konto erstellen..." : "Konto erstellen"}
        </AuthButton>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-gray-400">oder</span>
          </div>
        </div>

        <AuthButton variant="secondary" type="button">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Mit Google registrieren
        </AuthButton>

        <div className="text-center">
          <p className="text-gray-300 text-sm">
            Bereits ein Konto?{" "}
            <button
              type="button"
              onClick={onSwitch}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
            >
              Jetzt anmelden
            </button>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
