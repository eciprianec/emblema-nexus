export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="mb-8 text-center flex flex-col items-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Emblema Nexus
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Plataforma Integral de Gestión Empresarial
        </p>
      </div>
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
}
