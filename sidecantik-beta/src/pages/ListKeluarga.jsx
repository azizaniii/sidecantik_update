import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  User,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function ListKeluarga() {
  const navigate = useNavigate();
  const [keluargaData, setKeluargaData] = useState([]);
  const [userData, setUserData] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [searchParams] = useSearchParams();
  const idSls = searchParams.get('id_sls');

  const isKepalaDusun = userData?.role?.toUpperCase() === 'KEPALA DUSUN';

  // Label yang ditampilkan ke pengguna untuk tiap status internal
  const LABEL_STATUS = {
    open: 'Open',
    draft: 'Draft',
    submitted: 'Menunggu Persetujuan Kadus',
    menunggu_sekdes: 'Disetujui oleh Kadus',
    menunggu_kades: 'Disetujui oleh Sekdes',
    disetujui: 'Disetujui oleh Kades',
    ditolak_kadus: 'Ditolak oleh Kadus',
    ditolak_sekdes: 'Ditolak oleh Sekdes',
    ditolak_kades: 'Ditolak oleh Kades',
    selesai: 'Selesai',
  };
  const getLabelStatus = (status) => LABEL_STATUS[status] || status?.toUpperCase() || '-';

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
  };

  // Helper fetch terpusat: selalu menyisipkan token, auto-redirect kalau 401
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

  const loadLocalData = () => {
    if (idSls) {
      const data = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const slsSaatIni = data.filter(k => k.id_sls_administrasi === idSls);
      setKeluargaData(slsSaatIni);
    }
  };

  const handleSync = async (selectedSlsId = null) => {
    const targetSls = selectedSlsId || idSls;
    if (!targetSls) {
      showToast('SLS tidak diketahui, tidak bisa sinkronisasi.', 'error');
      return;
    }

    // Kepala Dusun melihat semua tahap approval (submitted, menunggu_sekdes,
    // menunggu_kades, disetujui, ditolak_kadus, ditolak_sekdes, ditolak_kades),
    // TAPI TIDAK 'open'/'draft' yang masih murni pekerjaan Ketua RT.
    // Ketua RT tetap pakai endpoint penuh karena itu data kerja mereka sendiri.
    const endpoint = isKepalaDusun
      ? `/api/keluarga/kadus/sls/${targetSls}`
      : `/api/keluarga/sls/${targetSls}`;

    setIsSyncing(true);
    try {
      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error('Gagal mengambil data dari server');
      const dataDariServer = await res.json();

      const dataLokalSemua = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const dataLokalSlsLain = dataLokalSemua.filter(k => k.id_sls_administrasi !== targetSls);
      const dataGabungan = [...dataLokalSlsLain, ...dataDariServer];
      localStorage.setItem('data_keluarga', JSON.stringify(dataGabungan));

      setKeluargaData(dataDariServer);
      setSelectedIds([]);
      showToast(`Berhasil sinkron ${dataDariServer.length} data keluarga.`);
    } catch (err) {
      console.error('Error sync keluarga:', err);
      showToast(err.message || 'Gagal sinkronisasi data', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('auth_user'));
    setUserData(storedUser);
    loadLocalData();

    if (idSls) {
      const data = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const slsSaatIni = data.filter(k => k.id_sls_administrasi === idSls);
      if (slsSaatIni.length === 0) {
        handleSync(idSls);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSls]);

  const updateStatusLokal = (idKeluargaList, statusBaru) => {
    let lokalKeluarga = JSON.parse(localStorage.getItem('data_keluarga')) || [];
    lokalKeluarga = lokalKeluarga.map(k =>
      idKeluargaList.includes(k.id_keluarga || k.id) ? { ...k, status: statusBaru } : k
    );
    localStorage.setItem('data_keluarga', JSON.stringify(lokalKeluarga));

    setKeluargaData(prev =>
      prev.map(k => (idKeluargaList.includes(k.id_keluarga || k.id) ? { ...k, status: statusBaru } : k))
    );
  };

  // ---- Approval satu-satu (khusus Kepala Dusun, untuk item status submitted/ditolak_sekdes) ----
  // Memakai endpoint approval berjenjang tahap Kadus:
  // terima -> status pindah ke 'menunggu_sekdes', tolak -> 'ditolak_kadus'
  const handleApproval = async (idKeluarga, aksi) => {
    const statusBaru = aksi === 'terima' ? 'menunggu_sekdes' : 'ditolak_kadus';
    setIsApprovalLoading(true);
    try {
      const response = await apiFetch(`/api/keluarga/approval-kadus/${idKeluarga}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Gagal mengubah status di server');

      updateStatusLokal([idKeluarga], statusBaru);
      showToast(`Data berhasil di-${aksi === 'terima' ? 'setujui' : 'tolak'}!`);
      setSelectedIds(prev => prev.filter(id => id !== idKeluarga));
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memproses approval.', 'error');
    } finally {
      setIsApprovalLoading(false);
    }
  };

  // ---- Approval massal (bulk) ----
  // Item yang bisa diproses Kadus: baru disubmit RT ('submitted'), ATAU
  // data yang sebelumnya sudah lolos ke Sekdes lalu ditolak dan kembali ke Kadus ('ditolak_sekdes')
  const statusBisaDiprosesKadus = ['submitted', 'ditolak_sekdes'];
  const submittedItems = keluargaData.filter(k => statusBisaDiprosesKadus.includes(k.status));

  const toggleSelect = (id) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    const submittedIds = submittedItems.map(k => k.id_keluarga || k.id);
    if (selectedIds.length === submittedIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(submittedIds);
    }
  };

  // Memakai endpoint approval berjenjang bulk tahap Kadus:
  // terima -> status pindah ke 'menunggu_sekdes', tolak -> 'ditolak_kadus'
  const handleBulkApproval = async (aksi) => {
    if (selectedIds.length === 0) {
      showToast('Pilih minimal satu data terlebih dahulu.', 'error');
      return;
    }
    const statusBaru = aksi === 'terima' ? 'menunggu_sekdes' : 'ditolak_kadus';
    const labelAksi = aksi === 'terima' ? 'menyetujui' : 'menolak';

    if (!window.confirm(`Yakin ingin ${labelAksi} ${selectedIds.length} data sekaligus?`)) return;

    setIsBulkLoading(true);
    try {
      const response = await apiFetch('/api/keluarga/approval-kadus-bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_keluarga_list: selectedIds, aksi }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Gagal memproses approval massal');

      if (json.berhasil.length > 0) updateStatusLokal(json.berhasil, statusBaru);

      if (json.gagal.length > 0) {
        showToast(`${json.berhasil.length} berhasil, ${json.gagal.length} gagal (lihat console).`, 'error');
        console.warn('Data gagal diproses saat bulk approval:', json.gagal);
      } else {
        showToast(`Berhasil memproses ${json.berhasil.length} data sekaligus!`);
      }
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Gagal memproses approval massal.', 'error');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const filteredData = keluargaData.filter(item =>
    item.nama_kepala_keluarga?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.no_kk?.includes(searchTerm) || item.nomor_kk?.includes(searchTerm)
  );

  const semuaSubmittedTerpilih = submittedItems.length > 0 && selectedIds.length === submittedItems.length;

  return (
    <div className="relative min-h-screen bg-slate-50 p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6 font-sans">

      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity shadow-lg
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link
          to={userData && userData.role === 'KETUA RT' ? '/' : '/list-sls'}
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition w-fit"
        >
          <ArrowLeft size={20} />
          {(userData && userData.role === 'KETUA RT') ? (
            <span className="font-medium">Kembali ke Home</span>
          ) : (
            <span className="font-medium">Kembali</span>
          )}
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Daftar Keluarga</h1>
          <div className="w-16 h-1 bg-teal-400 rounded-full mt-2"></div>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama atau No KK..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 transition shadow-sm text-gray-700"
          />
        </div>
        <button
          onClick={() => handleSync()}
          disabled={isSyncing}
          title="Sinkronkan data dari server"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl shadow-sm transition"
        >
          <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{isSyncing ? 'Sinkron...' : 'Sync'}</span>
        </button>
      </div>

      {/* Toolbar bulk approval — hanya untuk Kepala Dusun, hanya kalau ada data submitted */}
      {isKepalaDusun && submittedItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            {semuaSubmittedTerpilih ? <CheckSquare size={20} className="text-teal-600" /> : <Square size={20} />}
            {semuaSubmittedTerpilih ? 'Batalkan Semua' : 'Pilih Semua (Menunggu)'}
            <span className="text-slate-400 font-normal">({selectedIds.length}/{submittedItems.length} dipilih)</span>
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
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className={`grid ${isKepalaDusun ? 'grid-cols-[2.5rem_3rem_1fr_auto]' : 'grid-cols-[3rem_1fr_auto]'} items-center p-4 border-b border-gray-100 bg-white text-gray-500 font-semibold text-sm`}>
          {isKepalaDusun && <div></div>}
          <div className="text-center">No</div>
          <div>Nama Kepala Keluarga</div>
        </div>

        <div className="flex flex-col">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => {
              const itemId = item.id_keluarga || item.id;
              const isExpanded = expandedRow === itemId;
              const isSubmitted = statusBisaDiprosesKadus.includes(item.status);
              const isChecked = selectedIds.includes(itemId);

              let statusBg = "bg-grey-50/60";
              let statusBadge = "bg-yellow-100 text-yellow-600";

              if (item.status === 'submitted') {
                statusBg = "bg-blue-200/60";
                statusBadge = "bg-blue-100 text-blue-600";
              } else if (item.status === 'draft') {
                statusBg = "bg-orange-200/60";
                statusBadge = "bg-orange-100 text-orange-600";
              } else if (item.status === 'selesai') {
                statusBg = "bg-yellow-200/60";
                statusBadge = "bg-yellow-100 text-yellow-600";
              } else if (item.status === 'menunggu_sekdes') {
                statusBg = "bg-purple-200/60";
                statusBadge = "bg-purple-100 text-purple-600";
              } else if (item.status === 'menunggu_kades') {
                statusBg = "bg-indigo-200/60";
                statusBadge = "bg-indigo-100 text-indigo-600";
              } else if (item.status === 'disetujui') {
                statusBg = "bg-green-200/60";
                statusBadge = "bg-green-100 text-green-600";
              } else if (item.status === 'ditolak_kadus') {
                statusBg = "bg-red-200/60";
                statusBadge = "bg-red-100 text-red-600";
              } else if (item.status === 'ditolak_sekdes') {
                statusBg = "bg-rose-200/60";
                statusBadge = "bg-rose-100 text-rose-600";
              } else if (item.status === 'ditolak_kades') {
                statusBg = "bg-pink-200/60";
                statusBadge = "bg-pink-100 text-pink-600";
              }

              return (
                <div key={itemId} className="flex flex-col border-b border-gray-50 last:border-0">

                  <div
                    className={`grid ${isKepalaDusun ? 'grid-cols-[2.5rem_3rem_1fr_auto]' : 'grid-cols-[3rem_1fr_auto]'} items-center p-3 sm:p-4 transition-all duration-300
                      ${isExpanded
                        ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white shadow-md scale-[1.01] rounded-lg mx-2 mt-2 z-10'
                        : `${statusBg} text-gray-700 hover:bg-gray-50`
                      }`}
                  >
                    {/* Checkbox — hanya untuk Kepala Dusun, hanya kalau statusnya submitted */}
                    {isKepalaDusun && (
                      <div className="flex justify-center">
                        {isSubmitted ? (
                          <button onClick={() => toggleSelect(itemId)} aria-label="Pilih data ini">
                            {isChecked ? (
                              <CheckSquare size={20} className={isExpanded ? 'text-white' : 'text-teal-600'} />
                            ) : (
                              <Square size={20} className={isExpanded ? 'text-white/70' : 'text-slate-300'} />
                            )}
                          </button>
                        ) : null}
                      </div>
                    )}

                    <div
                      onClick={() => setExpandedRow(isExpanded ? null : itemId)}
                      className={`text-center font-medium cursor-pointer ${isExpanded ? 'text-white' : 'text-gray-500'}`}
                    >
                      {index + 1}
                    </div>

                    <div
                      onClick={() => setExpandedRow(isExpanded ? null : itemId)}
                      className="flex items-center gap-3 font-medium cursor-pointer"
                    >
                      <div className={`p-2 rounded-full flex-shrink-0 ${isExpanded ? 'bg-white/20' : 'bg-white shadow-sm border border-gray-100 text-blue-500'}`}>
                        <User size={18} className={isExpanded ? 'text-white' : ''} />
                      </div>
                      <span className="truncate pr-2">{item.nama_kepala_keluarga}</span>
                    </div>

                    <div
                      onClick={() => setExpandedRow(isExpanded ? null : itemId)}
                      className="flex items-center justify-end pr-2 gap-2 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 border-x border-b border-gray-100 rounded-b-lg mx-2 mb-2 shadow-inner">
                      <div className="p-4">
                        <div className="flex flex-col gap-3 pl-4 border-l-4 border-teal-400">

                          <div className="flex flex-col gap-1 text-sm">
                            <p className="text-gray-500 font-medium">Nomor KK:</p>
                            <p className="font-bold text-gray-800 text-base">{item.no_kk || item.nomor_kk}</p>
                          </div>

                          <div className="flex flex-col gap-1 text-sm">
                            <p className="text-gray-500 font-medium">Nama Kepala Keluarga:</p>
                            <p className="font-bold text-gray-800 text-base">{item.nama_kepala_keluarga}</p>
                          </div>

                          <div className="flex flex-col gap-1 text-sm">
                            <p className="text-gray-500 font-medium">Status:</p>
                            <p className="font-bold text-gray-800 text-base">{getLabelStatus(item.status)}</p>
                          </div>

                          {['ditolak_kadus', 'ditolak_sekdes', 'ditolak_kades'].includes(item.status) && (
                            <div className="flex flex-col gap-1 text-sm">
                              <p className="text-gray-500 font-medium">Catatan Penolakan:</p>
                              <p className="font-bold text-red-800 text-base">{item.catatan_reject}</p>
                            </div>
                          )}

                          {/* Tombol approval satu-satu — khusus Kepala Dusun, untuk status submitted/ditolak_sekdes */}
                          {isKepalaDusun && isSubmitted && (
                            <div className="mt-2 flex gap-3">
                              <button
                                onClick={() => handleApproval(itemId, 'tolak')}
                                disabled={isApprovalLoading || isBulkLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 font-semibold transition disabled:opacity-40"
                              >
                                <XCircle size={18} /> Tolak
                              </button>
                              <button
                                onClick={() => handleApproval(itemId, 'terima')}
                                disabled={isApprovalLoading || isBulkLoading}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-white bg-gradient-to-r from-teal-500 to-blue-500 hover:shadow-lg font-semibold transition disabled:opacity-40"
                              >
                                <CheckCircle size={18} /> Setujui
                              </button>
                            </div>
                          )}

                          <div className="mt-3">
                            {(userData?.role?.toUpperCase() === 'KEPALA DUSUN') && (
                              statusBisaDiprosesKadus.includes(item.status) ? (
                                <Link
                                  to={`/form/blok1?id_keluarga=${itemId}`}
                                  className="inline-flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 shadow-sm"
                                >
                                  Open
                                </Link>
                              ) : (
                                <div></div>
                              )
                            )}
                            {(userData?.role?.toUpperCase() === 'KETUA RT') && (
                              (item.status && ['open', 'draft', 'ditolak_kadus'].includes(item.status)) ? (
                                <Link
                                  to={`/form/blok1?id_keluarga=${itemId}`}
                                  className="inline-flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 shadow-sm"
                                >
                                  Open
                                </Link>
                              ) : (
                                <div></div>
                              )
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center p-10 text-gray-500 flex flex-col items-center gap-2">
              <User size={32} className="opacity-20" />
              <p>Data keluarga tidak ditemukan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
