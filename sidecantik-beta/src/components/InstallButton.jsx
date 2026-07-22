import { usePWAInstall } from "../hooks/usePWAInstall";

export default function InstallButton() {
  const { isInstallable, installApp } = usePWAInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border rounded-2xl shadow-xl p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold">Install Aplikasi</p>
        <p className="text-sm text-gray-500">
          Tambahkan ke home screen untuk pengalaman lebih cepat 🚀
        </p>
      </div>
      <button
        onClick={installApp}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Install
      </button>
    </div>
  );
}