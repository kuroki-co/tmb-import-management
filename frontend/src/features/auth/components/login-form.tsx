"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Field, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { login } from "../api";
const schema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export function LoginForm() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          await login(values.email, values.password);
          router.replace("/panel/solicitudes");
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "No se pudo iniciar sesión",
          );
        }
      })}
    >
      <Field
        label="Correo electrónico"
        htmlFor="email"
        error={errors.email?.message}
      >
        <div className="relative">
          <Mail size={17} className="absolute left-3 top-3.5 text-muted" />
          <input
            id="email"
            autoComplete="username"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            type="email"
            placeholder="tu.correo@tmb.com"
            className={`${inputClass} pl-10`}
            {...register("email")}
          />
        </div>
      </Field>
      <Field
        label="Contraseña"
        htmlFor="password"
        error={errors.password?.message}
      >
        <div className="relative">
          <LockKeyhole
            size={17}
            className="absolute left-3 top-3.5 text-muted"
          />
          <input
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            type={visible ? "text" : "password"}
            placeholder="Ingresa tu contraseña"
            className={`${inputClass} pl-10 pr-12`}
            {...register("password")}
          />
          <button
            type="button"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-background"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Ingresando…" : "Ingresar al panel"}
        <ArrowRight size={17} />
      </Button>
      <p className="text-center text-xs leading-5 text-muted">
        Acceso exclusivo para el equipo de TMB.
        <br />
        Solicita tus credenciales al administrador.
      </p>
    </form>
  );
}
