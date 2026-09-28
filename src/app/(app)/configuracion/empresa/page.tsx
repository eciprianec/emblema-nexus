"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export interface CompanyFormValues {
  businessName: string;
  rnc: string;
  phone: string;
  email: string;
  currency: string;
  address: string;
}

const companyFormSchema: z.ZodType<CompanyFormValues> = z.object({
  businessName: z.string().min(2, "La razón social es requerida"),
  rnc: z.string().min(9, "RNC o Cédula debe tener al menos 9 dígitos"),
  phone: z.string(),
  email: z.string(),
  currency: z.string(),
  address: z.string(),
});

export default function EmpresaPage() {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      businessName: "",
      rnc: "",
      phone: "",
      email: "",
      currency: "DOP",
      address: "",
    },
  });

  // Cargar datos guardados si existen
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("nexus_company_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        form.reset(parsed);
      }
    } catch {}
  }, [form]);

  function onSubmit(data: CompanyFormValues) {
    try {
      localStorage.setItem("nexus_company_profile", JSON.stringify(data));
    } catch {}
    toast.success("Información de la empresa guardada de forma exitosa.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Perfil de la Empresa</h1>
          <p className="text-sm text-slate-500 mt-2">
            Configure los datos fiscales y la información de contacto principal.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-500" />
            Información General
          </CardTitle>
          <CardDescription>
            Estos datos serán utilizados en facturas electrónicas y reportes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Razón Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rnc"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Registro Nacional de Contribuyente (RNC)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. 130123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico Oficial</FormLabel>
                      <FormControl>
                        <Input placeholder="correo@empresa.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Teléfono Principal</FormLabel>
                      <FormControl>
                        <Input placeholder="809-000-0000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Moneda Base</FormLabel>
                      <FormControl>
                        <Input placeholder="DOP" {...field} />
                      </FormControl>
                      <FormDescription>Usada para finanzas y presupuestos.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Dirección Física</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección completa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
