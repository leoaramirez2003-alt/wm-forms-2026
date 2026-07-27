  const CLIENTES = ["Banorte","Sura","General de Salud","General de Salud Infonavit"];

  /* Catálogos de Tipo de trámite por cliente */
  const TRAMITES_BANORTE = [
    "Programación","Reembolso","Pago directo","Siniestralidad",
    "Pagos","ATF","Case Managment","AP","Redes","Otro"
  ];

  const TRAMITES_POR_CLIENTE = {
    "Banorte": TRAMITES_BANORTE,
    "Sura": ["Hospitalización","Reporte Hospitalario","Otro"],
    "General de Salud": ["Revisión con Agente","Programación","Reembolso","Urgencias","Actualización de Carta","Hospitalización","Otro"],
    "General de Salud Infonavit": ["Envío a Domicilio","Alcance y/o Cobertura","Corrección de datos","Cita Médica","Estado de Cuenta","Áreas CAT","Servicio del Proveedor","Transcripción","Aclaraciones","Otro"]
  };

  /* Catálogos de Tipo de atención por cliente (Banorte = catálogo productivo + Otro) */
  const ATENCIONES_POR_CLIENTE = {
    "Banorte": ["Queja","Asesoría","Corrección","Seguimiento","Reconsideración","Jurídico","Licitación","Reinstalación","Programación","Reembolso","Oficio","Otro"],
    "Sura": ["Queja","Otro"],
    "General de Salud": ["Incidencia","Queja","Otro"],
    "General de Salud Infonavit": ["Queja","Otro"]
  };

  /* Configuración declarativa por cliente */
  const CLIENT_CONFIG = {
    "Banorte":                    { preguntaFolio:false, asegurado:false, agente:false },
    "Sura":                       { preguntaFolio:true,  asegurado:true,  agente:true  },
    "General de Salud":           { preguntaFolio:true,  asegurado:true,  agente:true  },
    "General de Salud Infonavit": { preguntaFolio:true,  asegurado:true,  agente:false }
  };

  const IMPLICACION_OPCIONES        = ["Ninguna","UNE","CONDUSEF","DEMANDA"];

  const PRIORIDAD_ATENCION_OPCIONES = ["Crítica","Alta","Media","Baja"];

  const ESTATUS_INTERNO_OPCIONES    = ["Abierto","Resuelto","Cancelado"];

  const TIPO_ACTIVACION_INTERNA_OPCIONES = ["En seguimiento con área interna","Escalado","Ninguno","Otro"];

  /* Seguimiento general para Sura/GS (NO filtra el HC) */
  const SEGUIMIENTO_SGS_OPCIONES = [
    "Médico / Medical","Claims","Call Center","Account Manager","Networks","Case Management","Ninguno"
  ];

  /* ===== Contratante por cliente ===== */
  const CONTRATANTES_BANORTE = ["PJF","Cartera General","Banco","AP","Otro"];

  /* Catálogo propio GS Infonavit (contratante único del catálogo actual; NO se bloquea el campo, incluye "Otro") */
  const CONTRATANTES_GS_INFONAVIT = ["INFONAVIT","Otro"];

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

  const SOLICITUD_RELACIONADA_OPCIONES = [
    "Aplicación condiciones",
    "Tiempo respuesta",
    "Corrección administrativa (Nombre, edad, proveedor)",
    "Solicitud VIP",
    "Revisión dictamen médico",
    "Revisión pagos",
    "Reinstalación",
    "Emisión",
    "Revisión y pago directo",
    "Otra"
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
