import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function FormAnggotaKeluarga() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Mengambil id_keluarga dan id anggota dari URL parameter
  const idKeluarga = searchParams.get('id_keluarga');
  const idAnggota = searchParams.get('id');

  // Menyesuaikan state dengan struktur database
  const [formData, setFormData] = useState({
    nik: '',
    nama: '',
    pendidikan_tertinggi: 'Tidak/Belum Sekolah',
    pekerjaan: 'Belum/Tidak Bekerja',
    tempat_lahir: '',
    tanggal_lahir: '',
    umur: '',
    status_perkawinan: 'Belum Kawin',
    status_hubungan_keluarga: 'Anak',
    golongan_darah: 'A',
    nama_ayah: '',
    nama_ibu: '',
    status: '', // Varchar biasa, misal: 'Aktif'
    no_urut_anggota: '',
    detail_hubungan_keluarga_lainnya: '',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam'
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
    // Validasi keamanan: Pastikan id_keluarga tersedia
    if (!idKeluarga) {
      alert("Akses tidak valid. ID Keluarga tidak ditemukan.");
      navigate('/list-keluarga');
      return;
    }

    if (idAnggota) {
      const dataPenduduk = JSON.parse(localStorage.getItem('penduduk')) || [];
      const found = dataPenduduk.find(item => item.id_penduduk === idAnggota); // Sesuaikan dengan id_penduduk

      if (found) {
        setFormData({
          nik: found.nik || '',
          nama: found.nama || '',
          pendidikan_kk: found.pendidikan_kk || 'TIDAK/BELUM SEKOLAH',
          pekerjaan: found.pekerjaan || 'BELUM/TIDAK BEKERJA',
          tempat_lahir: found.tempat_lahir || '',
          tanggal_lahir: found.tanggal_lahir || '',
          umur: found.umur || '',
          status_pernikahan: found.status_pernikahan || 'BELUM KAWIN',
          hubungan_keluarga: found.hubungan_keluarga || 'ANAK',
          golongan_darah: found.golongan_darah || 'O',
          nama_ayah: found.nama_ayah || '',
          nama_ibu: found.nama_ibu || '',
          status: found.status || 'AKTIF'
        });
      }
    }
  }, [idAnggota, idKeluarga, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Menghitung umur otomatis berdasarkan tanggal_lahir
  const handleTanggalLahirChange = (e) => {
    const tglLahir = e.target.value;
    setFormData(prev => ({ ...prev, tanggal_lahir: tglLahir }));

    if (tglLahir) {
      const today = new Date();
      const birthDate = new Date(tglLahir);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, umur: age }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const existingPenduduk = JSON.parse(localStorage.getItem('penduduk')) || [];
    
    // Ambil data SLS dari user yang login
    const userData = JSON.parse(localStorage.getItem('userData'));
    const defaultSls = (userData && userData.daftar_sls && userData.daftar_sls.length > 0) 
                        ? userData.daftar_sls[0] 
                        : null;

    let updatedPenduduk;

    if (idAnggota) {
      // 🔥 MODE EDIT
      updatedPenduduk = existingPenduduk.map(item =>
        item.id_penduduk === idAnggota
          ? { 
              ...item, 
              ...formData, 
              synced: false,
              last_modified_at: currentTime,
              last_modified_by: currentUserId
            }
          : item
      );
      showToast('Data anggota berhasil diupdate ✏️');
    } else {
      // 🔥 MODE CREATE
      const newAnggota = {
        id_penduduk: crypto.randomUUID(),
        id_keluarga: idKeluarga, 
        ...formData,
        synced: false,
        last_modified_at: currentTime,
        last_modified_by: currentUserId
      };

      updatedPenduduk = [...existingPenduduk, newAnggota];
      showToast('Anggota keluarga berhasil ditambahkan ✅');
    }

    localStorage.setItem('penduduk', JSON.stringify(updatedPenduduk));

    const existingKeluarga = JSON.parse(localStorage.getItem('keluarga')) || [];
    const updatedKeluarga = existingKeluarga.map(kel => 
    kel.id === idKeluarga || kel.id_keluarga === idKeluarga
        ? { ...kel, synced: false, status: 'DRAFT' }
        : kel
    );
    localStorage.setItem('keluarga', JSON.stringify(updatedKeluarga));
    // Arahkan kembali ke halaman Detail Keluarga
    setTimeout(() => {
      navigate(`/detail-keluarga?id=${idKeluarga}`);
    }, 1600);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl mt-10 mb-10">
      
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-2">
        {idAnggota ? 'Edit Data Anggota Keluarga' : 'Tambah Anggota Keluarga'}
      </h2>

      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50 transition-opacity
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        
        {/* Identitas Dasar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">NIK (Nomor Induk Kependudukan)</label>
            <input 
              name="nik" value={formData.nik} onChange={handleChange} type="number" required 
              placeholder="16 Digit NIK"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
            <input 
              name="nama" value={formData.nama} onChange={handleChange} type="text" required 
              placeholder="Sesuai KTP"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Kelahiran & Umur */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Tempat Lahir</label>
            <input 
              name="tempat_lahir" value={formData.tempat_lahir} onChange={handleChange} type="text" required 
              placeholder="Contoh: Jakarta"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Tanggal Lahir</label>
            <input 
              name="tanggal_lahir" value={formData.tanggal_lahir} onChange={handleTanggalLahirChange} type="date" required 
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Umur (Otomatis)</label>
            <input 
              name="umur" value={formData.umur} onChange={handleChange} type="number"
              placeholder="0" readOnly
              className="p-3 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Data Keluarga Fisik */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Nama Ayah</label>
            <input 
              name="nama_ayah" value={formData.nama_ayah} onChange={handleChange} type="text" required 
              placeholder="Nama Lengkap Ayah"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Nama Ibu</label>
            <input 
              name="nama_ibu" value={formData.nama_ibu} onChange={handleChange} type="text" required 
              placeholder="Nama Lengkap Ibu"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status Sosial & Medis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Hubungan Keluarga</label>
            <select name="hubungan_keluarga" value={formData.hubungan_keluarga} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="KEPALA KELUARGA">KEPALA KELUARGA</option>
              <option value="ISTRI">ISTRI</option>
              <option value="ANAK">ANAK</option>
              <option value="MENANTU">MENANTU</option>
              <option value="CUCU">CUCU</option>
              <option value="ORANG TUA">ORANG TUA</option>
              <option value="MERTUA">MERTUA</option>
              <option value="FAMILI LAIN">FAMILI LAIN</option>
              <option value="LAINNYA">LAINNYA</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Status Pernikahan</label>
            <select name="status_pernikahan" value={formData.status_pernikahan} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="BELUM KAWIN">BELUM KAWIN</option>
              <option value="KAWIN">KAWIN</option>
              <option value="CERAI HIDUP">CERAI HIDUP</option>
              <option value="CERAI MATI">CERAI MATI</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Golongan Darah</label>
            <select name="golongan_darah" value={formData.golongan_darah} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="AB">AB</option>
              <option value="O">O</option>
              <option value="TIDAK TAHU">TIDAK TAHU</option>
            </select>
          </div>
        </div>

        {/* Pendidikan, Pekerjaan, & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Pendidikan (Sesuai KK)</label>
            <select name="pendidikan_kk" value={formData.pendidikan_kk} onChange={handleChange} className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="TIDAK/BELUM SEKOLAH">TIDAK/BELUM SEKOLAH</option>
              <option value="SD/SEDERAJAT">SD/SEDERAJAT</option>
              <option value="SLTP/SEDERAJAT">SLTP/SEDERAJAT</option>
              <option value="SLTA/SEDERAJAT">SLTA/SEDERAJAT</option>
              <option value="DIPLOMA I/II/III">DIPLOMA I/II/III</option>
              <option value="DIPLOMA IV/STRATA I">DIPLOMA IV/STRATA I</option>
              <option value="STRATA II">STRATA II</option>
              <option value="STRATA III">STRATA III</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">Status Kependudukan</label>
            <input 
              name="status" value={formData.status} onChange={handleChange} type="text" required 
              placeholder="Contoh: AKTIF / HIDUP"
              className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Pekerjaan</label>
          <input 
            name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} type="text" required 
            placeholder="Contoh: MENGURUS RUMAH TANGGA, PNS, DLL"
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button 
          type="submit" 
          className={`w-full font-bold text-white py-3 rounded-lg transition mt-4 shadow-sm ${
            idAnggota ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {idAnggota ? 'Update Data Anggota' : 'Simpan Data Anggota'}
        </button>
      </form>

      <Link 
        to={`/detail-keluarga?id=${idKeluarga}`} 
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-3 py-3 rounded-lg text-center transition"
      >
        Batal & Kembali
      </Link>

    </div>
  );
}