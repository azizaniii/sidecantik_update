import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react'; // Mengganti ikon Mail ke User

export default function Login() {
  const [identifier, setIdentifier] = useState(''); // Mengganti state email jadi identifier fleksibel
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan, periksa kredensial Anda.');
      }

      if (!data.token) {
        throw new Error('Login berhasil tetapi server tidak mengirim token otentikasi. Hubungi administrator.');
      }
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      if (data.user.role === 'SUPERADMIN' || data.user.role === 'OPERATOR SID' || data.user.role === 'KEPALA DESA' || data.user.role === 'SEKRETARIS DESA') {
        navigate('/admin');
      } else if (data.user.role === 'KEPALA DUSUN') {
        navigate('/kadus');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10">
        <div className="bg-gradient-to-r from-teal-400 to-blue-500 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">SIDECANTIK</h1>
          <p className="text-teal-50 text-sm mt-1 font-medium">Sistem Desa Cinta Statistik</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Masuk ke Akun Anda</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 p-3 rounded-xl mb-5 text-sm border border-red-100 animate-pulse">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-all text-gray-700 text-base"
                  placeholder="Contoh: operator_sid atau nama@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition-all text-gray-700 text-base"
                  placeholder="Masukkan password Anda"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl text-white font-bold text-lg shadow-md transition-all
                ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {isLoading ? (
                <RefreshCw size={22} className="animate-spin" />
              ) : (
                <LogIn size={22} />
              )}
              {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 font-medium">Gunakan kredensial yang diberikan oleh Operator SID atau Admin untuk mengakses sistem.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
