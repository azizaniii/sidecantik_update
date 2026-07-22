import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  ArrowLeft, 
  ArrowRight,
  CheckCircle, 
  Trash2, 
  UserCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  AlertTriangle
} from 'lucide-react';

// Helper untuk format tanggal yang rapi
const formatTanggal = (tanggal) => {
  if (!tanggal) return '-';
  const date = new Date(tanggal);
  if (isNaN(date)) return tanggal;
  
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  
  return `${d}/${m}/${y}`;
};

export default function DetailKeluarga() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idKeluarga = searchParams.get('id_keluarga');

  const [keluargaInfo, setKeluargaInfo] = useState(null);
  const [anggotaKeluarga, setAnggotaKeluarga] = useState([]);

  const [userData, setUserData] = useState(null);

  // State untuk melacak baris mana yang accordion-nya sedang terbuka
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    const dataUser = JSON.parse(localStorage.getItem('auth_user')) || [];
    setUserData(dataUser);
    if (idKeluarga) {
      const dataKeluargaLokal = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      const keluargaSaatIni = dataKeluargaLokal.find(k => k.id_keluarga === idKeluarga);
      setKeluargaInfo(keluargaSaatIni);

      const dataPendudukLokal = JSON.parse(localStorage.getItem('data_penduduk')) || [];
      const anggotaTerkait = dataPendudukLokal.filter(p => p.id_keluarga === idKeluarga);
      
      
      anggotaTerkait.sort((a, b) => {
        if (a.status_hubungan_keluarga === 'KEPALA KELUARGA') return -1;
        if (b.status_hubungan_keluarga === 'KEPALA KELUARGA') return 1;
        return 0;
      });

      setAnggotaKeluarga(anggotaTerkait);
    }
  }, [idKeluarga]);

  const cekKelengkapanData = (anggota) => {
    const fieldWajib = [
      'no_urut_anggota', 'nama', 'nik', 'status_hubungan_keluarga', 'status_penduduk', 
      'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 
      'agama', 'status_perkawinan', 'pendidikan_tertinggi', 'pekerjaan'
    ];

    // Mengembalikan 'true' HANYA JIKA semua field di atas ada nilainya dan tidak kosong
    return fieldWajib.every(field => anggota[field] && anggota[field].toString().trim() !== '');
  };


  if (!keluargaInfo) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-500 font-medium">
      Memuat data keluarga...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
      {/* Background Blobs (Tema Modern) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Konten Utama dengan pb-28 agar tidak tertutup footer */}
      <div className="flex-1 w-full max-w-xl mx-auto p-4 md:p-8 relative z-10 pb-28">
        
        {/* Header Blok 3 */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="bg-gradient-to-br from-teal-400 to-blue-500 p-3 rounded-xl text-white shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-teal-600 tracking-wide uppercase">Blok III</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Anggota Keluarga</h1>
          </div>
        </div>

        {/* Info Singkat Keluarga */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-50 to-blue-50 rounded-bl-full -z-0 opacity-70"></div>
          <div className="relative z-10">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nomor Kartu Keluarga</p>
            <p className="text-lg font-bold text-slate-800">{keluargaInfo.no_kk || keluargaInfo.nomor_kk || '-'}</p>
          </div>
          <div className="text-right relative z-10">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Total Anggota</p>
            <p className="text-lg font-bold text-teal-600">{anggotaKeluarga.length} Orang</p>
          </div>
        </div>

        {/* Tombol Tambah Anggota */}
        {(userData && userData.role === 'KETUA RT') ? (
          <button
            onClick={() => navigate(`/form/blok3/?id_keluarga=${idKeluarga}`)}
            className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-3.5 rounded-xl transition duration-200 flex items-center justify-center space-x-2 mb-6 shadow-sm"
            >
            <UserPlus className="w-5 h-5" />
            <span>Tambah Anggota Baru</span>
          </button>
          ):(
            <div></div>
          )}

        {/* Daftar Anggota Keluarga (List View dengan Accordion) */}
        <div className="space-y-3">
          {anggotaKeluarga.map((anggota, index) => {
            const isExpanded = expandedRow === anggota.id_anggota_keluarga;

            return (
              <div key={anggota.id_anggota_keluarga || index} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                
                {/* Baris Utama (Bisa di-klik untuk membuka Accordion) */}
                <div 
                  onClick={() => setExpandedRow(isExpanded ? null : anggota.id_anggota_keluarga)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-gradient-to-r from-teal-400 to-blue-500 text-white' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full flex-shrink-0 ${isExpanded ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm md:text-base ${isExpanded ? 'text-white' : 'text-slate-800'}`}>
                        {anggota.nama || anggota.nama_lengkap}
                      </h3>
                      <p className={`text-xs font-medium ${isExpanded ? 'text-teal-50' : 'text-slate-500'}`}>
                        {anggota.status_hubungan_keluarga}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cekKelengkapanData(anggota) ? (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isExpanded ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        <CheckCircle size={12} /> Lengkap
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isExpanded ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                        <AlertTriangle size={12} /> Belum Lengkap
                      </span>
                    )}
                    
                    <div>
                      {isExpanded ? <ChevronUp size={20} className="text-white" /> : <ChevronDown size={20} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Panel Accordion (Rincian Anggota) */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-5">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">NIK</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.nik || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Umur</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.umur ? `${anggota.umur} Tahun` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">TTL</p>
                        <p className="font-bold text-slate-800 mt-0.5">
                          {anggota.tempat_lahir || '-'}, {formatTanggal(anggota.tanggal_lahir)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Status Pernikahan</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.status_perkawinan || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Pendidikan (KK)</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.pendidikan_tertinggi || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Pekerjaan</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.pekerjaan || '-'}</p>
                      </div>
                      {/* <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Golongan Darah</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.golongan_darah || '-'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium text-xs uppercase">Status</p>
                        <p className="font-bold text-slate-800 mt-0.5">{anggota.status || '-'}</p>
                      </div> */}
                    </div>

                    {/* Tombol Aksi di dalam Accordion */}
                    {( userData.role === 'KETUA RT' &&
                      <div className="flex gap-3 border-t border-slate-200 pt-4">
                        {cekKelengkapanData(anggota) ? (
                          <Link 
                          to={`/form/blok3?id_keluarga=${idKeluarga}&id_anggota_keluarga=${anggota.id_anggota_keluarga}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
                          >
                            <Edit3 size={16} /> Edit Data
                          </Link>
                        ) : (
                          <Link 
                          to={`/form/blok3?id_keluarga=${idKeluarga}&id_anggota_keluarga=${anggota.id_anggota_keluarga}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
                          >
                            <Edit3 size={16} /> Lengkapi Data
                          </Link>
                        )}
                      </div>
                    )}
                    {( userData.role === 'KEPALA DUSUN' && 
                      <div className="flex gap-3 border-t border-slate-200 pt-4">
                        <Link 
                          to={`/form/blok3?id_keluarga=${idKeluarga}&id_anggota_keluarga=${anggota.id_anggota_keluarga}`}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
                          >
                            <Edit3 size={16} /> Open
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {anggotaKeluarga.length === 0 && (
            <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500 text-sm font-medium">Belum ada anggota keluarga yang ditambahkan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-40">
        <div className="max-w-lg mx-auto flex gap-3">
          {/* Tombol Kiri: Kembali ke Blok 2 */}
          <button
            type="button"
            onClick={() => navigate(`/form/blok2?id_keluarga=${idKeluarga}`)}
            className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="inline">Blok II</span>
          </button>
          
          {/* Tombol Kanan: Selesai (Kembali ke List Keluarga) */}
          <button
            type="button"
            onClick={() => navigate(`/form/blok4?id_keluarga=${idKeluarga}`)}
            className="w-1/2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            {/* <CheckCircle className="w-5 h-5" /> */}
            <span>Simpan & Lanjut</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  );
}