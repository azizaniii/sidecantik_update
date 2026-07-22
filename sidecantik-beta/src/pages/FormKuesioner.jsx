import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function FormKuesioner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');

  const [formData, setFormData] = useState({
    name: '',
    message: ''
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
    if (id) {
      const data = JSON.parse(localStorage.getItem('kuesioner')) || [];
      const found = data.find(item => item.id === id);

      if (found) {
        setFormData({
          name: found.name,
          message: found.message
        });
      }
    }
  }, [id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const existingData = JSON.parse(localStorage.getItem('kuesioner')) || [];

    let updatedData;

    if (id) {
      // 🔥 MODE EDIT
      updatedData = existingData.map(item =>
        item.id === id
          ? {
              ...item,
              name: formData.name,
              message: formData.message,
              synced: false
            }
          : item
      );

      showToast('Data berhasil diupdate ✏️');
    } else {
      // 🔥 MODE CREATE
      const newData = {
        id: crypto.randomUUID(),
        name: formData.name,
        message: formData.message,
        synced: false
      };

      updatedData = [...existingData, newData];

      showToast('Data berhasil disimpan ✅');
    }

    localStorage.setItem('kuesioner', JSON.stringify(updatedData));

    setTimeout(() => {
      navigate('/list');
    }, 1600);
  };

  return (
    <div className="flex flex-col gap-4">
      
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">
        {id ? 'Edit Kuesioner' : 'Form Kuesioner'}
      </h2>

      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Nama Anda:
          </label>
          <input 
            name="name"
            value={formData.name}
            onChange={handleChange}
            type="text" 
            required 
            className="w-full p-2 border rounded-md"
          />
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Kesan & Pesan:
          </label>
          <textarea 
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="4" 
            required 
            className="w-full p-2 border rounded-md"
          ></textarea>
        </div>
        
        <button 
          type="submit" 
          className={`w-full text-white py-3 rounded-lg ${
            id ? 'bg-yellow-600' : 'bg-green-600'
          }`}
        >
          {id ? 'Update Data' : 'Kirim Jawaban'}
        </button>
      </form>

      <Link 
        to="/" 
        className="bg-red-500 text-white px-3 py-3 rounded-md text-center"
      >
        Cancel
      </Link>

    </div>
  );
}