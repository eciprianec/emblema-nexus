import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Placeholder user data
  const user = {
    firstName: session.user.user_metadata?.first_name || 'Usuario',
    lastName: session.user.user_metadata?.last_name || 'Demo',
    email: session.user.email || 'usuario@demo.com'
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
