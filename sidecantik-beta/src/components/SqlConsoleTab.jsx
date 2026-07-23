// src/components/SqlConsoleTab.jsx
//
// Tab "SQL Console" di dalam AdminPage. Menerima `apiFetch` dan `currentUser`
// sebagai props dari AdminPage.jsx (pola yang sama dengan UserModal),
// supaya token & redirect-401 konsisten dengan halaman lain.

import { useState, useCallback } from 'react';
import { FiPlay, FiClock, FiAlertTriangle } from 'react-icons/fi';

const DESTRUCTIVE_STATEMENTS = ['UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'RENAME'];

const SqlConsoleTab = ({ apiFetch, currentUser }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [statementType, setStatementType] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const runQuery = useCallback(async (confirm = false) => {
    setLoading(true);
    setErrorMsg('');
    if (!confirm) setResult(null);

    try {
      const res = await apiFetch('/api/admin/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, confirm }),
      });
      const json = await res.json();

      if (res.status === 428 && json.requireConfirm) {
        setStatementType(json.statementType);
        setPendingConfirm(true);
        return;
      }

      if (!json.success) {
        setErrorMsg(json.message || 'Query gagal dijalankan.');
        return;
      }

      setResult(json);
      setPendingConfirm(false);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, query]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apiFetch('/api/admin/sql/history');
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch (err) {
      console.error('Gagal memuat riwayat query', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [apiFetch]);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  };

  const rows = result?.result && Array.isArray(result.result) ? result.result : null;

  // History hanya untuk SUPERADMIN & OPERATOR SID (samakan dengan pembatasan backend)
  const canViewHistory = ['SUPERADMIN', 'OPERATOR SID'].includes(currentUser?.role);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-6 space-y-6">
      <div className="border-b border-gray-100 pb-4 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase">SQL Console</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Akses langsung ke database sesuai hak akses role Anda ({currentUser?.role})
          </p>
        </div>
        {canViewHistory && (
          <button
            onClick={toggleHistory}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
          >
            <FiClock className="w-4 h-4" /> Riwayat Query
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <FiAlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Query yang mengubah atau menghapus data (UPDATE/DELETE/DROP/dst) bersifat
          permanen dan tidak bisa dibatalkan. Pastikan Anda yakin sebelum konfirmasi.
        </p>
      </div>

      <textarea
        className="w-full h-40 border border-gray-300 rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="SELECT * FROM keluarga LIMIT 10;"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPendingConfirm(false);
        }}
      />

      <button
        onClick={() => runQuery(false)}
        disabled={loading || !query.trim()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 shadow transition-all"
      >
        <FiPlay className="w-4 h-4" />
        {loading ? 'Menjalankan...' : 'Jalankan Query'}
      </button>

      {pendingConfirm && (
        <div className="border border-red-300 bg-red-50 rounded-xl p-4">
          <p className="text-red-700 font-bold mb-3">
            Statement {statementType} akan mengubah/menghapus data. Yakin ingin melanjutkan?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => runQuery(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700"
            >
              Ya, Jalankan
            </button>
            <button
              onClick={() => setPendingConfirm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {result && (
        <div>
          {rows ? (
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {result.fields?.map((f) => (
                      <th key={f} className="px-4 py-2.5 text-left text-xs font-bold text-gray-600 uppercase">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={result.fields?.length || 1} className="px-4 py-6 text-center text-gray-400 font-semibold">
                        Query berhasil, tidak ada baris data.
                      </td>
                    </tr>
                  ) : rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {result.fields?.map((f) => (
                        <td key={f} className="px-4 py-2 text-gray-700">{row[f] === null ? <span className="text-gray-300 italic">null</span> : String(row[f])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-green-200 bg-green-50 text-green-700 rounded-xl p-3 text-sm font-semibold">
              Berhasil dijalankan. Baris terpengaruh: {result.affectedRows ?? '-'}
            </div>
          )}
        </div>
      )}

      {showHistory && canViewHistory && (
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-lg font-black text-gray-900 mb-3">Riwayat Query (100 terakhir)</h3>
          {loadingHistory ? (
            <p className="text-gray-400 text-sm font-semibold">Memuat riwayat...</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">Waktu</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">User</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">Role</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">Statement</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">Query</th>
                    <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((h) => (
                    <tr key={h.id} className={h.success ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(h.executed_at).toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-semibold">{h.nama_user}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">{h.role}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-gray-700">{h.statement_type}</td>
                      <td className="px-3 py-2 font-mono text-gray-600 max-w-xs truncate" title={h.query_text}>{h.query_text}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {h.success ? (
                          <span className="text-green-700 font-bold">Sukses</span>
                        ) : (
                          <span className="text-red-700 font-bold" title={h.error_message}>Gagal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SqlConsoleTab;
