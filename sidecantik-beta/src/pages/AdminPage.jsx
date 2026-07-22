import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FiUsers, FiDatabase, FiHome, FiUpload, FiDownload, FiEdit2, FiTrash2,
  FiPlus, FiSearch, FiX, FiLogOut, FiRefreshCw
} from 'react-icons/fi';

const API_BASE = '/api/admin';

const TABLE_LABELS = {
  users: 'Akun Petugas',
  desa: 'Desa',
  dusun: 'Dusun',
  sls: 'SLS (RT)',
  keluarga: 'Keluarga (KK)',
  penduduk: 'Penduduk',
  anggota_keluarga: 'Anggota Keluarga',
  wilayah_tugas: 'Wilayah Tugas'
};

const TABLE_ORDER = ['penduduk', 'keluarga', 'anggota_keluarga', 'sls', 'dusun', 'desa', 'wilayah_tugas', 'users'];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard Ringkasan', icon: FiHome },
  { id: 'data_kependudukan', label: 'Data Kependudukan', icon: FiUsers },
  { id: 'users', label: 'Manajemen Pengguna', icon: FiUsers },
  { id: 'database', label: 'Kelola Database', icon: FiDatabase }
];

// ==========================================
// 1. COMPONENT: TOAST NOTIFICATION
// ==========================================
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm px-6 py-3 rounded-lg shadow-xl text-white font-medium flex items-start gap-2 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    }`}>
      <span>{message}</span>
    </div>
  );
};

// ==========================================
// 2. MAIN COMPONENT: ADMIN PAGE (INTEGRATED, RESPONSIVE, REAL DATA)
// ==========================================
const AdminPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [lastSynced, setLastSynced] = useState(null);
  const [importingTable, setImportingTable] = useState(null);
  
  // Data Kependudukan
  const [dataPenduduk, setDataPenduduk] = useState([]);
  const [isLoadingPenduduk, setIsLoadingPenduduk] = useState(false);
  const [searchPenduduk, setSearchPenduduk] = useState('');

  // ---- Autentikasi dari Sesi Login API (localStorage) ----
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    // FIX: kalau token tidak ada (mis. sisa sesi lama sebelum fitur token ditambahkan),
    // paksa login ulang supaya tidak terjebak di loop 401.
    if (!storedUser || !storedToken) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      navigate('/login');
      return;
    }
    try {
      const parsedUser = JSON.parse(storedUser);
      const allowedRoles = ['SUPERADMIN', 'ADMIN', 'KEPALA DESA', 'SEKRETARIS DESA', 'OPERATOR SID', 'KEPALA DUSUN', 'KETUA RT', 'AGEN STATISTIK'];
      if (allowedRoles.includes(parsedUser.role)) {
        setCurrentUser(parsedUser);
      } else {
        alert('Hak akses ditolak! Halaman ini khusus untuk Admin dan Petinggi Desa.');
        navigate('/');
      }
    } catch (e) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      navigate('/login');
    }
  };

  const showNotification = (message, type = 'success') => setToast({ message, type });

  // ---- FIX: helper fetch terpusat yang selalu menyisipkan token JWT ----
  // Backend sekarang mewajibkan header Authorization di semua endpoint /api/admin/*.
  // Kalau server balas 401 (token hilang/kedaluwarsa), user otomatis diarahkan ke halaman login
  // daripada dibiarkan melihat error tanpa penjelasan.
  const apiFetch = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      navigate('/login');
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }

    return res;
  }, [navigate]);

  // ---- Data asli dari backend (menggantikan data dummy sebelumnya) ----
  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await apiFetch(`${API_BASE}/summary`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat ringkasan data');
      setSummary(json.data);
      setLastSynced(new Date());
    } catch (err) {
      showNotification(err.message || 'Gagal memuat ringkasan data dari server', 'error');
    } finally {
      setIsLoadingSummary(false);
    }
  }, [apiFetch]);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiFetch(`${API_BASE}/users`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat data user');
      setUsers(json.data);
    } catch (err) {
      showNotification(err.message || 'Gagal memuat data user dari server', 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [apiFetch]);

  const fetchPenduduk = useCallback(async () => {
    setIsLoadingPenduduk(true);
    try {
      const params = new URLSearchParams();
      if (searchPenduduk) params.append('search', searchPenduduk);
      const res = await apiFetch(`/api/kependudukan/penduduk?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memuat data kependudukan');
      setDataPenduduk(json.data);
    } catch (err) {
      showNotification(err.message || 'Gagal memuat data kependudukan', 'error');
    } finally {
      setIsLoadingPenduduk(false);
    }
  }, [apiFetch, searchPenduduk]);

  useEffect(() => {
    if (currentUser) {
      fetchSummary();
      fetchUsers();
    }
  }, [currentUser, fetchSummary, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'data_kependudukan' && currentUser) {
      fetchPenduduk();
    }
  }, [activeTab, currentUser, fetchPenduduk]);

  const refreshAll = () => {
    fetchSummary();
    fetchUsers();
    if (activeTab === 'data_kependudukan') fetchPenduduk();
  };

  const chartData = useMemo(() => [
    { name: 'Penduduk', value: summary.penduduk || 0, fill: '#3B82F6' },
    { name: 'Keluarga', value: summary.keluarga || 0, fill: '#10B981' },
    { name: 'Anggota KK', value: summary.anggota_keluarga || 0, fill: '#F59E0B' },
    { name: 'SLS (RT)', value: summary.sls || 0, fill: '#8B5CF6' }
  ], [summary]);

  const pieData = useMemo(() => [
    { name: 'Penduduk', value: summary.penduduk || 0 },
    { name: 'Keluarga', value: summary.keluarga || 0 },
    { name: 'Anggota KK', value: summary.anggota_keluarga || 0 }
  ], [summary]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

  // ---- CRUD User (dihubungkan ke /api/admin/users) ----
  const handleSaveUser = async (formData) => {
    try {
      const payload = { ...formData };
      if (editingUser && !payload.password) delete payload.password;

      const res = await apiFetch(
        editingUser ? `${API_BASE}/users/${editingUser.id_user}` : `${API_BASE}/users`,
        {
          method: editingUser ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menyimpan user');

      showNotification(editingUser ? 'Data user berhasil diperbarui' : 'User baru berhasil ditambahkan');
      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers();
      fetchSummary();
    } catch (err) {
      showNotification(err.message || 'Gagal menyimpan user', 'error');
    }
  };

  const handleDeleteUser = async (id_user, targetRole) => {
    if (targetRole === 'SUPERADMIN') {
      showNotification('Role SUPERADMIN tidak boleh dihapus!', 'error');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini dari database?')) return;

    try {
      const res = await apiFetch(`${API_BASE}/users/${id_user}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menghapus user');
      showNotification('User berhasil dihapus dari sistem');
      fetchUsers();
      fetchSummary();
    } catch (err) {
      showNotification(err.message || 'Gagal menghapus user', 'error');
    }
  };

  // ---- Template CSV (panduan format kolom, tetap dibuat di sisi klien) ----
  const downloadTemplate = (type) => {
    const templates = {
      users: 'email,password,nama,role\noperator_baru,pass123,Nama Operator,OPERATOR SID',
      keluarga: 'no_kk,id_sls_administrasi,nama_kepala_keluarga,status_keberadaan,alamat',
      penduduk: 'nik,nama,tempat_lahir,tanggal_lahir,jenis_kelamin,agama,id_keluarga',
      anggota_keluarga: 'nik,nama,status_hubungan_keluarga,id_keluarga',
      desa: 'nama_desa',
      dusun: 'nama_dusun,id_desa',
      sls: 'nama_sls,id_dusun',
      wilayah_tugas: 'id_user,id_sls'
    };

    const csvContent = templates[type] || 'id,data\n1,template_default';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_sidecantik_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    showNotification(`Template ${type}.csv berhasil diunduh. ID unik akan dibuatkan otomatis saat impor.`);
  };

  // ---- Import file asli (POST ke /api/admin/import/:table) ----
  const handleImportFile = async (tableName, event) => {
    const file = event.target.files[0];
    event.target.value = ''; // supaya file yang sama bisa dipilih ulang nanti
    if (!file) return;

    setImportingTable(tableName);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // Catatan: jangan set header 'Content-Type' manual di sini — browser yang menentukan
      // boundary multipart secara otomatis. apiFetch hanya menambahkan header Authorization.
      const res = await apiFetch(`${API_BASE}/import/${tableName}`, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Gagal mengimpor data');
      showNotification(json.message);
      fetchSummary();
      if (tableName === 'users') fetchUsers();
    } catch (err) {
      showNotification(err.message || 'Gagal mengimpor data', 'error');
    } finally {
      setImportingTable(null);
    }
  };

  // ---- Export (GET /api/admin/export/:table, unduh file .xlsx) ----
  // FIX: sebelumnya pakai window.open(url), yang membuka tab baru lewat navigasi browser biasa
  // dan TIDAK BISA menyisipkan header Authorization. Sekarang endpoint ini butuh token,
  // jadi kita fetch sebagai blob (lewat apiFetch, otomatis membawa token), lalu memicu
  // download file secara manual di sisi klien.
  const handleExportTable = async (tableName) => {
    showNotification(`Menyiapkan file ekspor untuk tabel ${TABLE_LABELS[tableName] || tableName}...`, 'info');
    try {
      const res = await apiFetch(`${API_BASE}/export/${tableName}`);
      if (!res.ok) {
        let message = 'Gagal mengekspor data.';
        try {
          const json = await res.json();
          message = json.message || message;
        } catch (_) { /* respons bukan JSON, pakai pesan default */ }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data_${tableName}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showNotification(err.message || 'Gagal mengekspor data', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 font-bold">Memeriksa hak akses keamanan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans lg:flex">

      {/* ============ SIDEBAR (desktop, lg ke atas) ============ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 bg-white border-r border-gray-200">
        <div className="px-6 py-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">SIDECANTIK</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Admin Panel Desa Medana</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-900 truncate">{currentUser.nama}</p>
            <p className="text-xs text-blue-600 font-semibold tracking-wide uppercase">{currentUser.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm py-2.5 rounded-xl transition-all"
          >
            <FiLogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">

        {/* ============ HEADER (mobile: gradient banner, desktop: slim bar) ============ */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-700 lg:bg-white text-white lg:text-gray-900 shadow-lg lg:shadow-none lg:border-b lg:border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="lg:hidden">
              <h1 className="text-3xl font-black tracking-tight">Admin Panel SIDECANTIK</h1>
              <p className="text-blue-100 mt-0.5 font-medium text-sm sm:text-base">Data Manajemen Terpusat Pemerintah Desa Medana</p>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-lg font-black text-gray-900">{NAV_ITEMS.find(t => t.id === activeTab)?.label}</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refreshAll}
                title="Sinkronkan ulang data"
                className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 lg:bg-gray-100 lg:hover:bg-gray-200 text-white lg:text-gray-600 transition-all"
              >
                <FiRefreshCw className={`w-4 h-4 ${(isLoadingSummary || isLoadingUsers) ? 'animate-spin' : ''}`} />
              </button>

              {/* Chip user + logout: hanya tampil di mobile, karena di desktop sudah ada di sidebar */}
              <div className="lg:hidden flex items-center gap-4 bg-blue-800 bg-opacity-40 px-5 py-2.5 rounded-xl border border-blue-500 border-opacity-30">
                <div className="text-right">
                  <p className="text-base font-bold">{currentUser.nama}</p>
                  <p className="text-xs text-blue-200 font-semibold tracking-wider uppercase">{currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 p-2.5 rounded-lg text-white transition-all shadow hover:shadow-lg active:scale-95"
                  title="Keluar dari Aplikasi"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ============ TAB NAV (mobile & tablet only — desktop pakai sidebar) ============ */}
        <div className="lg:hidden bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 sm:px-6">
            <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
              {NAV_ITEMS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      isActive
                        ? 'border-blue-600 text-blue-600 bg-blue-50 bg-opacity-60'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-3 sm:px-5 border-b-4 font-bold text-sm sm:text-base transition-all flex items-center gap-2`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ============ MAIN CONTENT ============ */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8 2xl:px-16">
          {lastSynced && (
            <p className="text-xs text-gray-400 font-medium mb-4">
              Data disinkronkan pukul {lastSynced.toLocaleTimeString('id-ID')}
            </p>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { key: 'penduduk', label: 'Total Penduduk', color: 'border-blue-600', bg: 'bg-blue-100', text: 'text-blue-600' },
                  { key: 'keluarga', label: 'Total Keluarga (KK)', color: 'border-green-600', bg: 'bg-green-100', text: 'text-green-600' },
                  { key: 'dusun', label: 'Total Dusun', color: 'border-amber-500', bg: 'bg-amber-100', text: 'text-amber-600' },
                  { key: 'users', label: 'Total Akun Petugas', color: 'border-purple-600', bg: 'bg-purple-100', text: 'text-purple-600' }
                ].map((card) => (
                  <div key={card.key} className={`bg-white rounded-xl shadow border-l-8 ${card.color} p-6 transform transition-all hover:scale-[1.02]`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{card.label}</p>
                        {isLoadingSummary ? (
                          <div className="h-8 w-20 mt-2 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <p className="text-3xl font-black text-gray-900 mt-2">{(summary[card.key] || 0).toLocaleString()}</p>
                        )}
                      </div>
                      <div className={`${card.bg} p-3.5 rounded-xl ${card.text}`}>
                        <FiUsers className="w-7 h-7" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">Grafik Perbandingan Kependudukan</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-wide">Persentase Proporsi Data Utama</h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DATA KEPENDUDUKAN */}
          {activeTab === 'data_kependudukan' && (
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-2xl font-black text-gray-900 uppercase">Data Kependudukan</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  Menampilkan data sesuai wilayah tugas Anda ({currentUser.role})
                </p>
              </div>

              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau NIK..."
                  value={searchPenduduk}
                  onChange={(e) => setSearchPenduduk(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchPenduduk(); }}
                  className="pl-12 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
                />
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">NIK</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">L/P</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Umur</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Wilayah (SLS)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingPenduduk ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-semibold">Memuat data...</td>
                      </tr>
                    ) : dataPenduduk.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-semibold">Tidak ada data yang cocok.</td>
                      </tr>
                    ) : dataPenduduk.map((p) => (
                      <tr key={p.id_penduduk} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{p.nik}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{p.nama}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.jenis_kelamin}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.umur ?? '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.nama_sls || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase">Daftar Aparat Desa & Petugas Lapangan</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Kelola data otentikasi hak akses login personil SIDECANTIK</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => downloadTemplate('users')}
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all"
                  >
                    <FiDownload className="w-4 h-4 mr-2" /> Unduh Template CSV
                  </button>
                  <button
                    onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow transition-all"
                  >
                    <FiPlus className="w-4 h-4 mr-2" /> Tambah User Baru
                  </button>
                </div>
              </div>

              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama petugas, username/email, atau jabatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
                />
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Username / Email</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nama Lengkap</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Hak Akses Jabatan</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Aksi Kontrol</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-semibold">Memuat data user...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-semibold">Tidak ada user yang cocok.</td>
                      </tr>
                    ) : filteredUsers.map((user) => {
                      const isSuperadminAccount = user.role === 'SUPERADMIN';
                      const canModify = currentUser.role === 'SUPERADMIN' ||
                        (currentUser.role === 'KEPALA DESA' && !isSuperadminAccount) ||
                        (currentUser.role === 'SEKRETARIS DESA' && !isSuperadminAccount && user.role !== 'KEPALA DESA');

                      return (
                        <tr key={user.id_user} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700 font-medium">{user.nama}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs leading-5 font-bold rounded-full ${
                              user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800' :
                              user.role === 'KEPALA DESA' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'OPERATOR SID' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                            {canModify ? (
                              <div className="flex gap-4">
                                <button
                                  onClick={() => { setEditingUser(user); setShowUserModal(true); }}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                >
                                  <FiEdit2 className="w-4 h-4" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id_user, user.role)}
                                  className="text-red-600 hover:text-red-900 flex items-center gap-1"
                                >
                                  <FiTrash2 className="w-4 h-4" /> Hapus
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold italic">Dikunci (No Access)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE IMPORT / EXPORT */}
          {activeTab === 'database' && (
            <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Manajemen Sinkronisasi Data</h2>
                <p className="text-gray-500 text-sm mt-0.5">Lakukan ekspor data cadangan (.xlsx) atau impor massal (.csv / .xlsx) untuk setiap tabel MySQL</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {TABLE_ORDER.map((tableName) => (
                  <div key={tableName} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all bg-white flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                        {TABLE_LABELS[tableName] || tableName}
                      </h3>
                      <div className="mt-3 space-y-1 text-sm font-semibold text-gray-600">
                        {isLoadingSummary ? (
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                        ) : (
                          <p>Kapasitas Rekor: <span className="text-gray-900 font-bold">{(summary[tableName] || 0).toLocaleString()} baris</span></p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <button
                        onClick={() => downloadTemplate(tableName)}
                        className="py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all text-center flex items-center justify-center"
                      >
                        Template
                      </button>
                      <label className="py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all text-center flex items-center justify-center cursor-pointer">
                        {importingTable === tableName ? 'Mengunggah...' : 'Impor'}
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => handleImportFile(tableName, e)}
                          disabled={importingTable === tableName}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => handleExportTable(tableName)}
                        className="py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow transition-all text-center flex items-center justify-center"
                      >
                        <FiDownload className="w-3.5 h-3.5 mr-1" /> Ekspor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* User Modal Component */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          currentUserRole={currentUser.role}
          onSave={handleSaveUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
        />
      )}

      {/* Global Toast Render */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

// ==========================================
// 3. COMPONENT: USER MODAL (FORM CRUD)
// ==========================================
const UserModal = ({ user, currentUserRole, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    nama: user?.nama || '',
    role: user?.role || 'OPERATOR SID'
  });
  const [isSaving, setIsSaving] = useState(false);

  const availableRoles = useMemo(() => {
    if (currentUserRole === 'SUPERADMIN') {
      return ['SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA', 'KEPALA DUSUN', 'KETUA RT', 'AGEN STATISTIK', 'OPERATOR SID'];
    } else if (currentUserRole === 'KEPALA DESA') {
      return ['SEKRETARIS DESA', 'KEPALA DUSUN', 'KETUA RT', 'AGEN STATISTIK', 'OPERATOR SID'];
    } else if (currentUserRole === 'SEKRETARIS DESA') {
      return ['KEPALA DUSUN', 'KETUA RT', 'AGEN STATISTIK', 'OPERATOR SID'];
    } else {
      return ['AGEN STATISTIK', 'OPERATOR SID'];
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (!availableRoles.includes(formData.role)) {
      setFormData(prev => ({ ...prev, role: availableRoles[0] || 'OPERATOR SID' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRoles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-wide">
            {user ? 'Ubah Akun Petugas' : 'Daftarkan Petugas Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-all">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Username / Email Login</label>
            <input
              type="text"
              required
              placeholder="Contoh: operator_sid atau nama@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password {user && <span className="text-blue-600 font-semibold">(Kosongkan jika tidak diubah)</span>}
            </label>
            <input
              type="password"
              required={!user}
              placeholder="Masukkan password akun..."
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap Personil</label>
            <input
              type="text"
              required
              placeholder="Masukkan nama lengkap beserta gelar..."
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Penugasan Hak Akses Peran (Role)</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base shadow-sm bg-white font-semibold text-gray-800"
            >
              {availableRoles.map((roleOpt) => (
                <option key={roleOpt} value={roleOpt}>{roleOpt}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-base font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 border border-transparent rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
