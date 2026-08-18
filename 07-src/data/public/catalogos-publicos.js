  const CLIENTES = ["Banorte","Sura","General de Salud","General de Salud Infonavit"];

  /* ===== Tipo de trámite — CATÁLOGO PLANO ÚNICO (2026-08-16) =====
     Decisión de Leonardo: el catálogo deja de cambiar por cliente. Se construye
     por UNIÓN de los cuatro catálogos vigentes, sin duplicados exactos, sin
     inventar valores y conservando acentos y denominaciones aprobadas.

     Orden estable y documentado: bloque Banorte en su orden vigente, luego los
     valores que aporta Sura, luego General de Salud, luego GS Infonavit, y
     "Otro" siempre al final.

     Denominaciones EQUIVALENTES PERO NO IDÉNTICAS que se conservan sin
     normalizar (requiere decisión expresa del área para consolidarlas):
       · "CAT" (Banorte) vs "Áreas CAT" (GS Infonavit)
       · "Case Managment" — grafía vigente en producción, no se corrige aquí
     Retirarlas rompería la validez de los folios históricos de cada cliente. */
  const TRAMITES_UNIFICADOS = [
    /* Banorte */
    "Programación","Reembolso","Pago directo","Siniestralidad",
    "Pagos","ATF","Case Managment","AP","Redes",
    "Reinstalación","Mesa control pago directo","Mesa control reembolso","CAT","Sistemas",
    /* Sura */
    "Hospitalización","Reporte Hospitalario",
    /* General de Salud */
    "Revisión con Agente","Urgencias","Actualización de Carta",
    /* General de Salud Infonavit */
    "Envío a Domicilio","Alcance y/o Cobertura","Corrección de datos","Cita Médica",
    "Estado de Cuenta","Áreas CAT","Servicio del Proveedor","Transcripción","Aclaraciones",
    /* Escape final */
    "Otro"
  ];

  /* ===== Tipo de solicitud (id técnico Tipo_Atencion) — CATÁLOGO PLANO ÚNICO =====
     Misma construcción por unión. El id, la clave de payload y la columna de
     SharePoint siguen llamándose Tipo_Atencion: solo cambia la etiqueta visible.
     "Requerimiento" conserva su regla y abre SUBTIPO_REQUERIMIENTO_OPCIONES.

     Denominación EQUIVALENTE PERO NO IDÉNTICA conservada sin normalizar:
       · "Incidencias" (Banorte) vs "Incidencia" (General de Salud)
     Ambas permanecen hasta que el área decida expresamente cuál prevalece. */
  const ATENCIONES_UNIFICADAS = [
    /* Banorte */
    "Queja","Asesoría","Corrección","Seguimiento","Reconsideración","Jurídico",
    "Licitación","Reinstalación","Programación","Reembolso","Oficio","Incidencias",
    "Requerimiento",
    /* General de Salud */
    "Incidencia",
    /* Escape final */
    "Otro"
  ];

  /* Área responsable — catálogo funcional ratificado por ATC el 2026-08-13 (D-AREA-01).
     Identifica el área que debe resolver el caso. NO representa el organigrama y NO
     lleva asociado ningún catálogo de personas: ATC retiró ese requisito (D-AREA-03). */
  const AREAS_RESPONSABLES = [
    "Reembolsos / ATF",
    "Programación",
    "Pago Directo",
    "Mesa de Control",
    "Redes",
    "Call Center / CAT",
    "Auditoría Médica",
    "Coordinación Médica",
    "Tecnología",
    "Facturación",
    "Finanzas",
    "Comercial",
    "Dirección Médica",
    "Operaciones",
    "Calidad",
    "Otro"
  ];

  /* Subcategorías de Requerimiento — catálogo aprobado por el área funcional 2026-08-13.
     Solo aplica cuando Tipo_Atencion = "Requerimiento". "Otros" abre texto libre. */
  const SUBTIPO_REQUERIMIENTO_OPCIONES = [
    "Estatus de folio",
    "Alta hospitalaria",
    "Hospitalización",
    "Envío de respuesta",
    "Activación de folio",
    "Estados de cuenta",
    "Activación de caso",
    "Tabulador informativo",
    "Incidencias de sistema",
    "Otros"
  ];

  /* Configuración declarativa por cliente */
  const CLIENT_CONFIG = {
    "Banorte":                    { preguntaFolio:false, asegurado:false, agente:false },
    "Sura":                       { preguntaFolio:true,  asegurado:true,  agente:true  },
    "General de Salud":           { preguntaFolio:true,  asegurado:true,  agente:true  },
    "General de Salud Infonavit": { preguntaFolio:true,  asegurado:true,  agente:false }
  };

  const IMPLICACION_OPCIONES        = ["Ninguna","UNE","CONDUSEF","DEMANDA"];

  /* Medio de contacto — reincorporado 2026-08-13. Catálogo de la especificación
     funcional vigente §6.3. Reutiliza la columna Medio_Contacto existente en
     SharePoint; NO se crea CanalEntrada. Opcional para los cuatro clientes.
     Los valores históricos que no figuren aquí se conservan sin normalizar. */
  const MEDIO_CONTACTO_OPCIONES = [
    "Correo","Teléfono","WhatsApp","Teams","CRM","Portal","Comercial","Dirección","Hospital","Otro"
  ];

  const PRIORIDAD_ATENCION_OPCIONES = ["Crítica","Alta","Media","Baja"];

  const ESTATUS_INTERNO_OPCIONES    = ["Abierto","Resuelto","Cancelado"];

  const TIPO_ACTIVACION_INTERNA_OPCIONES = ["En seguimiento con área interna","Escalado","Ninguno","Otro"];

  /* Seguimiento general para Sura/GS (NO filtra el HC) */
  const SEGUIMIENTO_SGS_OPCIONES = [
    "Médico / Medical","Claims","Call Center","Account Manager","Networks","Case Management","Ninguno"
  ];

  /* ===== Contratante por cliente ===== */
  const CONTRATANTES_BANORTE = ["PJF","Cartera General","Banco","AP","Otro"];

  /* ===== Contratante homologado 2026-08-13 (D-CAT-SURA-01, D-CAT-GS-01, D-CAT-GSI-01) =====
     Para SURA, General de Salud y GS Infonavit el contratante es OBLIGATORIO y de
     TEXTO LIBRE: estas listas son SUGERENCIAS, no catálogos cerrados. El control es
     input + datalist, de modo que el usuario puede escribir un valor distinto.
     No llevan opción "Otro": el campo ya admite cualquier valor. */

  /* SURA — 8 sugerencias. "AP" se conserva exactamente así, sin expandir. */
  const CONTRATANTES_SURA = [
    "Ala Azul",
    "Ala Azul Plus",
    "Talento Seguro",
    "AP",
    "MedicMaster",
    "Talento Seguro Colectivo",
    "Póliza Colectiva",
    "Autos"
  ];

  /* General de Salud — 5 sugerencias. Sustituye el uso de CONTRATANTES_GS_RAW,
     que nunca se replicó en la capa modular (hallazgo H-2). */
  const CONTRATANTES_GS = [
    "Multisalud Individual",
    "Multisalud Colectivo",
    "Salud Vital",
    "Recupera Individual",
    "Recupera Colectivo"
  ];

  /* GS Infonavit — mismo comportamiento y mismas sugerencias que General de Salud.
     Se conserva el símbolo histórico para no romper referencias existentes. */
  const CONTRATANTES_GS_INFONAVIT = CONTRATANTES_GS;

  const ESCENARIOS_PROGRAMACION_REEMBOLSO = [
    "Cirugía",
    "Medicamentos",
    "Consultas médicas",
    "Servicios de apoyo"
  ];

  const ESCENARIOS_PAGO_DIRECTO = [
    "Altas",
    "Tiempos de espera",
    "Rechazos"
  ];

  const SUBESCENARIOS_SERVICIOS_APOYO = [
    "Óptica",
    "Quimioterapias",
    "Unidad terapia física",
    "Otros conceptos especiales",
    "Laboratorios",
    "Laboratorios / Gabinetes",
    "Gabinetes",
    "Radioterapias",
    "Hemodiálisis",
    "Central de mezclas",
    "Aparatos ortopédicos",
    "Ambulancia",
    "Enfermería",
    "Home care",
    "Prótesis de extremidades",
    "Check ups",
    "Audiología",
    "Atención oftalmológica ambulatoria"
  ];

  /* Causa raíz — homologado TAL CUAL con el cruce de campos Forms ATC (2026-08-13).
     Sustituye el catálogo anterior de 10 valores. Los folios ya clasificados con
     los valores previos NO se normalizan: la migración de datos históricos es una
     solicitud aparte que el área debe pedir expresamente. */
  /* Causa raíz (id técnico Solicitud_Relacionada) — catálogo exacto y en el
     orden aprobado por Leonardo el 2026-08-16. Sustituye íntegramente al
     catálogo anterior. No se agregan valores. Los folios ya clasificados con
     valores previos NO se normalizan ni se migran. */
  const SOLICITUD_RELACIONADA_OPCIONES = [
    "Aplicación de Condiciones",
    "Tiempos de Respuesta",
    "Corrección Administrativa",
    "Solicitud VIP",
    "Revisión Dictamen Médico",
    "Revisión de Pago",
    "Emisión",
    "Proveedor",
    "Otra"
  ];

  /* Acción correctiva — catálogo de tipos del cruce (2026-08-13). Opcional.
     "Sin acción requerida" forma parte del catálogo, no es un valor de escape. */
  const TIPO_ACCION_CORRECTIVA_OPCIONES = [
    "Capacitación",
    "Retroalimentación",
    "Cambio de proceso",
    "Actualización de procedimiento",
    "Ajuste de sistema",
    "Automatización",
    "Mesa de trabajo",
    "Escalamiento a Dirección",
    "Cambio de proveedor",
    "Seguimiento",
    "Sin acción requerida"
  ];

  const QUIEN_ACTIVA_OPCIONES = [
    "OAJ/TDJ",
    "SCN",
    "TRIFE",
    "Indemnizaciones SB",
    "Área comercial",
    "Agente/Despacho/Broker",
    "Interno / Wee",
    "Jurídico",
    "Asegurado",
    "Ninguna",
    "Otro"
  ];

  const SEGUIMIENTO_POR_TRAMITE = {
    "Programación":   ["Dictaminador", "Gerencia", "Coordinación"],
    "Reembolso":      ["Dictaminador", "Gerencia", "Coordinación"],
    "Pago directo":   ["Dictaminador", "Gerencia", "Coordinación"],
    "Siniestralidad": ["Analista Pago Reembolso", "Líder Pago Reembolso"],
    "Pagos":          ["Dictaminador", "Gerencia", "Coordinación"],
    "ATF":            ["Coordinación"],
    "Case Managment": ["Dictaminador", "Gerencia","Coordinación"],
    "AP":             ["Dictaminador", "Gerencia", "Coordinación"],
    "Redes":          ["Dictaminador", "Gerencia", "Coordinación"]
  };
