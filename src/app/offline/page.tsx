"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-4">
        <div className="text-6xl mb-4">📵</div>
        <h1 className="text-2xl font-semibold">İnternet bağlantısı yok</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Bağlantı sağlandığında uygulama otomatik olarak yeniden yüklenecek.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
