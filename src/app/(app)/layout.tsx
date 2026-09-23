import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isAdminSession = cookieStore.get('nexus_admin_session')?.value === 'true';

  let session = null;
  try {
    const supabase = await createClient();
    const res = await supabase.auth.getSession();
    session = res.data.session;
  } catch {
    session = null;
  }

  if (!session && !isAdminSession) {
    redirect('/login');
  }

  const user = session
    ? {
        firstName: session.user.user_metadata?.first_name || 'Administrador',
        lastName: session.user.user_metadata?.last_name || 'Nexus',
        email: session.user.email || 'admin@emblemanexus.com',
      }
    : {
        firstName: 'Administrador',
        lastName: 'Nexus',
        email: 'admin@emblemanexus.com',
      };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar user={user} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header user={user} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
