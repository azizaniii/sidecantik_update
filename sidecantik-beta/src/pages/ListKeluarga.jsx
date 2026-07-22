import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  User, 
  Plus, 
  X, 
  RefreshCw,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';

export default function ListKeluarga() {
  const navigate = useNavigate();
  const [keluargaData, setKeluargaData] = useState([]);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // State untuk Pencarian dan Accordion
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [searchParams] = useSearchParams();
  const idSls = searchParams.get('id_sls');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('auth_user'));
    setUserData(storedUser);
    loadLocalData();
  }, []);

  const loadLocalData = () => {
    if(idSls){
      const data = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const slsSaatIni = data.filter(k => k.id_sls_administrasi === idSls);
      setKeluargaData(slsSaatIni);
    }
  };

  // Logika Pencarian (Filter Data secara Real-time)
  const filteredData = keluargaData.filter(item => 
    item.nama_kepala_keluarga?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.no_kk?.includes(searchTerm) || item.nomor_kk?.includes(searchTerm)
  );

  const handleSync = async (selectedSlsId = null) => {
    // Logika sinkronisasi sama seperti sebelumnya
  };

  return (
    <div className="relative min-h-screen bg-slate-50 p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-6 font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity shadow-lg
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col gap-3">
        {/* Tombol Kembali ke Home */}
        <Link 
          to={userData && userData.role === 'KETUA RT' ? '/' : '/list-sls'} 
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition w-fit"
        >
          <ArrowLeft size={20} />
          {(userData && userData.role === 'KETUA RT') ? (
            <span className="font-medium">Kembali ke Home</span>
          ):(
            <span className="font-medium">Kembali</span>
          )}
        </Link>

        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Daftar Keluarga</h1>
          <div className="w-16 h-1 bg-teal-400 rounded-full mt-2"></div>
        </div>
      </div>

      {/* Baris Pencarian & Filter */}
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
      </div>

      {/* Daftar Data (List View Modern + Accordion) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header List */}
        <div className="grid grid-cols-[3rem_1fr_auto] items-center p-4 border-b border-gray-100 bg-white text-gray-500 font-semibold text-sm">
          <div className="text-center">No</div>
          <div>Nama Kepala Keluarga</div>
        </div>

        {/* Isi Data */}
        <div className="flex flex-col">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => {
              // Mengecek apakah baris ini sedang di-klik/dibuka
              const isExpanded = expandedRow === (item.id_keluarga || item.id);
              
              // Logika Warna Status (Kuning = Open, Oranye = Draft, Biru = Submitted)
              let statusBg = "bg-grey-50/60"; 
              let statusBadge = "bg-yellow-100 text-yellow-600";
              
              if (item.status === 'submitted') {
                statusBg = "bg-blue-200/60";
                statusBadge = "bg-blue-100 text-blue-600";
              } else if (item.status === 'draft') {
                statusBg = "bg-orange-200/60";
                statusBadge = "bg-orange-100 text-orange-600";
              } else if (item.status === 'selesai'){
                statusBg = "bg-yellow-200/60";
                statusBadge = "bg-yellow-100 text-yellow-600";
              } else if (item.status === 'approved'){
                statusBg = "bg-green-200/60";
                statusBadge = "bg-green-100 text-green-600";
              } else if (item.status === 'rejected'){
                statusBg = "bg-red-200/60";
                statusBadge = "bg-red-100 text-red-600";
              }

              return (
                <div key={item.id_keluarga || item.id} className="flex flex-col border-b border-gray-50 last:border-0">
                  
                  {/* MAIN ROW (Bisa Diklik) */}
                  <div 
                    onClick={() => setExpandedRow(isExpanded ? null : (item.id_keluarga || item.id))}
                    className={`grid grid-cols-[3rem_1fr_auto] items-center p-3 sm:p-4 cursor-pointer transition-all duration-300
                      ${isExpanded 
                        ? 'bg-gradient-to-r from-blue-400 to-teal-400 text-white shadow-md scale-[1.01] rounded-lg mx-2 mt-2 z-10' 
                        : `${statusBg} text-gray-700 hover:bg-gray-50`
                      }`}
                  >
                    <div className={`text-center font-medium ${isExpanded ? 'text-white' : 'text-gray-500'}`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex items-center gap-3 font-medium">
                      {/* Ikon Avatar */}
                      <div className={`p-2 rounded-full flex-shrink-0 ${isExpanded ? 'bg-white/20' : 'bg-white shadow-sm border border-gray-100 text-blue-500'}`}>
                        <User size={18} className={isExpanded ? 'text-white' : ''} />
                      </div>
                      <span className="truncate pr-2">{item.nama_kepala_keluarga}</span>
                    </div>

                    {/* Area Kanan (Badge Status atau Ikon Panah) */}
                    <div className="flex items-center justify-end pr-2 gap-2">
                      {/* {!isExpanded && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge}`}>
                          {item.status || 'open'}
                        </span>
                      )} */}
                      {isExpanded ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* ACCORDION ROW (Panel Detail Tersembunyi) */}
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
                            <p className="font-bold text-gray-800 text-base">{item.status.toUpperCase()}</p>
                          </div>

                          { item.status.toUpperCase() === 'REJECTED' && (
                            <div className="flex flex-col gap-1 text-sm">
                              <p className="text-gray-500 font-medium">Catatan Reject:</p>
                              <p className="font-bold text-red-800 text-base">{item.catatan_reject}</p>
                            </div>
                          )}

                          {/* Tombol Arahkan ke Halaman Detail */}
                          <div className="mt-3">
                            {(userData.role.toUpperCase() === 'KEPALA DUSUN') && (
                              <Link 
                                to={`/form/blok1?id_keluarga=${item.id_keluarga || item.id}`}
                                className="inline-flex items-center justify-center bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 shadow-sm"
                              >
                                Open
                              </Link>
                            )}
                            {(userData.role.toUpperCase() === 'KETUA RT') && (
                              (item.status && item.status.toUpperCase() === 'OPEN' || item.status.toUpperCase() === 'DRAFT' || item.status.toUpperCase() === 'REJECTED') ? (
                                <Link 
                                  to={`/form/blok1?id_keluarga=${item.id_keluarga || item.id}`}
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