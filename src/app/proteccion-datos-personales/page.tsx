import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Protección de Datos Personales | ASOSERLID",
  description:
    "Política de protección de datos personales de ASOSERLID y definición del tratamiento de datos personales.",
};

export default function ProteccionDatosPersonalesPage() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#218F93]">
            Tratamiento de datos personales
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#173C61]">
            Política de protección de datos personales
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Este documento define los datos personales que ASOSERLID trata, las finalidades, las bases de legitimación y los derechos de los titulares.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="blog-content">
            <h2>1. Alcance</h2>
            <p>
              Esta política aplica al tratamiento de datos personales realizado por ASOSERLID mediante su sitio web, formularios de contacto, canales de atención, correo electrónico, llamadas, WhatsApp y demás medios utilizados para gestionar solicitudes comerciales, operativas o administrativas.
            </p>

            <h2>2. Categorías de titulares</h2>
            <p>
              ASOSERLID podrá tratar datos personales de:
            </p>
            <ul>
              <li>Clientes actuales o potenciales.</li>
              <li>Representantes de empresas, instituciones públicas o privadas.</li>
              <li>Usuarios que soliciten información por el sitio web.</li>
              <li>Proveedores, aliados o contactos comerciales.</li>
              <li>Participantes o interesados en capacitaciones.</li>
            </ul>

            <h2>3. Datos personales objeto de tratamiento</h2>
            <p>
              Los datos tratados podrán incluir:
            </p>
            <ul>
              <li>Datos identificativos: nombres, apellidos, cargo o institución cuando el titular los proporcione.</li>
              <li>Datos de contacto: correo electrónico, teléfono, WhatsApp y dirección cuando sea necesaria para coordinar un servicio.</li>
              <li>Datos comerciales: servicio requerido, necesidades del cliente, frecuencia, horarios, ciudad o tipo de establecimiento.</li>
              <li>Datos de comunicación: mensajes, solicitudes, observaciones, historial de atención y respuestas enviadas.</li>
              <li>Datos técnicos básicos del sitio web: información necesaria para seguridad, funcionamiento y prevención de abuso.</li>
            </ul>

            <h2>4. Tipos de tratamiento</h2>
            <p>
              ASOSERLID podrá realizar operaciones como recolección, registro, organización, conservación, consulta, uso, análisis, actualización, comunicación, bloqueo, eliminación y demás actividades necesarias para cumplir las finalidades informadas.
            </p>

            <h2>5. Finalidades específicas</h2>
            <p>
              Los datos personales se tratarán para:
            </p>
            <ul>
              <li>Recibir, analizar y responder solicitudes enviadas desde el formulario web.</li>
              <li>Elaborar cotizaciones y propuestas comerciales.</li>
              <li>Coordinar visitas técnicas, horarios, alcance y requerimientos del servicio.</li>
              <li>Prestar servicios de limpieza, desinfección, mantenimiento, jardinería, fumigación y capacitación.</li>
              <li>Gestionar facturación, seguimiento administrativo y atención postservicio cuando corresponda.</li>
              <li>Enviar comunicaciones relacionadas con la solicitud o relación comercial existente.</li>
              <li>Cumplir obligaciones legales, regulatorias, contractuales o requerimientos de autoridad competente.</li>
              <li>Mejorar la atención al cliente, la seguridad del sitio web y la calidad de los procesos internos.</li>
            </ul>

            <h2>6. Datos sensibles</h2>
            <p>
              ASOSERLID no solicita datos sensibles mediante el formulario web. El usuario debe evitar incluir información sensible, como datos de salud, origen étnico, opiniones políticas, creencias religiosas, información biométrica o cualquier dato que no sea necesario para atender su solicitud.
            </p>
            <p>
              Si excepcionalmente se recibe información sensible de forma no solicitada, ASOSERLID la tratará únicamente cuando sea indispensable para atender la solicitud, cumplir una obligación legal o proteger derechos del titular, aplicando medidas reforzadas de confidencialidad.
            </p>

            <h2>7. Base legal del tratamiento</h2>
            <p>
              El tratamiento podrá basarse en el consentimiento del titular, la aplicación de medidas precontractuales, la ejecución de una relación contractual, el cumplimiento de obligaciones legales o el interés legítimo de ASOSERLID para atender solicitudes y proteger sus operaciones.
            </p>

            <h2>8. Encargados y proveedores</h2>
            <p>
              ASOSERLID podrá utilizar proveedores tecnológicos, servicios de hosting, correo electrónico, mantenimiento web o herramientas de comunicación. Estos proveedores podrán actuar como encargados del tratamiento y deberán tratar los datos conforme a instrucciones, confidencialidad y medidas de seguridad razonables.
            </p>

            <h2>9. Transferencias o comunicaciones</h2>
            <p>
              Los datos podrán comunicarse a terceros únicamente cuando sea necesario para atender la solicitud del titular, prestar el servicio requerido, cumplir obligaciones legales o contar con proveedores que apoyen la operación. No se venderán bases de datos personales.
            </p>

            <h2>10. Plazo de conservación</h2>
            <p>
              Los datos se conservarán durante el tiempo necesario para cumplir las finalidades descritas, atender responsabilidades legales o mantener evidencia de la gestión realizada. Posteriormente podrán ser eliminados, anonimizados o bloqueados, según corresponda.
            </p>

            <h2>11. Derechos de los titulares</h2>
            <p>
              El titular de los datos personales podrá ejercer los derechos reconocidos por la normativa aplicable, incluyendo acceso, rectificación, actualización, eliminación, oposición, anulación, limitación del tratamiento, portabilidad cuando corresponda y revocatoria del consentimiento.
            </p>

            <h2>12. Canal para solicitudes y reclamos</h2>
            <p>
              Para ejercer derechos o presentar consultas relacionadas con datos personales, el titular puede escribir a:
            </p>
            <p>
              <strong>Correo:</strong> <a href="mailto:asoserlid@outlook.es">asoserlid@outlook.es</a>
            </p>
            <p>
              La solicitud deberá incluir identificación del titular, medio de contacto, descripción clara del requerimiento y, cuando corresponda, documentos que permitan verificar la identidad o representación.
            </p>

            <h2>13. Medidas de seguridad</h2>
            <p>
              ASOSERLID adoptará medidas razonables para proteger los datos personales, tales como control de acceso, confidencialidad, uso de canales autorizados, revisión de permisos y buenas prácticas de seguridad informática y documental.
            </p>

            <h2>14. Actualización de la política</h2>
            <p>
              Esta política podrá actualizarse por cambios legales, tecnológicos, comerciales u operativos. La publicación en el sitio web informará la versión vigente.
            </p>

            <p className="text-sm text-slate-500">
              Última actualización: 10 de mayo de 2026.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <Link href="/politica-privacidad" className="font-semibold text-[#218F93] hover:text-[#173C61]">
              Ver política de privacidad
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
