import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { getTenantContext } from '@/services/tenant/context';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getUser valida el token con Supabase; getSession solo lee la cookie sin verificarla.
  let authUser = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    authUser = data.user;
  } catch {
    authUser = null;
  }

  if (!authUser) {
    redirect('/login');
  }

  const user = {
    firstName: authUser.user_metadata?.first_name || 'Usuario',
    lastName: authUser.user_metadata?.last_name || '',
    email: authUser.email || '',
  };

  const tenant = await getTenantContext();
  const companies = tenant.status === 'ready' ? tenant.companies : [];
  const activeCompanyId = tenant.status === 'ready' ? tenant.companyId : null;

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar user={user} />
      {/* clip y no hidden: un foco o una validación no pueden desplazar el contenido bajo el menú. */}
      <main className="flex-1 flex flex-col min-w-0 overflow-clip bg-white">
        <Header user={user} companies={companies} activeCompanyId={activeCompanyId} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
