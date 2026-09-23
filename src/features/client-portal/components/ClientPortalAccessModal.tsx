'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  Link as LinkIcon,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Ban,
  ExternalLink,
  UserCheck,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function ClientPortalAccessModal() {
  const {
    isAccessModalOpen,
    selectedClientForAccess,
    closeAccessModal,
    getAccessCredentialByClientId,
    generateAccessCredential,
    revokeAccessCredential,
  } = useClientPortalStore();

  const [copiedField, setCopiedField] = useState<'pin' | 'link' | null>(null);

  if (!selectedClientForAccess) return null;

  const credential = getAccessCredentialByClientId(selectedClientForAccess.id);

  const handleGenerate = () => {
    generateAccessCredential(
      selectedClientForAccess.id,
      selectedClientForAccess.name
    );
    toast.success('Credenciales y Magic Link de acceso generados exitosamente.');
  };

  const handleRevoke = () => {
    revokeAccessCredential(selectedClientForAccess.id);
    toast.warning('El acceso al portal para este cliente ha sido revocado.');
  };

  const handleCopy = (type: 'pin' | 'link', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(type);
    toast.success(`${type === 'pin' ? 'Código PIN' : 'Magic Link'} copiado al portapapeles.`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={isAccessModalOpen} onOpenChange={(open) => !open && closeAccessModal()}>
      <DialogContent className="max-w-md p-6 bg-white">
        <DialogHeader className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-slate-900 text-white rounded-lg">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Acceso al Portal de Clientes
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cliente: <strong className="text-slate-800">{selectedClientForAccess.name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 space-y-4">
          {credential && credential.isActive ? (
            <div className="space-y-4">
              {/* Estado de acceso */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <div className="flex items-center text-emerald-800 font-semibold">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Acceso Activo y Habilitado
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Vence: {credential.expiresAt}
                </Badge>
              </div>

              {/* Código PIN */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Código PIN de 6 Dígitos
                  </span>
                  <span className="text-[11px] text-slate-500">Para inicio en pantalla / app</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-mono font-bold tracking-widest text-slate-900 bg-white px-3 py-1 rounded border border-slate-200">
                    {credential.pin}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('pin', credential.pin)}
                    className="text-xs border-slate-300 font-medium"
                  >
                    {copiedField === 'pin' ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copiar PIN
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Enlace Magic Link */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Magic Link (Enlace Directo Sin Contraseña)
                  </span>
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xs font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 truncate select-all">
                  {credential.magicLinkUrl}
                </div>
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy('link', credential.magicLinkUrl)}
                    className="text-xs border-slate-300 font-medium"
                  >
                    {copiedField === 'link' ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Enlace Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copiar Enlace
                      </>
                    )}
                  </Button>
                  <a
                    href={credential.magicLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="ghost" className="text-xs">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Probar
                    </Button>
                  </a>
                </div>
              </div>

              {/* Acciones de administración */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerate}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Regenerar Claves
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRevoke}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Ban className="w-3.5 h-3.5 mr-1" />
                  Revocar Acceso
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Sin Acceso Activo al Portal
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Este cliente no tiene credenciales de acceso vigentes. Genere un Magic Link y código PIN para enviárselo por WhatsApp o correo.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Generar Acceso al Portal
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={closeAccessModal}
            className="text-xs"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
