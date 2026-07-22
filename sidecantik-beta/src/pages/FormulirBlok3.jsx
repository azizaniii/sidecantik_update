import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import Select from 'react-select';

// --- OPSI DROPDOWN ---
const opsiHubungan = [
  { value: 'Kepala Keluarga', label: '1. Kepala Keluarga' },
  { value: 'Istri/Suami', label: '2. Istri/Suami' },
  { value: 'Anak', label: '3. Anak' },
  { value: 'Menantu', label: '4. Menantu' },
  { value: 'Cucu', label: '5. Cucu' },
  { value: 'Orang Tua', label: '6. Orang tua' },
  { value: 'Mertua', label: '7. Mertua' },
  { value: 'Famili Lain', label: '8. Famili lain' },
  { value: 'Pembantu', label: '9. Pembantu' },
  { value: 'Lainnya', label: '10. Lainnya (tuliskan)' }
];

const opsiStatusPenduduk = [
  { value: 'Hidup', label: '1. Hidup' },
  { value: 'Mati', label: '2. Mati' },
  { value: 'Tinggal Diluar SLS', label: '3. Tinggal diluar SLS' },
  { value: 'Tidak Ditemukan', label: '4. Tidak ditemukan' }
];

const opsiJenisKelamin = [
  { value: 'Laki-laki', label: '1. Laki-laki' },
  { value: 'Perempuan', label: '2. Perempuan' }
];

const opsiAgama = [
  { value: 'Islam', label: '1. Islam' },
  { value: 'Kristen', label: '2. Kristen' },
  { value: 'Katolik', label: '3. Katolik' },
  { value: 'Hindu', label: '4. Hindu' },
  { value: 'Budha', label: '5. Budha' },
  { value: 'Konghucu', label: '6. Konghucu' },
  { value: 'Kepercayaan Lain', label: '7. Kepercayaan lain ...' }
];

const opsiPerkawinan = [
  { value: 'Belum Kawin', label: '1. Belum Kawin' },
  { value: 'Kawin', label: '2. Kawin' },
  { value: 'Cerai Hidup', label: '3. Cerai Hidup' },
  { value: 'Cerai Mati', label: '4. Cerai Mati' }
];

const opsiPendidikan = [
  { value: 'Tidak/Belum Sekolah', label: '1. Tidak/Belum Sekolah' },
  { value: 'Belum Tamat SD/Sederajat', label: '2. Belum Tamat SD/Sederajat' },
  { value: 'Tamat SD/Sederajat', label: '3. Tamat SD/Sederajat' },
  { value: 'SMP/Sederajat', label: '4. SMP/Sederajat' },
  { value: 'SMA/Sederajat', label: '5. SMA/Sederajat' },
  { value: 'Diploma I/II', label: '6. Diploma I/II' },
  { value: 'Akademi/Diploma III', label: '7. Akademi/Diploma III' },
  { value: 'Diploma IV/Strata I (S1)', label: '8. Diploma IV/Strata I (S1)' },
  { value: 'Strata II (S2)', label: '9. Strata II (S2)' },
  { value: 'Strata III (S3)', label: '10. Strata III (S3)' }
];

const opsiPekerjaan = [
  { value: 'Belum/Tidak Bekerja', label: '1. Belum/tidak bekerja' },
  { value: 'Mengurus Rumah Tangga', label: '2. Mengurus rumah tangga' },
  { value: 'Pelajar/Mahasiswa', label: '3. Pelajar/mahasiswa' },
  { value: 'Pensiunan', label: '4. Pensiunan' },
  { value: 'ASN (Aparatur Sipil Negara)', label: '5. ASN (Aparatur Sipil Negara)' },
  { value: 'Tentara Nasional Indonesia (TNI)', label: '6. Tentara Nasional Indonesia (TNI)' },
  { value: 'Kepolisian RI (POLRI)', label: '7. Kepolisian RI (POLRI)' },
  { value: 'Wiraswasta/Pedagang', label: '8. Wiraswasta/Pedagang' },
  { value: 'Petani/Pekebun', label: '9. Petani/pekebun' },
  { value: 'Nelayan/Perikanan', label: '10. Nelayan/perikanan' },
  { value: 'Karyawan Swasta', label: '11. Karyawan swasta' },
  { value: 'Karyawan Honorer', label: '12. Karyawan honorer' },
  { value: 'Buruh Harian Lepas', label: '13. Buruh harian lepas' },
  { value: 'Tenaga Kerja Indonesia (TKI)', label: '14. Tenaga Kerja Indonesia (TKI)' },
  { value: 'Lainnya', label: '15. Lainnya' }
];

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    padding: '0.3rem',
    borderRadius: '0.75rem',
    borderColor: state.isFocused ? '#14b8a6' : '#e2e8f0',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(20, 184, 166, 0.2)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#14b8a6' : '#cbd5e1' }
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#0d9488' : state.isFocused ? '#ccfbf1' : 'white',
    color: state.isSelected ? 'white' : '#334155',
    cursor: 'pointer',
    padding: '10px 15px',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 50
  })
};

// 🔥 HELPER: Penterjemah Teks Prelist menjadi Value Dropdown
const parseDropdownValue = (prelistValue, options) => {
  if (!prelistValue) return '';
  const valStr = String(prelistValue).trim().toUpperCase();
  
  if (options.find(opt => opt.value === valStr)) return valStr;
  
  let matched = options.find(opt => {
    const labelClean = opt.label.toUpperCase().replace(/[0-9.]/g, '').trim(); 
    return labelClean === valStr;
  });
  if (!matched) {
    matched = options.find(opt => {
      const labelClean = opt.label.toUpperCase().replace(/[0-9.]/g, '').trim(); 
      if (valStr.length < 4 && labelClean.length > 5) return false; 
      
      return valStr.includes(labelClean) || labelClean.includes(valStr);
    });
  }
  
  if (matched) return matched.value;

  // Edge cases (Kasus penulisan spesifik di database)
  if (valStr === 'ISTRI' || valStr === 'SUAMI') return '2';
  if (valStr === 'LAKI-LAKI' || valStr === 'L') return '1';
  if (valStr === 'PEREMPUAN' || valStr === 'P') return '2';
  
  return '';
};

export default function FormAnggotaKeluarga() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idKeluarga = searchParams.get('id_keluarga');
  const idPenduduk = searchParams.get('id_anggota_keluarga'); 

  const [showExitModal, setShowExitModal] = useState(false);
  const [originalData, setOriginalData] = useState(null); // Menyimpan data asli agar atribut lain tidak hilang
  const [isKadus, setIsKadus] = useState(false);
  
  const [formData, setFormData] = useState({
    no_urut_anggota: '',
    nama: '',
    nik: '',
    status_hubungan_keluarga: '',
    detail_hubungan_keluarga_lainnya: '',
    status_penduduk: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    agama: '',
    agama_lainnya: '',
    status_perkawinan: '',
    pendidikan_tertinggi: '',
    pekerjaan: ''
  });

  useEffect(() => {
    const dataUser = JSON.parse(localStorage.getItem('auth_user')) || [];
    if(dataUser.role === 'KEPALA DUSUN'){
      setIsKadus(true);
    }

    if (!idKeluarga) {
      alert("ID Keluarga hilang!");
      navigate('/list-keluarga');
      return;
    }

    const dataPendudukLokal = JSON.parse(localStorage.getItem('data_penduduk')) || [];
    
    if (idPenduduk) {
      const anggotaTarget = dataPendudukLokal.find(p => p.id_anggota_keluarga === idPenduduk);
      
      if (anggotaTarget) {
        setOriginalData(anggotaTarget); // Simpan wujud aslinya

        // Ekstrak tanggal untuk input type="date" (YYYY-MM-DD)
        let tglLahirFormatted = anggotaTarget.tanggal_lahir || '';
        if (tglLahirFormatted && tglLahirFormatted.includes('T')) {
          tglLahirFormatted = tglLahirFormatted.split('T')[0];
        }

        setFormData({
          no_urut_anggota: anggotaTarget.no_urut_anggota || '',
          nama: anggotaTarget.nama || anggotaTarget.nama_lengkap || '',
          nik: anggotaTarget.nik || '',
          status_hubungan_keluarga: parseDropdownValue(anggotaTarget.status_hubungan_keluarga, opsiHubungan),
          detail_hubungan_keluarga_lainnya: anggotaTarget.detail_hubungan_keluarga_lainnya || '',
          status_penduduk: parseDropdownValue(anggotaTarget.status_penduduk || 'Hidup', opsiStatusPenduduk),
          tempat_lahir: anggotaTarget.tempat_lahir || '',
          tanggal_lahir: tglLahirFormatted,
          jenis_kelamin: parseDropdownValue(anggotaTarget.jenis_kelamin, opsiJenisKelamin),
          agama: parseDropdownValue(anggotaTarget.agama, opsiAgama),
          agama_lainnya: anggotaTarget.agama_lainnya || '',
          status_perkawinan: parseDropdownValue(anggotaTarget.status_perkawinan, opsiPerkawinan),
          pendidikan_tertinggi: parseDropdownValue(anggotaTarget.pendidikan_tertinggi, opsiPendidikan),
          pekerjaan: parseDropdownValue(anggotaTarget.pekerjaan, opsiPekerjaan)
        });
      }
    } else {
      // 🔵 MODE TAMBAH: Hitung No Urut Baru
      const anggotaKeluargaIni = dataPendudukLokal.filter(p => p.id_keluarga === idKeluarga);
      setFormData(prev => ({
        ...prev,
        nomor_urut: (anggotaKeluargaIni.length + 1).toString(),
        status_penduduk: '1' // Default: Hidup
      }));
    }
  }, [idKeluarga, idPenduduk, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, selectedOption) => {
    setFormData({ ...formData, [name]: selectedOption ? selectedOption.value : '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalIdAnggotaKeluarga = (idPenduduk && idPenduduk !== 'null') ? idPenduduk :  crypto.randomUUID();

    if (!formData.status_hubungan_keluarga) return alert("Pilih Hubungan dengan Kepala Keluarga!");
    if (!formData.status_penduduk) return alert("Pilih Status Penduduk!");
    if (!formData.jenis_kelamin) return alert("Pilih Jenis Kelamin!");

    let dataPendudukLokal = JSON.parse(localStorage.getItem('data_penduduk'));
    if (!Array.isArray(dataPendudukLokal)) dataPendudukLokal = [];

    // 🔥 GABUNGKAN data asli dengan data yang diedit agar data lain tidak terhapus
    const dataDisimpan = {
      ...(originalData || {}),
      ...formData,
      id_keluarga: idKeluarga,
      id_penduduk: idPenduduk || finalIdAnggotaKeluarga,
      status_dokumen_blok3: 'draft',
      synced: false
    };

    if (idPenduduk) {
      const index = dataPendudukLokal.findIndex(p => p.id_anggota_keluarga === idPenduduk);
      if (index !== -1) dataPendudukLokal[index] = dataDisimpan;
    } else {
      dataPendudukLokal.push(dataDisimpan);
    }
    
    localStorage.setItem('data_penduduk', JSON.stringify(dataPendudukLokal));

    // Cascade Unsync Keluarga
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

    navigate(`/form/blok3/detail-keluarga?id_keluarga=${idKeluarga}`);
  };

  const handleBackClick = () => {
    const isFormFilled = formData.nama || formData.nik || formData.tempat_lahir;
    if (isFormFilled && !idPenduduk) {
      setShowExitModal(true); // Hanya munculkan modal jika mengisi data BARU
    } else {
      navigate(`/form/blok3/detail-keluarga?id_keluarga=${idKeluarga}`);
    }
  };

  const getSelectObj = (options, val) => options.find(opt => opt.value === val) || null;

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="flex-1 w-full max-w-xl mx-auto p-4 md:p-8 relative z-10 pb-96 flex flex-col justify-center">
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-xl border border-white/30">
          
          <div className="flex items-center space-x-4 mb-8">
            <div className="bg-gradient-to-br from-teal-400 to-blue-500 p-3 rounded-xl text-white shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-600 tracking-wide uppercase">Blok III</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                {idPenduduk ? 'Edit Data Anggota' : 'Tambah Anggota Keluarga'}
              </h1>
            </div>
          </div>

          <form id="form-anggota" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Nomor Urut & 3. NIK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">1. No. Urut</label>
                <input
                  type="number"
                  name="no_urut_anggota"
                  min="1"
                  required
                  value={formData.no_urut_anggota}
                  onChange={handleChange}
                  className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                  placeholder="Contoh: 1"
                  readOnly={isKadus}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">3. NIK</label>
                <input
                  type="text"
                  name="nik"
                  maxLength="16"
                  value={formData.nik}
                  onChange={handleChange}
                  className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                  placeholder="16 Digit NIK"
                  readOnly={isKadus}
                />
              </div>
            </div>

            {/* 2. Nama */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Nama Lengkap</label>
              <input
                type="text"
                name="nama"
                required
                value={formData.nama}
                onChange={handleChange}
                className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                placeholder="Nama sesuai KTP/KK"
                readOnly={isKadus}
              />
            </div>

            {/* 4. Status Hubungan dengan KK */}
            <div className="relative z-60">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">4. Status Hubungan dengan Kepala Keluarga</label>
              <Select
                options={opsiHubungan}
                value={getSelectObj(opsiHubungan, formData.status_hubungan_keluarga)}
                onChange={(option) => handleSelectChange('status_hubungan_keluarga', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Hubungan --"
                isDisabled={isKadus}
              />
              {formData.status_hubungan_keluarga === 'Lainnya' && (
                <input
                  type="text"
                  name="detail_hubungan_keluarga_lainnya"
                  required
                  value={formData.detail_hubungan_keluarga_lainnya}
                  onChange={handleChange}
                  className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                  placeholder="Tuliskan spesifik hubungan lainnya..."
                />
              )}
            </div>

            {/* 5. Status Penduduk */}
            <div className="relative z-50">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">5. Status Penduduk</label>
              <Select
                options={opsiStatusPenduduk}
                value={getSelectObj(opsiStatusPenduduk, formData.status_penduduk)}
                onChange={(option) => handleSelectChange('status_penduduk', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Status Penduduk --"
                isSearchable={false}
                isDisabled={isKadus}
              />
            </div>

            {/* 6. Tempat Tanggal Lahir */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">6. Tempat & Tanggal Lahir</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  name="tempat_lahir"
                  required
                  value={formData.tempat_lahir}
                  onChange={handleChange}
                  className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                  placeholder="Tempat Lahir"
                  readOnly={isKadus}
                />
                <input
                  type="date"
                  name="tanggal_lahir"
                  required
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                  className={`w-full border p-3.5 rounded-xl transition focus:outline-none 
                    ${isKadus 
                      ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed shadow-inner" 
                      : "bg-white border-slate-200 text-gray-900 focus:ring-2 focus:ring-teal-500"
                    }`}
                  readOnly={isKadus}
                />
              </div>
            </div>

            {/* 7. Jenis Kelamin */}
            <div className="relative z-40">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">7. Jenis Kelamin</label>
              <Select
                options={opsiJenisKelamin}
                value={getSelectObj(opsiJenisKelamin, formData.jenis_kelamin)}
                onChange={(option) => handleSelectChange('jenis_kelamin', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Jenis Kelamin --"
                isSearchable={false}
                isDisabled={isKadus}
              />
            </div>

            {/* 8. Agama */}
            <div className="relative z-30">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">8. Agama</label>
              <Select
                options={opsiAgama}
                value={getSelectObj(opsiAgama, formData.agama)}
                onChange={(option) => handleSelectChange('agama', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Agama --"
                isSearchable={false}
                isDisabled={isKadus}
              />
            </div>

            {/* 9. Status Perkawinan */}
            <div className="relative z-20">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">9. Status Perkawinan</label>
              <Select
                options={opsiPerkawinan}
                value={getSelectObj(opsiPerkawinan, formData.status_perkawinan)}
                onChange={(option) => handleSelectChange('status_perkawinan', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Status Perkawinan --"
                isSearchable={false}
                isDisabled={isKadus}
              />
            </div>

            {/* 10. Pendidikan Tertinggi */}
            <div className="relative z-10">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">10. Pendidikan Tertinggi</label>
              <Select
                options={opsiPendidikan}
                value={getSelectObj(opsiPendidikan, formData.pendidikan_tertinggi)}
                onChange={(option) => handleSelectChange('pendidikan_tertinggi', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Pendidikan --"
                isDisabled={isKadus}
              />
            </div>

            {/* 11. Pekerjaan */}
            <div className="relative z-0">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">11. Pekerjaan</label>
              <Select
                options={opsiPekerjaan}
                value={getSelectObj(opsiPekerjaan, formData.pekerjaan)}
                onChange={(option) => handleSelectChange('pekerjaan', option)}
                styles={customSelectStyles}
                placeholder="-- Pilih Pekerjaan --"
                isSearchable={false}
                isDisabled={isKadus}
              />
            </div>

          </form>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-40">
        <div className="max-w-xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition flex items-center justify-center space-x-2 border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="inline">Kembali</span>
          </button>
          
          <button
            type="submit"
            form="form-anggota"
            className="w-1/2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>Simpan Anggota</span>
          </button>
        </div>
      </div>

      {/* Modal Konfirmasi Batal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-100 p-3 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Batal Menambahkan?</h3>
              <p className="text-slate-600 mb-6 text-sm">
                Data anggota keluarga yang sedang diisi akan hilang.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition"
                >
                  Teruskan Mengisi
                </button>
                <button
                  onClick={() => navigate(`/form/blok3/detail-keluarga?id_keluarga=${idKeluarga}`)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition shadow-md"
                >
                  Ya, Buang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}