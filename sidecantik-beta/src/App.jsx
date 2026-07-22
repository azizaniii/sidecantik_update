import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ListKeluarga from './pages/ListKeluarga';
import InstallButton from "./components/InstallButton";
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import DetailKeluarga from './pages/DetailKeluarga';
import FormulirBlok1 from './pages/FormulirBlok1';
import FormulirBlok2 from './pages/FormulirBlok2';
import FormulirBlok3 from './pages/FormulirBlok3';
import FormulirBlok4 from './pages/FormulirBlok4';
import ApprovalKadus from './pages/Approval';
import HomeKadus from './pages/HomeKadus';
import ListSLS from './pages/ListSLS';
import DownloadData from './pages/Download';
import AdminPage from './pages/AdminPage';

// FIX: sebelumnya SELURUH halaman (termasuk /admin) dipaksa masuk ke wrapper
// "max-w-md" (lebar HP), TIDAK PEDULI ukuran layar. Itu cocok sebagai titik awal untuk
// halaman survei lapangan (Home, Formulir, dst — memang didesain mobile-first untuk
// petugas di lapangan), tapi seharusnya tetap melebar mengikuti layar yang lebih besar,
// bukan terjebak selebar HP di tablet/desktop. Admin Panel (/admin) tetap memakai layar
// penuh seperti sebelumnya karena kebutuhannya beda (dashboard, tabel lebar, dsb).
function AppShell() {
  const location = useLocation();
  const isWideLayout = location.pathname.startsWith('/admin');

  return (
    <div
      className={
        isWideLayout
          ? "w-full min-h-screen bg-[#f4f4f3]"
          : "w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl min-h-screen bg-[#f4f4f3] shadow-xl p-2 sm:p-6 md:p-8 relative mx-auto"
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path='/download' element={< DownloadData />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/list-keluarga" element={<ListKeluarga />} />
          <Route path="/form/blok1" element={<FormulirBlok1 />} />
          <Route path="/form/blok2" element={<FormulirBlok2 />} />
          <Route path='/form/blok3/detail-keluarga' element={<DetailKeluarga />} />
          <Route path='/form/blok3' element={<FormulirBlok3 />} />
          <Route path='/form/blok4' element={<FormulirBlok4 />} />
          <Route path='/kadus' element={<HomeKadus />} />
          <Route path='/list-sls' element={<ListSLS />} />
          <Route path='/kadus/approval' element={<ApprovalKadus />} />
          <Route path='/admin' element={<AdminPage />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
      <InstallButton />
    </Router>
  );
}

export default App;
