/* ============================================================
   AutFlow — Idiomas (español / inglés)
   ------------------------------------------------------------
   El HTML está escrito en español. Este archivo guarda la
   traducción al inglés como un diccionario "texto en español →
   texto en inglés" y, al cambiar de idioma, reemplaza los textos
   visibles de la página y algunos atributos (aria-label).

   Para traducir un texto nuevo: añádelo a EN con el texto en
   español EXACTO (espacios internos da igual) como clave.
   Los textos que genera main.js pasan por AF_I18N.t().

   El idioma elegido se recuerda en el navegador. Si el visitante
   nunca eligió, se usa el idioma de su navegador (en → inglés).
   ============================================================ */
(() => {
  'use strict';

  const EN = {
    /* ---------- Documento ---------- */
    'AutFlow — Automatización e integraciones para pymes en Latinoamérica': 'AutFlow — Automation and integrations for small and mid-sized businesses',
    'AutFlow automatiza el trabajo manual de pequeñas y medianas empresas en Latinoamérica: facturas, reportes en Excel, correos y datos que se copian entre sistemas. Cotiza tu proceso en 2 minutos.':
      'AutFlow automates manual work for small and mid-sized businesses: invoices, Excel reports, emails and data copied between systems. Get an estimate in 2 minutes.',

    /* ---------- Cabecera y menú ---------- */
    'Saltar al cotizador': 'Skip to the estimator',
    'Soluciones': 'Solutions',
    'Cómo trabajamos': 'How we work',
    'Cotizador': 'Estimator',
    'Preguntas': 'FAQ',
    'Hablar por WhatsApp': 'Chat on WhatsApp',
    'AutFlow, inicio': 'AutFlow, home',
    'Principal': 'Main',
    'Abrir menú': 'Open menu',
    'Cerrar menú': 'Close menu',
    'Menú': 'Menu',
    'Cambiar idioma': 'Change language',

    /* ---------- Hero ---------- */
    'Automatización e integraciones para pymes · Latinoamérica': 'Automation and integrations for SMBs · Latin America',
    'Tú tienes la visión.': 'You have the vision.',
    'Nosotros, cómo hacerla realidad.': 'We know how to make it real.',
    'Automatizamos el trabajo manual de tu empresa: facturas que se digitan, reportes que se arman en Excel, correos que alguien clasifica y datos que se copian entre sistemas.':
      'We automate the manual work in your business: invoices typed by hand, reports built in Excel, emails someone has to sort, and data copied between systems.',
    'Cotizar mi proceso': 'Estimate my process',
    'Escribir por WhatsApp': 'Message us on WhatsApp',
    'para una estimación aproximada': 'for a rough estimate',
    'hábiles para responderte': 'business hours to reply',
    'Tus herramientas': 'Your tools',
    'Excel, correo, CRM, ERP': 'Excel, email, CRM, ERP',
    'Brazo robótico industrial': 'Industrial robotic arm',

    /* ---------- Cotizador: cabecera ---------- */
    '¿Cuánto puede costar': 'How much could it cost',
    'resolver tu problema?': 'to solve your problem?',
    'Siete preguntas y te damos una estimación aproximada en dólares. No es una cotización: el valor real lo definimos contigo después del diagnóstico.':
      'Seven questions and we give you a rough estimate in US dollars. It is not a quote: we set the real price with you after the assessment.',
    'Paso {n} de {total}': 'Step {n} of {total}',
    'Toma menos de 2 minutos': 'Takes less than 2 minutes',
    'Reiniciar': 'Restart',
    'Atrás': 'Back',
    'Siguiente': 'Next',
    'Ver mi estimado': 'See my estimate',
    'Cambiar respuestas': 'Change answers',
    'Tu estimado está listo': 'Your estimate is ready',
    'Basado en las respuestas que diste': 'Based on your answers',

    /* Subtítulos de cada paso */
    'Elige lo que más se parezca a tu caso': 'Pick what looks most like your case',
    'Un estimado es suficiente': 'A rough number is fine',
    'De principio a fin, una sola vez': 'Start to finish, one time',
    'Una pregunta según tu caso': 'One question about your case',
    'Cada sistema es un punto de conexión': 'Each system is a connection point',
    'Define la infraestructura que necesita': 'This defines the infrastructure it needs',
    'Última pregunta': 'Last question',

    /* Paso 1 */
    '¿Qué proceso quieres quitarte de encima?': 'Which process do you want off your plate?',
    'Si ninguna encaja perfecto, elige la más cercana.': 'If none fits perfectly, pick the closest one.',
    'Procesar documentos': 'Processing documents',
    'Excel y reportes': 'Excel and reports',
    'Tareas en páginas web': 'Tasks on websites',
    'Correos electrónicos': 'Emails',
    'Conectar sistemas': 'Connecting systems',
    'Atención a clientes': 'Customer service',
    'Apps de escritorio': 'Desktop apps',
    'Varias cosas a la vez': 'Several things at once',
    'Aún no lo tengo claro': 'I am not sure yet',

    /* Vistas previas */
    'Pasa el cursor por una opción': 'Hover over an option',
    'y te mostramos cómo se ve ese trabajo automatizado': 'and we will show you what that work looks like automated',
    'Bandeja de entrada': 'Inbox',
    '24 nuevos': '24 new',
    'Factura FE-4821 adjunta': 'Invoice FE-4821 attached',
    'Facturas': 'Invoices',
    'Solicitud de cotización': 'Quote request',
    'Ventas': 'Sales',
    'Guía de despacho #1193': 'Shipping note #1193',
    'Logística': 'Logistics',
    'Cada correo se lee, se clasifica y se responde solo.': 'Every email is read, sorted and answered automatically.',
    'ID fiscal': 'Tax ID',
    'Fecha': 'Date',
    'Los datos del PDF llegan solos a tu sistema.': 'The PDF data lands in your system on its own.',
    'Ene': 'Jan',
    'Norte': 'North',
    'Centro': 'Central',
    'Sur': 'South',
    'El reporte del lunes ya está listo el lunes.': 'Monday’s report is ready on Monday.',
    'Cliente': 'Customer',
    'Referencia': 'Reference',
    'Enviar pedido': 'Submit order',
    'Llena formularios y descarga reportes por ti.': 'It fills in forms and downloads reports for you.',
    'Cliente creado en CRM': 'Customer created in CRM',
    'Pedido sincronizado en ERP': 'Order synced to ERP',
    'Inventario actualizado': 'Inventory updated',
    'Tus sistemas se hablan sin copiar y pegar.': 'Your systems talk to each other, no copy and paste.',
    'Hola, ¿tienen cita disponible el jueves?': 'Hi, do you have an appointment available on Thursday?',
    '¡Claro! Tengo 10:00 a. m. o 3:00 p. m. ¿Cuál te sirve?': 'Sure! I have 10:00 a.m. or 3:00 p.m. Which works for you?',
    'A las 3, porfa.': '3 p.m., please.',
    'Responde al instante y agenda sin esperas.': 'It replies instantly and books without the wait.',
    'Registro de facturas · ERP': 'Invoice entry · ERP',
    'Proveedor': 'Supplier',
    'Valor': 'Amount',
    'Trabaja en tu programa como lo haría una persona.': 'It works in your software the way a person would.',
    'Llega el correo': 'The email arrives',
    'Se lee la factura': 'The invoice is read',
    'Se registra en Excel': 'It is logged in Excel',
    'Se avisa al equipo': 'The team is notified',
    'Un solo flujo de principio a fin.': 'One flow from start to finish.',
    '¿Se repite cada semana?': 'Does it happen every week?',
    '¿Sigue siempre los mismos pasos?': 'Does it always follow the same steps?',
    '¿Le quita horas a tu equipo?': 'Does it take hours from your team?',
    'Si respondes sí a alguna, hay algo por automatizar.': 'If you answer yes to any, there is something to automate.',

    /* Paso 2 */
    '¿Cuántas veces pasa al mes?': 'How many times does it happen per month?',
    'No necesitas el número exacto.': 'You don’t need the exact number.',
    'Menos de 10 veces': 'Fewer than 10 times',
    'Entre 10 y 50 veces': 'Between 10 and 50 times',
    'Entre 50 y 200 veces': 'Between 50 and 200 times',
    'Entre 200 y 1.000 veces': 'Between 200 and 1,000 times',
    'Más de 1.000 veces': 'More than 1,000 times',

    /* Paso 3 */
    '¿Cuánto tarda una persona hoy?': 'How long does it take a person today?',
    'Con esto calculamos las horas que recuperas.': 'We use this to calculate the hours you get back.',
    'Menos de 5 minutos': 'Less than 5 minutes',
    'Entre 5 y 15 minutos': 'Between 5 and 15 minutes',
    'Entre 15 y 30 minutos': 'Between 15 and 30 minutes',
    'Entre 30 y 60 minutos': 'Between 30 and 60 minutes',
    'Más de una hora': 'More than an hour',

    /* Paso 4 (según el caso) */
    '¿Qué documentos procesas?': 'Which documents do you process?',
    'Los escaneados y las imágenes requieren lectura con IA.': 'Scans and images require AI reading.',
    'PDF digitales': 'Digital PDFs',
    'PDF escaneados': 'Scanned PDFs',
    'Imágenes o fotos': 'Images or photos',
    'Documentos Word': 'Word documents',
    'De todo un poco': 'A bit of everything',
    '¿Qué tan complejos son los archivos?': 'How complex are the files?',
    'Los formatos que cambian son lo que más trabajo da.': 'Formats that keep changing take the most work.',
    'Un archivo sencillo': 'One simple file',
    'Varios archivos': 'Several files',
    'Plantillas con varias hojas': 'Templates with several sheets',
    'Formatos que cambian seguido': 'Formats that change often',
    'No estoy seguro': 'I’m not sure',
    '¿La página pide iniciar sesión?': 'Does the website require a login?',
    'El doble factor cambia bastante el enfoque técnico.': 'Two-factor authentication changes the technical approach quite a bit.',
    'No, es pública': 'No, it is public',
    'Sí, usuario y contraseña': 'Yes, username and password',
    'Sí, con MFA o 2FA': 'Yes, with MFA or 2FA',
    '¿Qué tan parecidos son los correos?': 'How similar are the emails?',
    'Entre más varíen, más criterio necesita el agente.': 'The more they vary, the more judgment the agent needs.',
    'Siempre el mismo formato': 'Always the same format',
    'Cambian bastante': 'They vary a lot',
    'Hay que leer los adjuntos': 'The attachments need to be read',
    '¿Los sistemas tienen API?': 'Do the systems have an API?',
    'Si no la hay, automatizamos la interfaz directamente.': 'If not, we automate the interface directly.',
    'Sí, con documentación': 'Yes, documented',
    'Sí, pero sin documentar': 'Yes, but undocumented',
    'No tienen API': 'No API',
    '¿Qué tan variadas son las consultas?': 'How varied are the inquiries?',
    'Conectarse a tus datos es lo que lo vuelve realmente útil.': 'Connecting to your data is what makes it truly useful.',
    'Preguntas frecuentes fijas': 'Fixed frequently asked questions',
    'Conversación con contexto': 'Conversation with context',
    'Debe consultar el CRM o la base de datos': 'It must look things up in the CRM or database',
    '¿La aplicación permite integrarse?': 'Can the application be integrated?',
    'Una API, una base de datos o archivos exportables.': 'An API, a database or exportable files.',
    'Sí, hay por dónde entrar': 'Yes, there is a way in',
    'No, solo la pantalla': 'No, only the screen',
    '¿Cuántas tareas distintas combina?': 'How many different tasks does it combine?',
    'Cada tarea suma un tramo al flujo.': 'Each task adds a stage to the flow.',
    'Dos tareas': 'Two tasks',
    'Tres tareas': 'Three tasks',
    'Cuatro o más': 'Four or more',
    '¿Qué tan repetitivo es el proceso?': 'How repetitive is the process?',
    'Entre más predecible, más fácil de automatizar.': 'The more predictable, the easier to automate.',
    'Siempre igual, muy predecible': 'Always the same, very predictable',
    'Algo variable': 'Somewhat variable',
    'Bastante variable': 'Quite variable',

    /* Pasos 5–7 */
    '¿Con cuántos sistemas debe hablar?': 'How many systems does it need to talk to?',
    'Por ejemplo: Excel → correo → página web → ERP.': 'For example: Excel → email → website → ERP.',
    'Uno solo': 'Just one',
    'Dos': 'Two',
    'Entre tres y cuatro': 'Three or four',
    'Cinco o más': 'Five or more',
    '¿Cada cuánto debería ejecutarse?': 'How often should it run?',
    'Solo cuando yo lo pida': 'Only when I ask',
    'Una vez por semana': 'Once a week',
    'Todos los días': 'Every day',
    'Varias veces al día': 'Several times a day',
    '24/7, sin parar': '24/7, non-stop',
    '¿Qué tan seguido hay casos raros?': 'How often are there unusual cases?',
    'Los que no siguen la regla y alguien tiene que revisar aparte.': 'The ones that break the rule and someone has to review separately.',
    'Casi nunca, siempre es igual': 'Almost never, it is always the same',
    'Dos o tres casos conocidos': 'Two or three known cases',
    'Muchos casos borde': 'Many edge cases',

    /* Resultado y panel lateral */
    'Complejidad': 'Complexity',
    'Solución puntual': 'Focused solution',
    'Solución integrada': 'Integrated solution',
    'Solución a medida': 'Custom solution',
    'Desde {v}': 'From {v}',
    'dólares (USD) · estimación aproximada, no es una cotización': 'US dollars · rough estimate, not a quote',
    'Quiero revisar este caso con AutFlow': 'I want to review this case with AutFlow',
    'Es solo una referencia. El valor final depende del alcance, las integraciones y tu operación, y lo acordamos contigo antes de empezar. Somos un equipo pequeño: buscamos que la inversión tenga sentido para tu empresa.':
      'This is only a reference. The final price depends on scope, integrations and your operation, and we agree on it with you before we start. We are a small team: we make sure the investment makes sense for your business.',
    'Estimación aproximada': 'Rough estimate',
    'Responde 3 preguntas para ver una estimación': 'Answer 3 questions to see an estimate',
    '{name} · aproximado, se ajusta con cada respuesta': '{name} · approximate, updates with each answer',
    'Lo que recuperas': 'What you get back',
    '(supuesto: US$5 por hora)': '(assumes US$5 per hour)',
    'Horas al mes': 'Hours per month',
    'Valor mensual': 'Monthly value',
    'Se paga solo en': 'Pays for itself in',
    'Menos de 1 mes': 'Less than 1 month',
    '{n} mes': '{n} month',
    '{n} meses': '{n} months',
    'Tus respuestas': 'Your answers',
    'Proceso': 'Process',
    'Volumen': 'Volume',
    'Duración': 'Duration',
    'Detalle': 'Detail',
    'Sistemas': 'Systems',
    'Frecuencia': 'Frequency',
    'Excepciones': 'Exceptions',
    'Horas liberadas / mes': 'Hours freed / month',
    'Resumen del estimado': 'Estimate summary',

    /* ---------- Soluciones ---------- */
    '¿Te suena alguno': 'Does any of these',
    'de estos problemas?': 'sound familiar?',
    'Si alguno se repite en tu empresa, probablemente se puede automatizar. Esto es lo que hacemos en cada caso.':
      'If any of these keeps happening in your business, it can probably be automated. Here is what we do in each case.',
    'Problemas y soluciones': 'Problems and solutions',
    'El problema': 'The problem',
    'Qué hacemos': 'What we do',
    'Qué cambia': 'What changes',
    'Facturas y documentos que alguien digita a mano': 'Invoices and documents someone types in by hand',
    'Leemos los PDF, escaneos o fotos y llevamos los datos a tu sistema contable o a Excel.': 'We read the PDFs, scans or photos and send the data to your accounting system or to Excel.',
    'Menos digitación y menos errores de transcripción.': 'Less typing and fewer transcription errors.',
    'Reportes que cada semana se arman copiando de varios archivos': 'Weekly reports built by copying from several files',
    'Consolidamos las fuentes y generamos el reporte de forma automática.': 'We consolidate the sources and generate the report automatically.',
    'El reporte está listo cuando lo necesitas.': 'The report is ready when you need it.',
    'Clientes que escriben por WhatsApp o correo y esperan respuesta': 'Customers who write on WhatsApp or email and wait for a reply',
    'Respondemos las consultas frecuentes y pasamos a una persona las que necesitan criterio.': 'We answer the common questions and hand the ones that need judgment to a person.',
    'Respuestas inmediatas sin perder el trato humano.': 'Instant replies without losing the human touch.',
    'Datos que se copian entre el CRM, el ERP y las hojas de cálculo': 'Data copied between the CRM, the ERP and spreadsheets',
    'Conectamos tus sistemas para que la información viaje sola, con validaciones.': 'We connect your systems so information flows on its own, with validations.',
    'Una sola versión de los datos, sin doble trabajo.': 'One version of the data, no double work.',
    'Tareas repetitivas en portales web: descargas, cargues, consultas': 'Repetitive tasks on web portals: downloads, uploads, lookups',
    'Automatizamos los pasos dentro del portal, incluso cuando no tiene API.': 'We automate the steps inside the portal, even when it has no API.',
    'Tu equipo deja de hacer clics repetitivos.': 'Your team stops doing repetitive clicks.',
    'Primero entendemos el proceso. Después elegimos la herramienta, no al revés.': 'First we understand the process. Then we choose the tool, not the other way around.',

    /* ---------- Cómo trabajamos ---------- */
    'Así se ve una': 'This is what an',
    'automatización por dentro.': 'automation looks like inside.',
    'Ejemplo ilustrativo: una factura llega por correo y termina registrada sin que nadie la digite.': 'Illustrative example: an invoice arrives by email and ends up recorded without anyone typing it.',
    '1 · Llega': '1 · Arrives',
    'Correo · 08:14': 'Email · 08:14',
    'Adjunto factura FE-4821': 'Invoice FE-4821 attached',
    '2 · Se lee': '2 · Read',
    '3 · Se registra': '3 · Recorded',
    'Factura': 'Invoice',
    '4 · Se avisa': '4 · Notified',
    'Mensaje al equipo': 'Message to the team',
    'Factura FE-4821 registrada.': 'Invoice FE-4821 recorded.',
    'Vence el 13/04. Sin diferencias con la orden de compra.': 'Due on 04/13. No differences with the purchase order.',
    'Ver de nuevo': 'Play again',
    'El método, en cuatro pasos': 'The method, in four steps',
    'Semana 1': 'Week 1',
    'Diagnóstico': 'Assessment',
    'Una llamada de 20 minutos y una revisión del proceso.': 'A 20-minute call and a review of the process.',
    'Recibes: qué automatizar primero y una propuesta de valor.': 'You get: what to automate first and a price proposal.',
    'Semanas 1–2': 'Weeks 1–2',
    'Diseño': 'Design',
    'Definimos qué hace el sistema y qué sigue revisando una persona.': 'We define what the system does and what a person keeps reviewing.',
    'Recibes: el flujo aprobado antes de construirlo.': 'You get: the approved flow before we build it.',
    'Semanas 2–3': 'Weeks 2–3',
    'Construcción': 'Build',
    'Lo integramos en tus herramientas actuales, sin migrar nada.': 'We integrate it into your current tools, without migrating anything.',
    'Recibes: pruebas con tus datos reales.': 'You get: tests with your real data.',
    'Semanas 3–4': 'Weeks 3–4',
    'Puesta en marcha': 'Launch',
    'Salimos a producción, medimos y ajustamos.': 'We go live, measure and adjust.',
    'Recibes: documentación y soporte.': 'You get: documentation and support.',

    /* ---------- Preguntas ---------- */
    'Preguntas frecuentes': 'Frequently asked questions',
    'Antes de': 'Before you',
    'escribirnos.': 'write to us.',
    'Si tu duda no está aquí, respondemos por WhatsApp en menos de 24 horas hábiles.': 'If your question is not here, we reply on WhatsApp within 24 business hours.',
    'Hacer una pregunta': 'Ask a question',
    '¿Cuánto cuesta?': 'How much does it cost?',
    'Depende del proceso: cuántas veces se repite, cuántos sistemas hay que conectar y qué tantas excepciones tiene. El cotizador te da una estimación aproximada en dólares y el valor real lo acordamos contigo después del diagnóstico. Somos un equipo pequeño, así que los proyectos se ajustan al tamaño de tu empresa.':
      'It depends on the process: how often it repeats, how many systems need connecting and how many exceptions it has. The estimator gives you a rough figure in US dollars, and we agree on the real price with you after the assessment. We are a small team, so projects are sized to your business.',
    '¿Cuánto tiempo toma tener algo funcionando?': 'How long until something is up and running?',
    'Normalmente entre 2 y 4 semanas desde el diagnóstico. Los procesos más acotados, en 1 o 2.': 'Usually 2 to 4 weeks from the assessment. Smaller processes, 1 or 2.',
    '¿Tengo que cambiar las herramientas que uso?': 'Do I have to change the tools I use?',
    'No. Trabajamos dentro de lo que ya usas: Excel o Google Sheets, correo, WhatsApp, tu CRM o tu ERP. Si algo funciona, no lo tocamos.':
      'No. We work inside what you already use: Excel or Google Sheets, email, WhatsApp, your CRM or your ERP. If something works, we leave it alone.',
    '¿Qué pasa con mis datos?': 'What happens to my data?',
    'Pedimos solo el acceso necesario y definimos contigo por dónde viaja la información antes de implementar. Todo queda documentado.':
      'We only ask for the access we need and agree with you on where the information travels before implementing. Everything is documented.',
    '¿Y si después cambia mi proceso?': 'What if my process changes later?',
    'Es lo normal. Con el acompañamiento monitoreamos el flujo y lo ajustamos. Sin él, te queda la documentación para hacerlo o para pedirnos un ajuste puntual.':
      'That is normal. With ongoing support we monitor the flow and adjust it. Without it, you keep the documentation to do it yourself or ask us for a one-off change.',
    '¿Y si no vale la pena automatizarlo?': 'What if it is not worth automating?',
    'Te lo decimos en el diagnóstico. Si el proceso no se repite lo suficiente o la inversión no tiene sentido, preferimos decírtelo antes de cobrarte.':
      'We tell you in the assessment. If the process does not repeat enough or the investment does not make sense, we would rather tell you before charging you.',

    /* ---------- Navegación de slides ---------- */
    'Siguiente: {name}': 'Next: {name}',
    'Ir al cotizador': 'Go to the estimator',
    'Volver al cotizador': 'Back to the estimator',
    'Navegación entre secciones': 'Section navigation',

    /* ---------- Pie de página ---------- */
    'Automatizamos el trabajo repetitivo de pequeñas y medianas empresas, dentro de las herramientas que ya usan.': 'We automate repetitive work for small and mid-sized businesses, inside the tools they already use.',
    'Respondemos en menos de 24 horas hábiles.': 'We reply within 24 business hours.',
    'AutFlow · Desde Colombia para Latinoamérica.': 'AutFlow · From Colombia to the Americas.',
    'Pie de página': 'Footer',
    'Redes sociales': 'Social media',
    'Instagram de AutFlow': 'AutFlow on Instagram',
    'LinkedIn de AutFlow': 'AutFlow on LinkedIn',
    'WhatsApp de AutFlow': 'AutFlow on WhatsApp',

    /* ---------- Mensajes de WhatsApp ---------- */
    'Hola AutFlow, quiero hablar sobre {topic}. Mi principal problema es: ': 'Hi AutFlow, I would like to talk about {topic}. My main problem is: ',
    'una oportunidad de automatización': 'an automation opportunity',
    'una duda antes de empezar': 'a question before getting started',
    'Hola AutFlow, completé el cotizador.': 'Hi AutFlow, I completed the estimator.',
    'Quiero agendar la llamada de 20 minutos.': 'I would like to book the 20-minute call.',
    'Horas liberadas al mes: ~{n}': 'Hours freed per month: ~{n}'
  };

  const html = document.documentElement;
  const KEY = 'af-lang';
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const listeners = [];

  let lang = '';
  try { lang = localStorage.getItem(KEY) || ''; } catch (e) { /* almacenamiento bloqueado */ }
  if (lang !== 'es' && lang !== 'en') lang = /^en\b/i.test(navigator.language || '') ? 'en' : 'es';

  /** Traduce un texto (y rellena {variables}). */
  const t = (s, vars) => {
    let out = lang === 'en' && EN[s] !== undefined ? EN[s] : s;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return out;
  };

  /* Textos del documento que no están en <body> */
  const title = norm(document.title);
  const desc = document.querySelector('meta[name="description"]');
  const descEs = desc ? norm(desc.content) : '';

  /** Recorre los nodos de texto y los atributos traducibles. */
  const apply = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && n.parentElement.closest('script,style,svg')
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
    });
    let n;
    while ((n = walker.nextNode())) {
      if (n.__es === undefined) {
        const k = norm(n.nodeValue);
        if (!k || EN[k] === undefined) continue;
        n.__es = n.nodeValue;
        n.__k = k;
      }
      const lead = n.__es.match(/^\s*/)[0];
      const trail = n.__es.match(/\s*$/)[0];
      n.nodeValue = lang === 'en' ? lead + EN[n.__k] + trail : n.__es;
    }
    document.querySelectorAll('[aria-label]').forEach((el) => {
      if (el.__esLabel === undefined) {
        const k = norm(el.getAttribute('aria-label'));
        if (EN[k] === undefined) return;
        el.__esLabel = k;
      }
      el.setAttribute('aria-label', t(el.__esLabel));
    });
    html.lang = lang;
    document.title = t(title);
    if (desc) desc.content = t(descEs);
  };

  const syncToggle = () => {
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.querySelectorAll('[data-l]').forEach((s) => s.classList.toggle('on', s.dataset.l === lang));
      b.setAttribute('aria-label', lang === 'en' ? 'Cambiar a español' : 'Switch to English');
    });
  };

  const set = (next) => {
    if (next !== 'es' && next !== 'en') return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) { /* sin persistencia */ }
    apply();
    syncToggle();
    listeners.forEach((fn) => fn(lang));
  };

  window.AF_I18N = {
    t,
    get lang() { return lang; },
    set,
    onChange(fn) { listeners.push(fn); }
  };

  /* Se aplica cuando main.js ya construyó sus elementos dinámicos */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lang-toggle').forEach((b) =>
      b.addEventListener('click', () => set(lang === 'en' ? 'es' : 'en')));
    if (lang === 'en') set('en'); else syncToggle();
  });
})();
