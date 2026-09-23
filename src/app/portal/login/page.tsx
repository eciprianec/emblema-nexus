'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Search,
  Scale,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useClientPortalStore } from '@/features/client-portal/store/useClientPortalStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loginWithPin,
    loginWithMagicToken,
    loginDemo,
    isAuthenticated,
  } = useClientPortalStore();

  const [pin, setPin] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [activeTab, setActiveTab] = useState('pin');

  // Si se recibe un token por URL (ej: /portal/login?token=...)
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      const res = loginWithMagicToken(urlToken);
      if (res.success) {
        toast.success(res.message);
        router.push('/portal');
      } else {
        toast.error(res.message);
      }
    }
  }, [searchParams, loginWithMagicToken, router]);

  // Si ya está autenticado, redirigir al portal
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/portal');
    }
  }, [isAuthenticated, router]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      toast.error('Por favor ingrese su código PIN de 6 dígitos.');
      return;
    }

    const result = loginWithPin(pin.trim());
    if (result.success) {
      toast.success(result.message);
      router.push('/portal');
    } else {
      toast.error(result.message);
    }
  };

  const handleMagicTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicToken.trim()) {
      toast.error('Por favor ingrese o pegue el token de su enlace.');
      return;
    }

    const result = loginWithMagicToken(magicToken.trim());
    if (result.success) {
      toast.success(result.message);
      router.push('/portal');
    } else {
      toast.error(result.message);
    }
  };

  const handleQuickDemo = (clientId: string) => {
    loginDemo(clientId);
    toast.success('Iniciando sesión en modo demostración...');
    router.push('/portal');
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-12 space-y-8">
      {/* Encabezado */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center mx-auto shadow-md border border-slate-800">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Acceso al Portal de Clientes
        </h1>
        <p className="text-xs text-slate-500">
          Ingrese sus credenciales seguras proporcionadas por Emblema Nexus.
        </p>
      </div>

      {/* Tarjeta de Login */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 bg-slate-100 p-1">
            <TabsTrigger value="pin" className="text-xs font-semibold">
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              Código PIN
            </TabsTrigger>
            <TabsTrigger value="magic" className="text-xs font-semibold">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Magic Link
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Login por Código PIN */}
          <TabsContent value="pin" className="space-y-4">
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin-input" className="text-xs font-bold text-slate-800">
                  Código PIN Numérico de 6 Dígitos
                </Label>
                <Input
                  id="pin-input"
                  type="text"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="202642"
                  className="h-12 text-center text-2xl tracking-widest font-mono font-bold bg-slate-50 border-slate-300 focus:bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">
                  Consulte el mensaje de bienvenida enviado a su WhatsApp o correo.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-950 hover:bg-slate-850 text-white font-semibold text-xs shadow-sm"
              >
                Ingresar al Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </TabsContent>

          {/* Tab 2: Login por Token de Magic Link */}
          <TabsContent value="magic" className="space-y-4">
            <form onSubmit={handleMagicTokenSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-input" className="text-xs font-bold text-slate-800">
                  Token o Enlace de Acceso
                </Label>
                <Input
                  id="token-input"
                  type="text"
                  value={magicToken}
                  onChange={(e) => setMagicToken(e.target.value)}
                  placeholder="mag-98f12a-amorales"
                  className="h-11 font-mono text-xs bg-slate-50 border-slate-300 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  Pegue el identificador recibido en el enlace de su correo.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-950 hover:bg-slate-850 text-white font-semibold text-xs shadow-sm"
              >
                Validar Magic Link
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Acceso Rápido para Demostración */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block text-center">
            Accesos de Demostración Rápida
          </span>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('CLI-001')}
              className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block">Ing. Alejandro Morales</span>
                <span className="text-[11px] text-slate-500">Inversiones Caribeñas (PIN: 202642)</span>
              </div>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('CLI-002')}
              className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left transition-colors flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block">Dra. María Altagracia Peña</span>
                <span className="text-[11px] text-slate-500">Consultores Peña (PIN: 883012)</span>
              </div>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Enlaces de Ayuda */}
      <div className="text-center space-y-2 text-xs text-slate-500">
        <div>
          ¿Desea consultar un caso sin clave?{' '}
          <Link href="/portal/tracking" className="text-slate-900 font-semibold hover:underline">
            Rastreo público por código TRK
          </Link>
        </div>
        <div>
          ¿Es parte del equipo interno?{' '}
          <Link href="/login" className="text-slate-900 font-semibold hover:underline">
            Panel administrativo de Emblema Nexus
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs text-slate-500">Cargando portal de acceso...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
