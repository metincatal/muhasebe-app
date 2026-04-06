export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg shadow-blue-500/25">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Siyakat</h1>
          <p className="text-muted-foreground mt-1">Modern muhasebe yonetimi</p>
        </div>
        {children}
      </div>
    </div>
  );
}
