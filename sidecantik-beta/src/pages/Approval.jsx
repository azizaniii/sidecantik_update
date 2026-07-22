import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ApprovalKadus() {
  const [searchParams] = useSearchParams();
  const idSlsTerpilih = searchParams.get('id_sls');
  const navigate = useNavigate();

  const [dataSubmitted, setDataSubmitted] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!idSlsTerpilih) {
      alert("Pilih SLS terlebih dahulu!");
      navigate('/kadus');
      return;
    }
    loadDataMenunggu();
  }, [idSlsTerpilih]);

  const loadDataMenunggu = () => {
    // Mengambil data keluarga dari local storage
    const semuaKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
    
    // Filter berlapis: Hanya untuk SLS yang dipilih DAN statusnya 'submitted'
    const menunggu = semuaKeluarga.filter(k => 
      (k.id_sls === idSlsTerpilih || k.id_sls_administrasi === idSlsTerpilih) && 
      k.status === 'submitted'
    );
    
    setDataSubmitted(menunggu);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
  };

  const handleApproval = async (idKeluarga, aksi) => {
    const statusBaru = aksi === 'terima' ? 'approved' : 'rejected';
    setIsLoading(true);

    try {
      // 1. Hit API Backend
      const response = await fetch(`/api/keluarga/approval/${idKeluarga}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status_baru: statusBaru,
          id_user_approver: currentUser.id 
        })
      });

      if (!response.ok) throw new Error("Gagal mengubah status di server");

      // 2. Update Local Storage agar UI langsung reaktif
      let lokalKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const index = lokalKeluarga.findIndex(k => k.id_keluarga === idKeluarga);
      if (index !== -1) {
        lokalKeluarga[index].status = statusBaru;
        localStorage.setItem('data_keluarga', JSON.stringify(lokalKeluarga));
      }

      showToast(`Data berhasil di-${statusBaru === 'approved' ? 'setujui' : 'tolak'}!`);
      loadDataMenunggu(); // Refresh UI
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses approval. Pastikan online.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 shadow-lg 
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header Panel Kadus */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-b-[2.5rem] p-6 pb-12 shadow-lg mb-[-2rem] relative z-10">
        <div className="flex items-center gap-4 text-white mb-6">
          <Link to="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Panel Approval Kadus</h1>
        </div>
        <p className="text-teal-100 text-sm">Validasi pendataan dari Ketua RT di wilayahmu.</p>
      </div>

      {/* List Keluarga Menunggu Persetujuan */}
      <div className="px-5 space-y-4 relative z-20">
        {dataSubmitted.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <Clock className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">Tidak ada data yang menunggu persetujuan saat ini.</p>
          </div>
        ) : (
          dataSubmitted.map((item) => (
            <div key={item.id_keluarga} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 transition hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800">{item.nama_kepala_keluarga}</h3>
                  <p className="text-sm text-slate-500 font-mono">KK: {item.no_kk}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                  Menunggu
                </span>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => handleApproval(item.id_keluarga, 'tolak')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-semibold transition"
                >
                  <XCircle size={18} /> Tolak
                </button>
                <button 
                  onClick={() => handleApproval(item.id_keluarga, 'terima')}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-blue-500 hover:shadow-lg transition"
                >
                  <CheckCircle size={18} /> Setujui
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}