import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';

export default function FormIdentitasWilayah() {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [formData, setFormData] = useState({
    nama_desa: '',
    nama_dusun: '',
    nama_rt: ''
  });

  const [isKadus, setIsKadus] = useState(false);
  const [sls, setSls] = useState('');

  const [searchParams] = useSearchParams();
  const idKeluarga = searchParams.get('id_keluarga');

  useEffect(() => {
    const dataUser = JSON.parse(localStorage.getItem('auth_user')) || [];
    if(dataUser.role === 'KEPALA DUSUN'){
      setIsKadus(true);
    }

    if (idKeluarga) {
      const dataKeluargaLokal = JSON.parse(localStorage.getItem('data_keluarga')) || [];
      
      const keluargaSaatIni = dataKeluargaLokal.find(k => k.id_keluarga === idKeluarga);

      if (keluargaSaatIni) {
        setFormData({
          nama_desa: keluargaSaatIni.nama_desa || '',
          nama_dusun: keluargaSaatIni.nama_dusun || '',
          nama_rt: keluargaSaatIni.nama_sls || '' 
        });
        setSls(keluargaSaatIni.id_sls_administrasi);
      }
    }
  }, [idKeluarga]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let dataKeluargaLokal = JSON.parse(localStorage.getItem('data_keluarga'));
    if (Array.isArray(dataKeluargaLokal)) {
      const indexKeluarga = dataKeluargaLokal.findIndex(k => k.id_keluarga === idKeluarga);
      if (indexKeluarga !== -1) {
        if(!isKadus){
          dataKeluargaLokal[indexKeluarga].synced = false;
          dataKeluargaLokal[indexKeluarga].status = 'draft';
        }
        localStorage.setItem('data_keluarga', JSON.stringify(dataKeluargaLokal));
      }
    }
    const dataDisimpan = {
      ...formData,
      id_keluarga: idKeluarga
    };
    
    localStorage.setItem('draft_blok1_identitas-wilayah', JSON.stringify(dataDisimpan));
    
    navigate(`/form/blok2?id_keluarga=${idKeluarga}`);
  };

  const handleBackClick = () => {
    setShowExitModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
      {/* Background Blobs (Ornamen Latar Belakang) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* Konten Utama */}
      <div className="flex-1 w-full max-w-lg mx-auto p-4 md:p-8 relative z-10 pb-28 flex flex-col justify-center">
        
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-white/30">
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-gradient-to-br from-teal-400 to-blue-500 p-3 rounded-xl text-white shadow-md">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-600 tracking-wide uppercase">Blok 1</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Identitas Wilayah</h1>
            </div>
          </div>

          {/* Perhatikan penambahan id="form-blok-1" di sini */}
          <form id="form-blok-1" onSubmit={handleSubmit} className="space-y-5">
            {/* Input Nama Desa */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Desa/Kelurahan</label>
              <input
                type="text"
                name="nama_desa"
                required
                value={formData.nama_desa}
                onChange={handleChange}
                className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                placeholder="Contoh: Desa Sukamaju"
                readOnly={isKadus}
              />
            </div>

            {/* Input Nama Dusun */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Dusun</label>
              <input
                type="text"
                name="nama_dusun"
                required
                value={formData.nama_dusun}
                onChange={handleChange}
                className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                placeholder="Contoh: Dusun Mekarsari"
                readOnly={isKadus}
              />
            </div>

            {/* Input Nama RT */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama/Nomor RT</label>
              <input
                type="text"
                name="nama_rt"
                required
                value={formData.nama_rt}
                onChange={handleChange}
                className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                placeholder="Contoh: RT 01"
                readOnly={isKadus}
              />
            </div>
          </form>
        </div>
      </div>

      {/* Fixed Footer (Menempel di Bawah) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          {/* Tombol Kiri: Kembali */}
          <button
            type="button"
            onClick={handleBackClick}
            className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition duration-200 flex items-center justify-center space-x-2 border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="inline">Keluar</span>
          </button>
          
          {/* Tombol Kanan: Simpan & Lanjut */}
          <button
            type="submit"
            form="form-blok-1"
            className="w-1/2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2"
          >
            <span>Simpan & Lanjut</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Keluar */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Yakin Ingin Keluar?</h3>
              
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition duration-200"
                >
                  Batal
                </button>
                <button
                  onClick={() => navigate(`/list-keluarga?id_sls=${sls}`)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition duration-200 shadow-md shadow-red-500/30"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}