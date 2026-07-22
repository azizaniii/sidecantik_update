import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  UserPlus, 
  LogOut, 
  Activity,
  LayoutDashboard,
  Database,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  
  // State Statistik
  const [stats, setStats] = useState({
    totalKeluarga: 0,
    totalPenduduk: 0,
    unsynced: 0
  });

  // State untuk kontrol FAB Menu & Loading
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // State Toast Notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    // Ambil data user dari localStorage [cite: 405]
    const storedUser = JSON.parse(localStorage.getItem('auth_user'));
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUserData(storedUser);
    kalkulasiStatistik();
  }, [navigate]);

  const kalkulasiStatistik = () => {
    const dataKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
    const dataPenduduk = JSON.parse(localStorage.getItem('data_penduduk')) || [];

    const unsyncedKeluarga = dataKeluarga.filter(k => !k.synced).length;
    const unsyncedPenduduk = dataPenduduk.filter(p => !p.synced).length;

    setStats({
      totalKeluarga: dataKeluarga.length,
      totalPenduduk: dataPenduduk.length,
      unsynced: unsyncedKeluarga
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    navigate('/login');
  };

  // 🔥 FUNGSI FULL SYNC (Menarik semua keluarga & anggota untuk seluruh wilayah tugas)
  const handleFullSync = async () => {
    try {
      // Tampilkan loading/spinner di UI (opsional, disesuaikan dengan state kamu)
      setIsSyncing(true); 
      showToast('Memulai sinkronisasi data dari server...', 'success');

      const userData = JSON.parse(localStorage.getItem('auth_user'));
      if (!userData || !userData.daftar_sls || userData.daftar_sls.length === 0) {
        showToast('Gagal: Kamu belum memiliki wilayah tugas.', 'error');
        return;
      }

      // ==========================================
      // TAHAP 1: PUSH (UPLOAD DATA LOKAL KE SERVER)
      // ==========================================
      const dataKeluargaLokal = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const drafBlok2Lokal = JSON.parse(localStorage.getItem('draft_blok2_keberadaan-keluarga')) || [];
      const dataPendudukLokal = JSON.parse(localStorage.getItem('data_penduduk')) || [];

      // Filter data yang siap di-upload
      const keluargaSiapSync = dataKeluargaLokal.filter(k => k.status === 'selesai' && k.synced === false);
      
      if (keluargaSiapSync.length > 0) {
        // Gabungkan dengan draf Blok 2
        const payloadKeluarga = keluargaSiapSync.map(keluarga => {
          const blok2Terkait = drafBlok2Lokal.find(draf => draf.id_keluarga === keluarga.id_keluarga) || {};
          return { ...keluarga, ...blok2Terkait, status: 'submitted' };
        });

        const listIdKeluargaSync = keluargaSiapSync.map(k => k.id_keluarga);
        
        // Ambil penduduk dari keluarga yang ikut di-sync
        const payloadPenduduk = dataPendudukLokal.filter(p => 
          listIdKeluargaSync.includes(p.id_keluarga) && 
          p.status_dokumen_blok3 === 'draft'
        );
        console.log(payloadKeluarga);
        console.log(payloadPenduduk);
        // Upload Keluarga
        const resKeluarga = await fetch('/api/keluarga/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadKeluarga)
        });
        if (!resKeluarga.ok) throw new Error("Gagal upload data keluarga.");

        // Upload Penduduk
        if (payloadPenduduk.length > 0) {
          const resPenduduk = await fetch('/api/penduduk/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPenduduk)
          });
          if (!resPenduduk.ok) throw new Error("Gagal upload data penduduk.");
        }
      }

      // ==========================================
      // TAHAP 2: PULL (DOWNLOAD DATA TERBARU DARI SERVER)
      // ==========================================
      let semuaKeluargaServer = [];
      let semuaPendudukServer = [];
      let semuaSLS = [];

      // Looping untuk menarik data berdasarkan SLS yang dimiliki petugas
      for (const id_sls of userData.daftar_sls) {
        // Tarik data SLS
        const resSLSPull = await fetch(`/api/sls/${id_sls}`);
        if (resSLSPull.ok){
          const data = await resSLSPull.json();
          semuaSLS = [...semuaSLS, ...data];
        }
        // 1. Tarik Data Keluarga
        const resKeluargaPull = await fetch(`/api/keluarga/sls/${id_sls}`);
        if (resKeluargaPull.ok) {
          const data = await resKeluargaPull.json();
          // Beri tanda bahwa data dari server ini sudah tersinkronisasi
          const dataSynced = data.map(item => ({ ...item, synced: true, status: item.status || 'open' }));
          semuaKeluargaServer = [...semuaKeluargaServer, ...dataSynced];
          
          // 2. Tarik Data Penduduk untuk setiap keluarga yang ditarik
          for (const keluarga of dataSynced) {
            const resPendudukPull = await fetch(`/api/penduduk/keluarga/${keluarga.id_keluarga}`);
            if (resPendudukPull.ok) {
              const pendudukData = await resPendudukPull.json();
              const pendudukSynced = pendudukData.map(item => ({ ...item, status_dokumen_blok3: item.status_dokumen, synced: true}));
              semuaPendudukServer = [...semuaPendudukServer, ...pendudukSynced];
            }
          }
        }
      }

      // ==========================================
      // TAHAP 3: UPDATE LOCAL STORAGE
      // ==========================================
      const mapKeluarga = new Map();
      // 1. Masukkan data fresh dari server
      semuaKeluargaServer.forEach(k => mapKeluarga.set(k.id_keluarga, k));
      // 2. Masukkan data draft lokal (akan menimpa data server jika ID sama, atau menambah jika ID baru)
      dataKeluargaLokal.forEach(k => {
        if (k.status === 'draft') {
          mapKeluarga.set(k.id_keluarga, k);
        }
      });
      const finalKeluargaLokal = Array.from(mapKeluarga.values());

      // 🟢 B. GABUNGKAN DATA PENDUDUK
      const mapPenduduk = new Map();
      // 1. Masukkan data fresh dari server
      semuaPendudukServer.forEach(p => mapPenduduk.set(p.id_anggota_keluarga, p));
      // 2. Masukkan data draft lokal
      dataPendudukLokal.forEach(p => {
        if (p.status_dokumen_blok3 === 'draft' || p.synced === false) {
          mapPenduduk.set(p.id_anggota_keluarga, p);
        }
      });
      const finalPendudukLokal = Array.from(mapPenduduk.values());

      // 🟢 C. SIMPAN HASIL GABUNGAN KE LOCAL STORAGE
      localStorage.setItem('data_keluarga', JSON.stringify(finalKeluargaLokal));
      localStorage.setItem('data_penduduk', JSON.stringify(finalPendudukLokal));
      localStorage.setItem('data_sls', JSON.stringify(semuaSLS));

      // Bersihkan draf Blok 2 HANYA untuk keluarga yang sudah berstatus 'selesai' dan 'synced'
      const sisaDrafBlok2 = drafBlok2Lokal.filter(draf => {
        // Cek apakah di data final lokal, keluarga ini masih draft?
        const keluargaDiLokal = finalKeluargaLokal.find(k => k.id_keluarga === draf.id_keluarga);
        // Jika masih draft, pertahankan draf blok 2-nya!
        if (keluargaDiLokal && (keluargaDiLokal.status === 'draft' || keluargaDiLokal.synced === false)) {
          return true; 
        }
        return false; // Hapus jika sudah di-sync
      });
      localStorage.setItem('draft_blok2_keberadaan-keluarga', JSON.stringify(sisaDrafBlok2));

      kalkulasiStatistik();
      showToast('Sinkronisasi penuh berhasil! 🚀', 'success');

    } catch (error) {
      console.error("Full Sync Error:", error);
      showToast('Sync gagal ❌. Pastikan server menyala.', 'error');
    } finally {
      setIsSyncing(false);
      setIsFabOpen(false);
    }
  };
  

  if (!userData) return null;

  return (
    <div className="relative min-h-screen bg-slate-50 p-2 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity shadow-lg
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header Halaman & Profil Singkat */}
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mt-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
            {userData.nama ? userData.nama.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Selamat datang kembali,</p>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">{userData.nama || 'Petugas Pendataan'}</h1>
          </div>
        </div>
        
        
        {/* Tombol Logout dipindah ke FAB, Header menjadi lebih lega */}
        <div className="hidden sm:flex items-center">
          <span className="text-xs font-semibold px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
            {userData.daftar_sls?.length || 0} Wilayah Tugas
          </span>
        </div>
      </div>

      {/* Bagian Dashboard / Ringkasan Statistik */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <LayoutDashboard className="text-teal-500" size={24} />
          <h2 className="text-xl font-extrabold text-gray-800">Dashboard Ringkasan</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Total Keluarga</p>
                <p className="text-4xl font-extrabold text-gray-800">{stats.totalKeluarga}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <FileText size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Total Penduduk</p>
                <p className="text-4xl font-extrabold text-gray-800">{stats.totalPenduduk}</p>
              </div>
              <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
                <Users size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Menunggu Sync</p>
                <p className={`text-4xl font-extrabold ${stats.unsynced > 0 ? 'text-orange-500' : 'text-gray-800'}`}>
                  {stats.unsynced}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stats.unsynced > 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                <Activity size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Menu Navigasi / Aksi Cepat */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Database className="text-blue-500" size={24} />
          <h2 className="text-xl font-extrabold text-gray-800">Menu Pendataan</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(userData && userData.role === 'KETUA RT') ? (
            <Link 
              to={`/list-keluarga?id_sls=${userData.daftar_sls}`}
              className="flex items-center p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="p-4 bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <FileText size={28} />
              </div>
              <div className="ml-5">
                <h3 className="font-bold text-gray-800 text-lg">Daftar Keluarga</h3>
                <p className="text-sm text-gray-500 mt-0.5">Lihat, edit, dan sync data keluarga</p>
              </div>
            </Link>
          ):(
            <Link 
            to="/list-sls"
            className="flex items-center p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="p-4 bg-gradient-to-br from-teal-400 to-teal-500 text-white rounded-xl shadow-sm group-hover:scale-105 transition-transform">
                <FileText size={28} />
              </div>
              <div className="ml-5">
                <h3 className="font-bold text-gray-800 text-lg">Daftar SLS</h3>
                <p className="text-sm text-gray-500 mt-0.5">Aprroval & Rejection</p>
              </div>
            </Link>
          )}

          {/* <Link 
            to="/form-keluarga"
            className="flex items-center p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
          >
            <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-500 text-white rounded-xl shadow-sm group-hover:scale-105 transition-transform">
              <UserPlus size={28} />
            </div>
            <div className="ml-5">
              <h3 className="font-bold text-gray-800 text-lg">Tambah Keluarga Baru</h3>
              <p className="text-sm text-gray-500 mt-0.5">Input Nomor KK dan Kepala Keluarga</p>
            </div>
          </Link> */}
        </div>
      </div>

      {/* Ornamen Desain Tambahan */}
      <div className="mt-auto pt-8 text-center pb-24">
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">SIDECANTIK</p>
      </div>

      {/* ========================================= */}
      {/* FLOATING ACTION BUTTON (FAB) MENU         */}
      {/* ========================================= */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <div className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
            isFabOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'
          }`}>
          
          {/* Tombol Logout di dalam FAB */}
          <div className='flex items-center text-red-500 gap-2'>
            {/* <span className="font-semibold pr-1">Keluar (Logout)</span> */}
            <button 
              onClick={() => { setIsFabOpen(false); handleLogout(); }} 
              className="flex items-center gap-2 bg-white text-red-500 p-4 rounded-full shadow-lg border border-gray-100 hover:bg-red-50 transition"
              >
              <LogOut size={28} />
              {/* <span className="font-semibold pr-1">Keluar (Logout)</span> */}
            </button>
          </div>

          {/* Tombol Sync Server Tarik Data Massal */}
          <div className='flex items-center text-teal-600 gap-2'>
            {/* <span className="font-semibold pr-1">
                {isSyncing ? 'Sedang Menarik Data...' : 'Sync Data Awal'}
            </span> */}
            <button 
              onClick={handleFullSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 p-4 rounded-full shadow-lg border transition ${
                isSyncing 
                ? 'bg-teal-50 border-teal-100 text-teal-400 cursor-not-allowed' 
                : 'bg-white border-gray-100 text-teal-600 hover:bg-teal-50'
              }`}
              >
              <RefreshCw size={28} className={isSyncing ? 'animate-spin' : ''} />
              {/* <span className="font-semibold pr-1">
                {isSyncing ? 'Sedang Menarik Data...' : 'Sync Data Awal'}
                </span> */}
            </button>
          </div>
        </div>

        {/* Tombol Utama FAB (Gradient Biru-Teal) */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`text-white p-4 rounded-full shadow-[0_8px_20px_rgba(45,212,191,0.4)] transition-all duration-300 hover:scale-110 focus:outline-none ${
            isFabOpen 
              ? 'bg-red-400 rotate-90 shadow-red-200' 
              : 'bg-gradient-to-r from-blue-400 to-teal-400 rotate-0'
          }`}
        >
          {isFabOpen ? <X size={28} /> : <Plus size={28} />}
        </button>
      </div>

    </div>
  );
}