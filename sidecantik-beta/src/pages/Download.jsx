import React, { useState } from 'react';
import { Download, FileText, Users, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DownloadDataApi() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoadingKeluarga, setIsLoadingKeluarga] = useState(false);
  const [isLoadingPenduduk, setIsLoadingPenduduk] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 2500);
  };

  // Fungsi utilitas untuk mengubah JSON menjadi format CSV 
  const convertToCSV = (objArray) => {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    if (array.length === 0) return '';
    
    const headers = Object.keys(array[0]).join(',');
    const rows = array.map(obj => {
      return Object.values(obj).map(val => {
        // Pengamanan karakter khusus dan koma agar CSV tidak rusak [cite: 1250, 1251]
        const stringVal = String(val === null || val === undefined ? '' : val);
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    return [headers, ...rows].join('\n');
  };

  // Fungsi utilitas untuk memicu unduhan file menggunakan Blob [cite: 1252]
  const triggerDownload = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch API untuk Keluarga
  const handleDownloadKeluarga = async () => {
    setIsLoadingKeluarga(true);
    try {
      // Pastikan endpoint ini tersedia di routes/keluarga.js backend-mu
      const response = await fetch('/api/keluarga/all'); 
      if (!response.ok) throw new Error('Gagal mengambil data dari server');
      
      const dataKeluarga = await response.json();
      
      if (dataKeluarga.length === 0) {
        showToast('Data keluarga di server masih kosong!', 'error');
        return;
      }

      const csvData = convertToCSV(dataKeluarga);
      triggerDownload(csvData, `Data_Keluarga_Server_${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Berhasil mengunduh Data Keluarga dari Server! 🚀');
    } catch (error) {
      console.error(error);
      showToast('Gagal terhubung ke server ❌', 'error');
    } finally {
      setIsLoadingKeluarga(false);
    }
  };

  // Fetch API untuk Penduduk
  const handleDownloadPenduduk = async () => {
    setIsLoadingPenduduk(true);
    try {
      // Pastikan endpoint ini tersedia di routes/penduduk.js backend-mu
      const response = await fetch('/api/penduduk/all'); 
      if (!response.ok) throw new Error('Gagal mengambil data dari server');
      
      const dataPenduduk = await response.json();
      
      if (dataPenduduk.length === 0) {
        showToast('Data penduduk di server masih kosong!', 'error');
        return;
      }

      const csvData = convertToCSV(dataPenduduk);
      triggerDownload(csvData, `Data_Penduduk_Server_${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Berhasil mengunduh Data Penduduk dari Server! 🚀');
    } catch (error) {
      console.error(error);
      showToast('Gagal terhubung ke server ❌', 'error');
    } finally {
      setIsLoadingPenduduk(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-28 relative overflow-hidden">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity shadow-lg 
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Blob Backgrounds  */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Header Halaman */}
      <div className="relative z-10 max-w-lg mx-auto mb-6">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition w-fit mb-4"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Kembali ke Home</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Unduh Data Server</h1>
        <p className="text-sm text-gray-500 mt-1">Ekspor data langsung dari database terpusat (MySQL) ke dalam format CSV.</p>
      </div>

      {/* Kartu Tombol Download  */}
      <div className="relative z-10 max-w-lg mx-auto space-y-4">
        
        {/* Kartu Keluarga */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText size={28} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-gray-800">Data Keluarga</h2>
            <p className="text-xs text-gray-500">Tarik seluruh entitas data induk keluarga dari server.</p>
          </div>
          <button 
            onClick={handleDownloadKeluarga}
            disabled={isLoadingKeluarga}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl transition shadow-sm 
              ${isLoadingKeluarga 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 hover:shadow-md'
              }`}
          >
            {isLoadingKeluarga ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Mengambil...
              </>
            ) : (
              <>
                <Download size={18} />
                Unduh CSV
              </>
            )}
          </button>
        </div>

        {/* Kartu Penduduk */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Users size={28} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-bold text-gray-800">Data Penduduk</h2>
            <p className="text-xs text-gray-500">Tarik seluruh entitas anggota keluarga dari server.</p>
          </div>
          <button 
            onClick={handleDownloadPenduduk}
            disabled={isLoadingPenduduk}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl transition shadow-sm 
              ${isLoadingPenduduk 
                ? 'bg-teal-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 hover:shadow-md'
              }`}
          >
            {isLoadingPenduduk ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Mengambil...
              </>
            ) : (
              <>
                <Download size={18} />
                Unduh CSV
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}