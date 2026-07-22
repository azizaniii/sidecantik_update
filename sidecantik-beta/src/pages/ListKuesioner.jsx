import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Pencil, Trash2 } from 'lucide-react';


export default function ListKuesioner() {
  const [kuesionerData, setKuesionerData] = useState([]);
  const [editingData, setEditingData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const navigate = useNavigate();

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    loadLocalData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 2000);
  };

  const loadLocalData = () => {
    const data = JSON.parse(localStorage.getItem('kuesioner')) || [];
    setKuesionerData(data);
  };

  // EDIT
  const handleEdit = (id) => {
    navigate(`/form?id=${id}`);
  };

  // DELETE
  const handleDelete = () => {
    const updated = kuesionerData.filter(item => item.id !== deleteId);

    localStorage.setItem('kuesioner', JSON.stringify(updated));
    setKuesionerData(updated);

    setDeleteId(null);

    showToast('Data berhasil dihapus 🗑️');
  };

  // Save and Exit
  const handleSaveEdit = () => {
    const updated = kuesionerData.map(item =>
      item.id === editingData.id
        ? { ...editingData, synced: false } // 🔥 tandai perlu sync ulang
        : item
    );

    localStorage.setItem('kuesioner', JSON.stringify(updated));
    setKuesionerData(updated);
    setEditingData(null);

    showToast('Data berhasil diupdate ✏️');
  };

  // Synchron database
  const handleSync = async () => {
    try {
      let localData = JSON.parse(localStorage.getItem('kuesioner')) || [];
      const unsynced = localData.filter(item => !item.synced);

      if (unsynced.length > 0) {
        let { data: insertedData, insertError } = await supabase
          .from("response")
          .insert(
            unsynced.map(item => ({
              id: item.id,
              name: item.name,
              message: item.message
            }))
          ).select();

        if (insertError) throw insertError;

        insertedData = insertedData || [];

        localData = localData.map(localItem => {
          const found = insertedData.find(d => d.id === localItem.id);
          return found ? { ...localItem, synced: true } : localItem;
        });
      }

      const { data: serverData, error: fetchError } = await supabase
        .from('response')
        .select('*');

      if (fetchError) throw fetchError;

      const merged = [...localData];

      serverData.forEach(serverItem => {
        const exists = merged.find(item => item.id === serverItem.id);
        if (!exists) {
          merged.push({
            ...serverItem,
            synced: true
          });
        }
      });

      localStorage.setItem('kuesioner', JSON.stringify(merged));

      showToast('Sync berhasil 🚀');
      loadLocalData();

    } catch (err) {
      console.error(err);
      showToast('Sync gagal ❌', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">
        Daftar Response
      </h2>

      {toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-md text-white z-50
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="overflow-x-auto mt-2">
        <div className='my-4 flex justify-between'>
          <Link 
            to="/form" 
            className="bg-blue-500 text-white px-3 py-2 rounded-md"
          >
            Tambah Kuesioner
          </Link>
          <button
            onClick={handleSync}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md"
            >
            🔄 Sync ke Server
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-2">No</th>
              <th className="p-2">Nama</th>
              <th className="p-2 text-center">Pesan</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {kuesionerData.length > 0 ? (
              kuesionerData.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2 text-center">{index + 1}</td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 text-center">{item.message}</td>
                  <td className="p-2 text-center">{item.synced ? "✅" : "⏳"}</td>
                  <td className="gap-2 py-3 h-full text-center flex-1">
                    <button
                      onClick={() => handleEdit(item.id)}
                      className="bg-yellow-400 text-white px-2 py-1 rounded"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center p-5 text-gray-500">
                  Belum ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {deleteId && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50"
            onClick={() => setDeleteId(null)}>
            <div className="bg-white/90 backdrop-blur-md rounded-lg p-6 w-80 shadow-lg border border-white/30"
              onClick={(e) => e.stopPropagation()}>
              
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Hapus Data
              </h3>

              <p className="text-gray-600 mb-4">
                Apakah kamu yakin ingin menghapus data ini?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-3 py-1 rounded bg-gray-300"
                >
                  Batal
                </button>

                <button
                  onClick={handleDelete}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Hapus
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      <Link 
        to="/" 
        className="bg-slate-500 text-white px-3 py-2 rounded-md text-center"
      >
        Kembali ke Halaman Utama
      </Link>
    </div>
  );
}