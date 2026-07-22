import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function FormKeluarga() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id_keluarga = searchParams.get('id'); // id di sini adalah id_keluarga

  // Menyesuaikan state untuk menampung data Keluarga DAN Kepala Keluarga
  const [formData, setFormData] = useState({
    no_kk: '',
    nik: '',
    nama: ''
  });

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 1500);
  };

  // 🔥 LOAD DATA JIKA MODE EDIT
  useEffect(() => {
    if (id_keluarga) {
      const dataKeluarga = JSON.parse(localStorage.getItem('keluarga')) || [];
      const dataPenduduk = JSON.parse(localStorage.getItem('penduduk')) || [];
      
      const foundKeluarga = dataKeluarga.find(item => item.id === id_keluarga);
      const foundKepalaKeluarga = dataPenduduk.find(
        item => item.id_keluarga === id_keluarga && item.hubungan_keluarga === 'KEPALA KELUARGA'
      );

      if (foundKeluarga && foundKepalaKeluarga) {
        setFormData({
          no_kk: foundKeluarga.no_kk || '',
          nik: foundKepalaKeluarga.nik || '',
          nama: foundKepalaKeluarga.nama || ''
        });
      }
    }
  }, [id_keluarga]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const existingKeluarga = JSON.parse(localStorage.getItem('keluarga')) || [];
    const existingPenduduk = JSON.parse(localStorage.getItem('penduduk')) || [];
    
    // Ambil data user untuk menyisipkan id_sls secara otomatis pada keluarga baru
    const userData = JSON.parse(localStorage.getItem('userData'));
    const defaultSls = (userData && userData.daftar_sls && userData.daftar_sls.length > 0) 
                        ? userData.daftar_sls[0] 
                        : null;

    // Identitas user dan waktu saat ini (diubah ke format string ISO/Datetime)
    const currentUserId = userData ? userData.id : null; 
    const currentTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        
    let targetRedirectId = id_keluarga;

    if (id_keluarga) {
      // 🔥 MODE EDIT (Update dua tabel)
      const updatedKeluarga = existingKeluarga.map(item =>
        (item.id === id || item.id_keluarga === id)
          ? { 
              ...item, 
              no_kk: formData.nomor_kk, 
              nama_kepala_keluarga: formData.nama, 
              status_keberadaan: formData.status_keberadaan,
              alamat: formData.alamat,
              no_hp: formData.no_hp,
              lat: formData.lat,
              long: formData.long,
              synced: false,
              // Update atribut rekam jejak
              last_modified_at: currentTime,
              last_modified_by: currentUserId
            }
          : item
      );

      const updatedPenduduk = existingPenduduk.map(item =>
        (item.id_keluarga === id_keluarga && item.hubungan_keluarga === 'KEPALA KELUARGA')
          ? { ...item, nik: formData.nik, nama: formData.nama, synced: false }
          : item
      );

      localStorage.setItem('keluarga', JSON.stringify(updatedKeluarga));
      localStorage.setItem('penduduk', JSON.stringify(updatedPenduduk));
      showToast('Data berhasil diupdate ✏️');

    } else {
      // 🔥 MODE CREATE (Insert ke dua tabel)
      const newKeluargaId = crypto.randomUUID();
      targetRedirectId = newKeluargaId;

      const newKeluarga = {
        id: newKeluargaId,
        id_keluarga: newKeluargaId, // Simpan sebagai id_keluarga agar konsisten
        no_kk: formData.nomor_kk,
        nama_kepala_keluarga: formData.nama,
        status_keberadaan: formData.status_keberadaan,
        alamat: formData.alamat,
        no_hp: formData.no_hp,
        lat: formData.lat,
        long: formData.long,
        id_sls: defaultSls, 
        synced: false,
        // Tambahkan atribut rekam jejak
        last_modified_at: currentTime,
        last_modified_by: currentUserId
      };

      const newKepalaKeluarga = {
        id_penduduk: crypto.randomUUID(),
        id_keluarga: newKeluargaId,
        nik: formData.nik,
        nama: formData.nama,
        hubungan_keluarga: 'KEPALA KELUARGA',
        synced: false
      };

      localStorage.setItem('keluarga', JSON.stringify([...existingKeluarga, newKeluarga]));
      localStorage.setItem('penduduk', JSON.stringify([...existingPenduduk, newKepalaKeluarga]));
      showToast('Data keluarga berhasil dibuat ✅');
    }

    // Arahkan ke halaman Detail Keluarga
    setTimeout(() => {
      navigate(`/detail-keluarga?id=${targetRedirectId}`);
    }, 1600);
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto p-6 bg-white shadow-md rounded-xl mt-10">
      
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-2">
        {id_keluarga ? 'Edit Data Keluarga' : 'Tambah Keluarga Baru'}
      </h2>

      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
        
        {/* Input Nomor KK */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Nomor Kartu Keluarga (KK)
          </label>
          <input 
            name="no_kk"
            value={formData.no_kk}
            onChange={handleChange}
            type="number" 
            required 
            placeholder="Masukkan 16 digit Nomor KK"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t border-gray-200 my-2 pt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Kepala Keluarga</h3>
          
          {/* Input NIK Kepala Keluarga */}
          <div className="flex flex-col gap-1 mb-4">
            <label className="text-sm font-semibold text-gray-700">
              Nomor Induk Kependudukan (NIK)
            </label>
            <input 
              name="nik"
              value={formData.nik}
              onChange={handleChange}
              type="number" 
              required 
              placeholder="Masukkan 16 digit NIK"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Input Nama Kepala Keluarga */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Nama Lengkap
            </label>
            <input 
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              type="text" 
              required 
              placeholder="Contoh: Budi Santoso"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className={`w-full font-bold text-white py-3 rounded-lg transition mt-4 ${
            id_keluarga ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {id_keluarga ? 'Update Data' : 'Simpan & Lanjut ke Detail'}
        </button>
      </form>

      <Link 
        to="/list-keluarga" 
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-3 py-3 rounded-lg text-center transition"
      >
        Batal & Kembali
      </Link>

    </div>
  );
}