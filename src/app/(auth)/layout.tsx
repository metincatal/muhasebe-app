import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden mb-4 shadow-lg bg-[#0f172a]">
            <Image src="/logo.png" alt="Siyakat" width={88} height={88} className="object-contain scale-[1.15]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Siyakat</h1>
          <p className="text-muted-foreground mt-1">Modern muhasebe yonetimi</p>
        </div>
        {children}
      </div>
    </div>
  );
}
