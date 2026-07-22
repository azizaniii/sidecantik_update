import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, ChevronRight } from 'lucide-react';

export default function ListSLS() {
  const navigate = useNavigate();
  const [listSls, setListSls] = useState([]);

  useEffect(() => {
    const dataSls = JSON.parse(localStorage.getItem('data_sls')) || [];
    setListSls(dataSls);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/kadus" 
          className="flex items-center gap-2 text-gray-500 hover:text-teal-600 transition mb-4 w-fit"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Kembali ke Home</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Pilih Wilayah SLS</h1>
        <p className="text-gray-500 mt-2">Silakan pilih SLS/RT untuk melihat daftar keluarga</p>
        <div className="w-16 h-1 bg-teal-400 rounded-full mt-2"></div>
      </div>

      {/* Daftar SLS */}
      <div className="grid gap-4">
        {listSls.length > 0 ? (
          listSls.map((item, index) => (
            <div 
              key={item.id_sls}
              onClick={() => navigate(`/list-keluarga?id_sls=${item.id_sls}`)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-teal-400 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="bg-teal-50 p-3 rounded-xl text-teal-600">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{item.nama_sls}</h3>
                </div>
              </div>
              <ChevronRight className="text-gray-300" />
            </div>
          ))
        ) : (
          <div className="text-center p-10 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            <MapPin size={48} className="mx-auto opacity-20 mb-3" />
            <p>Belum ada data SLS yang terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  );
}