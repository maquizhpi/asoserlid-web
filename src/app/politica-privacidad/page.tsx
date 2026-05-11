import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad | ASOSERLID",
  description:
    "Política de privacidad de ASOSERLID para el tratamiento de datos personales recibidos por la página web.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">
            ASOSERLID
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#173C61]">
            Política de privacidad
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Esta política informa cómo ASOSERLID recopila, utiliza, conserva y protege los datos personales recibidos a través de su página web.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="blog-content">
            <p>
              La Asociación de Servicios de Limpieza DURACLEAN Limpio Duradero - ASOSERLID, en adelante ASOSERLID, reconoce la importancia de proteger la privacidad de los usuarios, clientes, proveedores y visitantes de su sitio web.
            </p>

            <h2>1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de los datos personales es ASOSERLID, con domicilio referencial en Barcelona y Madrid, Ambato, Ecuador.
            </p>
            <p>
              Canal de contacto: <a href="mailto:asoserlid@outlook.es">asoserlid@outlook.es</a>
            </p>

            <h2>2. Datos personales que podemos recopilar</h2>
            <p>
              A través del formulario de contacto, ASOSERLID puede recopilar los siguientes datos:
            </p>
            <ul>
              <li>Nombre del cliente o solicitante.</li>
              <li>Correo electrónico.</li>
              <li>Teléfono o WhatsApp.</li>
              <li>Servicio requerido.</li>
              <li>Mensaje enviado por el usuario.</li>
              <li>Datos técnicos mínimos asociados al uso del sitio web, cuando sean generados por el navegador o servidor.</li>
            </ul>

            <h2>3. Finalidades del tratamiento</h2>
            <p>
              Los datos personales serán tratados para las siguientes finalidades:
            </p>
            <ul>
              <li>Responder consultas, solicitudes de información o cotizaciones.</li>
              <li>Contactar al usuario por correo electrónico, teléfono o WhatsApp.</li>
              <li>Coordinar la prestación de servicios de limpieza, mantenimiento, desinfección, jardinería, fumigación o capacitación.</li>
              <li>Gestionar relaciones comerciales, administrativas y de atención al cliente.</li>
              <li>Dar seguimiento a requerimientos enviados por medio de la página web.</li>
              <li>Cumplir obligaciones legales, regulatorias o contractuales cuando corresponda.</li>
            </ul>

            <h2>4. Base de legitimación</h2>
            <p>
              El tratamiento se realiza principalmente con base en el consentimiento del titular al enviar voluntariamente sus datos mediante el formulario web. También podrá sustentarse en la ejecución de medidas precontractuales, el cumplimiento de obligaciones legales o el interés legítimo de ASOSERLID para atender solicitudes relacionadas con sus servicios.
            </p>

            <h2>5. Conservación de la información</h2>
            <p>
              Los datos se conservarán durante el tiempo necesario para atender la solicitud, mantener la relación comercial o cumplir obligaciones legales aplicables. Cuando los datos ya no sean necesarios, serán eliminados o bloqueados conforme a criterios razonables de seguridad y conservación documental.
            </p>

            <h2>6. Comunicación de datos a terceros</h2>
            <p>
              ASOSERLID no vende ni alquila datos personales. Los datos podrán ser comunicados únicamente cuando sea necesario para responder la solicitud del titular, prestar un servicio, cumplir una obligación legal o utilizar proveedores tecnológicos que actúen bajo instrucciones de ASOSERLID.
            </p>

            <h2>7. Seguridad de la información</h2>
            <p>
              ASOSERLID aplicará medidas razonables de seguridad administrativa, técnica y organizativa para proteger los datos personales contra pérdida, acceso no autorizado, alteración, divulgación o uso indebido.
            </p>

            <h2>8. Derechos del titular</h2>
            <p>
              El titular podrá solicitar el acceso, rectificación, actualización, eliminación, oposición, anulación, limitación del tratamiento y demás derechos reconocidos por la normativa aplicable de protección de datos personales.
            </p>
            <p>
              Para ejercer estos derechos, puede escribir a <a href="mailto:asoserlid@outlook.es">asoserlid@outlook.es</a>, indicando su nombre, medio de contacto y la solicitud concreta.
            </p>

            <h2>9. Cambios en esta política</h2>
            <p>
              ASOSERLID podrá actualizar esta política para reflejar cambios normativos, técnicos u operativos. La versión vigente estará disponible en esta página.
            </p>

            <p className="text-sm text-slate-500">
              Última actualización: 10 de mayo de 2026.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <Link href="/proteccion-datos-personales" className="font-semibold text-[#218F93] hover:text-[#173C61]">
              Ver política de protección de datos personales
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
