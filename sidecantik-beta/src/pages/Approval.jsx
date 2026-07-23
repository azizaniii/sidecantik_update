import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, CheckSquare, Square } from 'lucide-react';

export default function ApprovalKadus() {
  const [searchParams] = useSearchParams();
  const idSlsTerpilih = searchParams.get('id_sls');
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [dataSubmitted, setDataSubmitted] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Ambil user dari localStorage (sebelumnya file ini memakai `currentUser`
  // tanpa pernah mendefinisikannya — itu menyebabkan crash saat approval diklik)
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('auth_user'));
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setCurrentUser(storedUser);
  }, [navigate]);

  useEffect(() => {
    if (!idSlsTerpilih) {
      alert("Pilih SLS terlebih dahulu!");
      navigate('/kadus');
      return;
    }
    loadDataMenunggu();
  }, [idSlsTerpilih]);

  const loadDataMenunggu = () => {
    const semuaKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
    const menunggu = semuaKeluarga.filter(k =>
      (k.id_sls === idSlsTerpilih || k.id_sls_administrasi === idSlsTerpilih) &&
      k.status === 'submitted'
    );
    setDataSubmitted(menunggu);
    setSelectedIds([]); // reset seleksi tiap kali data di-refresh
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Helper fetch terpusat: selalu menyisipkan token, redirect ke login kalau 401
  const apiFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), 'Authorization': `Bearer ${token}` },
    });
    if (res.status === 401) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      navigate('/login');
      throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    return res;
  };

  const updateStatusLokal = (idKeluargaList, statusBaru) => {
    let lokalKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
    lokalKeluarga = lokalKeluarga.map(k =>
      idKeluargaList.includes(k.id_keluarga) ? { ...k, status: statusBaru } : k
    );
    localStorage.setItem('data_keluarga', JSON.stringify(lokalKeluarga));
  };

  // ---- Approval satu-satu (tombol yang sudah ada, dipertahankan) ----
  const handleApproval = async (idKeluarga, aksi) => {
    const statusBaru = aksi === 'terima' ? 'approved' : 'rejected';
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/keluarga/approval/${idKeluarga}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status_baru: statusBaru,
          id_user_approver: currentUser?.id_user,
        }),
      });
      if (!response.ok) throw new Error("Gagal mengubah status di server");

      updateStatusLokal([idKeluarga], statusBaru);
      showToast(`Data berhasil di-${statusBaru === 'approved' ? 'setujui' : 'tolak'}!`);
      loadDataMenunggu();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memproses approval. Pastikan online.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Approval massal (bulk) ----
  const toggleSelect = (idKeluarga) => {
    setSelectedIds(prev =>
      prev.includes(idKeluarga) ? prev.filter(id => id !== idKeluarga) : [...prev, idKeluarga]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === dataSubmitted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(dataSubmitted.map(k => k.id_keluarga));
    }
  };

  const handleBulkApproval = async (aksi) => {
    if (selectedIds.length === 0) {
      showToast('Pilih minimal satu data terlebih dahulu.', 'error');
      return;
    }
    const statusBaru = aksi === 'terima' ? 'approved' : 'rejected';
    const labelAksi = statusBaru === 'approved' ? 'menyetujui' : 'menolak';

    if (!window.confirm(`Yakin ingin ${labelAksi} ${selectedIds.length} data sekaligus?`)) return;

    setIsBulkLoading(true);
    try {
      const response = await apiFetch('/api/keluarga/approval-bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_keluarga_list: selectedIds,
          status_baru: statusBaru,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Gagal memproses approval massal');

      if (json.berhasil.length > 0) {
        updateStatusLokal(json.berhasil, statusBaru);
      }

      if (json.gagal.length > 0) {
        showToast(
          `${json.berhasil.length} data berhasil diproses, ${json.gagal.length} gagal (lihat console untuk detail).`,
          'error'
        );
        console.warn('Data yang gagal diproses saat bulk approval:', json.gagal);
      } else {
        showToast(`Berhasil memproses ${json.berhasil.length} data sekaligus!`);
      }

      loadDataMenunggu();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memproses approval massal.', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const semuaTerpilih = dataSubmitted.length > 0 && selectedIds.length === dataSubmitted.length;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 shadow-lg
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-b-[2.5rem] p-6 pb-12 shadow-lg mb-[-2rem] relative z-10">
        <div className="flex items-center gap-4 text-white mb-6">
          <Link to="/" className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Panel Approval Kadus</h1>
        </div>
        <p className="text-teal-100 text-sm">Validasi pendataan dari Ketua RT di wilayahmu.</p>
      </div>

      <div className="px-5 space-y-4 relative z-20">
        {dataSubmitted.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
            <Clock className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">Tidak ada data yang menunggu persetujuan saat ini.</p>
          </div>
        ) : (
          <>
            {/* Toolbar bulk action */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                {semuaTerpilih ? <CheckSquare size={20} className="text-teal-600" /> : <Square size={20} />}
                {semuaTerpilih ? 'Batalkan Semua' : 'Pilih Semua'}
                <span className="text-slate-400 font-normal">({selectedIds.length}/{dataSubmitted.length} dipilih)</span>
              </button>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleBulkApproval('tolak')}
                  disabled={isBulkLoading || selectedIds.length === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <XCircle size={16} /> Tolak Terpilih
                </button>
                <button
                  onClick={() => handleBulkApproval('terima')}
                  disabled={isBulkLoading || selectedIds.length === 0}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-blue-500 hover:shadow-lg font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={16} /> {isBulkLoading ? 'Memproses...' : 'Setujui Terpilih'}
                </button>
              </div>
            </div>

            {dataSubmitted.map((item) => {
              const isChecked = selectedIds.includes(item.id_keluarga);
              return (
                <div
                  key={item.id_keluarga}
                  className={`bg-white rounded-2xl shadow-sm border p-5 transition hover:shadow-md ${
                    isChecked ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleSelect(item.id_keluarga)}
                        className="mt-1 shrink-0"
                        aria-label="Pilih data ini"
                      >
                        {isChecked ? <CheckSquare size={22} className="text-teal-600" /> : <Square size={22} className="text-slate-300" />}
                      </button>
                      <div>
                        <h3 className="font-bold text-slate-800">{item.nama_kepala_keluarga}</h3>
                        <p className="text-sm text-slate-500 font-mono">KK: {item.no_kk}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 shrink-0">
                      Menunggu
                    </span>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleApproval(item.id_keluarga, 'tolak')}
                      disabled={isLoading || isBulkLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-semibold transition disabled:opacity-40"
                    >
                      <XCircle size={18} /> Tolak
                    </button>
                    <button
                      onClick={() => handleApproval(item.id_keluarga, 'terima')}
                      disabled={isLoading || isBulkLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-blue-500 hover:shadow-lg font-semibold transition disabled:opacity-40"
                    >
                      <CheckCircle size={18} /> Setujui
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
