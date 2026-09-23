'use client';

import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  Building,
  Scale,
  Phone,
  Mail,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useClientPortalStore } from '../store/useClientPortalStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export function PublicInquiryForm() {
  const { submitPublicInquiry } = useClientPortalStore();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    idNumber: '',
    serviceType: '',
    location: '',
    message: '',
  });

  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone || !formData.serviceType || !formData.message) {
      toast.error('Por favor complete todos los campos obligatorios del formulario.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const ticketNumber = submitPublicInquiry({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        idNumber: formData.idNumber || 'No especificada',
        serviceType: formData.serviceType,
        location: formData.location || 'Santo Domingo / Nacional',
        message: formData.message,
      });

      setSubmittedTicket(ticketNumber);
      setIsSubmitting(false);
      toast.success(`Su solicitud ha sido registrada formalmente bajo el radicado ${ticketNumber}.`);
    }, 600);
  };

  const handleCopyTicket = () => {
    if (!submittedTicket) return;
    navigator.clipboard.writeText(submittedTicket);
    setCopied(true);
    toast.success('Número de radicado copiado al portapapeles.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      idNumber: '',
      serviceType: '',
      location: '',
      message: '',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          <Scale className="w-3.5 h-3.5 text-slate-900" />
          <span>Atención a Clientes & Solicitudes de Dictamen</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
          Consulta Legal & Cotización de Agrimensura
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Complete el siguiente formulario formal. Uno de nuestros abogados inmobiliarios o agrimensores matriculados examinará su solicitud y emitirá una respuesta preliminar en un plazo máximo de 24 horas hábiles.
        </p>
      </div>

      {submittedTicket ? (
        /* Pantalla de Confirmación Exitosa */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-950">
              ¡Solicitud Recibida Satisfactoriamente!
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              Hemos registrado su consulta en el sistema central de Emblema Nexus. Se ha generado el siguiente código de radicación:
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
              Número de Radicado / Ticket
            </span>
            <div className="text-2xl font-mono font-bold text-slate-950">
              {submittedTicket}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyTicket}
              className="text-xs border-slate-300 font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar Número
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Tiempo de Respuesta</strong>
                <span className="text-slate-600">Menos de 24 horas hábiles</span>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Confidencialidad</strong>
                <span className="text-slate-600">Protegido por secreto profesional</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleReset}
              className="bg-slate-950 hover:bg-slate-850 text-white text-xs font-semibold px-6"
            >
              Enviar otra Consulta o Cotización
            </Button>
          </div>
        </div>
      ) : (
        /* Formulario de Entrada */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Nombre Completo */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold text-slate-800">
                  Nombre Completo / Razón Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Ej: Lic. Juan Pérez / Constructora Dominicana SRL"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="text-xs h-10 border-slate-300"
                />
              </div>

              {/* Cédula o RNC */}
              <div className="space-y-2">
                <Label htmlFor="idNumber" className="text-xs font-bold text-slate-800">
                  Cédula de Identidad o RNC
                </Label>
                <Input
                  id="idNumber"
                  placeholder="Ej: 001-1234567-8 o 1-31-00000-0"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  className="text-xs h-10 border-slate-300"
                />
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-slate-800">
                  Correo Electrónico de Contacto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="text-xs h-10 border-slate-300"
                />
              </div>

              {/* Teléfono / WhatsApp */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-800">
                  Teléfono / WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="(809) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="text-xs h-10 border-slate-300"
                />
              </div>

              {/* Tipo de Servicio */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  Tipo de Servicio Solicitado <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(val) => setFormData({ ...formData, serviceType: val })}
                >
                  <SelectTrigger className="text-xs h-10 border-slate-300">
                    <SelectValue placeholder="Seleccione la categoría del servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deslinde y Subdivisión Inmobiliaria">
                      Deslinde y Subdivisión Inmobiliaria (Ley 108-05)
                    </SelectItem>
                    <SelectItem value="Saneamiento Inmobiliario">
                      Saneamiento y Registro de Tierras
                    </SelectItem>
                    <SelectItem value="Litigio y Disputa de Tierras">
                      Litigio de Tierras y Demandas Inmobiliarias
                    </SelectItem>
                    <SelectItem value="Levantamiento Topográfico y Mensura">
                      Levantamiento Topográfico con GPS Geodésico
                    </SelectItem>
                    <SelectItem value="Transferencia Inmobiliaria y Due Diligence">
                      Transferencia Inmobiliaria y Estudio de Títulos
                    </SelectItem>
                    <SelectItem value="Refundición y Modificación Parcelaria">
                      Refundición de Parcelas y Modificación
                    </SelectItem>
                    <SelectItem value="Asesoría Legal y Fiscal Inmobiliaria">
                      Asesoría Legal, e-CF y Planificación Fiscal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ubicación del Inmueble */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs font-bold text-slate-800">
                  Ubicación del Inmueble (Provincia / Distrito Catastral)
                </Label>
                <Input
                  id="location"
                  placeholder="Ej: Higüey, Samaná, Santo Domingo Este..."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="text-xs h-10 border-slate-300"
                />
              </div>
            </div>

            {/* Mensaje o Descripción */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-xs font-bold text-slate-800">
                Descripción del Requerimiento o Consulta Jurídica <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                rows={5}
                placeholder="Detalle la situación actual del inmueble, número de matrícula o parcela si la conoce, superficie aproximada y los objetivos legales o técnicos que desea alcanzar..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
                className="text-xs border-slate-300 leading-relaxed"
              />
            </div>

            {/* Compromiso de Privacidad */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Al enviar este formulario, usted autoriza a Emblema Nexus a procesar los datos suministrados exclusivamente con fines de evaluación técnica y cotización. La información provista está salvaguardada por el Secreto Profesional.
              </span>
            </div>

            {/* Botón de Envío */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-slate-950 hover:bg-slate-850 text-white font-semibold text-xs px-8 h-11 shadow-sm"
              >
                {isSubmitting ? (
                  'Registrando solicitud...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Solicitud Formal
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
