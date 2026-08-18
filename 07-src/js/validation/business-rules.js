  function seleccionarImpactoEconomico(valorSeleccionado){
    $("Tiene_Impacto_Economico").value = valorSeleccionado;

    document.querySelectorAll('[data-impact-toggle] .impact-option').forEach(btn=>{
      const isActive = btn.getAttribute("data-impact-value") === valorSeleccionado;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const switchEl = document.querySelector('[data-impact-toggle] .impact-switch');
    if(switchEl){
      switchEl.classList.remove("invalid");
    }

    actualizarVisibilidad();
  }

  function seleccionarErrorAnalista(valorSeleccionado){
    $("Es_Error_Analista").value = valorSeleccionado;

    document.querySelectorAll('[data-error-toggle] .impact-option').forEach(btn=>{
      const isActive = btn.getAttribute("data-impact-value") === valorSeleccionado;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const switchEl = document.querySelector('[data-error-toggle] .impact-switch');
    if(switchEl){
      switchEl.classList.remove("invalid");
    }

    actualizarVisibilidad();
  }

  function requiereImpactoEconomico(){
    const atencion = valor("Tipo_Atencion");
    const decision = valor("Tiene_Impacto_Economico");

    if(atencion !== "Queja" && atencion !== "Corrección"){
      return false;
    }

    switch(decision){
      case "Sí":
        return true;
      case "No":
        return false;
      default:
        return false;
    }
  }

  function actualizarVisibilidad(){
    const cliente  = valor("Tipo_Gestion");
    const atencion = valor("Tipo_Atencion");
    const tramite  = valor("Tipo_Tramite");
    const contrat  = valor("Contratante");

    const esQueja          = atencion === "Queja";
    const esCorreccion     = atencion === "Corrección";
    const esSeguimiento    = atencion === "Seguimiento";
    const esSiniestralidad = tramite === "Siniestralidad";

    /* ---- Escenario: RETIRADO DE LA INTERFAZ (HF-CRM-2026-07-30-ESCENARIO-01).
       Por decisión de la autoridad funcional, la sección Escenario y su
       subescenario dejan de mostrarse en cualquier combinación de cliente,
       atención y trámite.

       Se conserva el marcado, el payload (Escenario, Subescenario,
       Nombre_Escenario siguen viajando vacíos) y las funciones de carga, para
       no alterar el contrato con Power Automate/SharePoint ni los reportes.
       Al quedar el bloque con .hidden, la validación de data-cond-required
       no lo exige — no bloquea el envío.

       Regla anterior, por si se decide restaurarla:
         cliente === "Banorte" && esQueja &&
         (tramite === "Programación" || tramite === "Reembolso" || tramite === "Pago directo")
       ---- */
    const verEscenario = false;
    toggleBlock("escenario", verEscenario);

    if(verEscenario){
      cargarOpcionesEscenario(tramite);
      document.querySelector("[data-tramite-label]").textContent = tramite;
    }else{
      $("Escenario").value = "";
    }

    const verSub = verEscenario && valor("Escenario") === "Servicios de apoyo";
    toggleBlock("subescenario", verSub);
    if(!verSub){ $("Subescenario").value = ""; }

    /* ---- Dictaminador (Banorte) / Colaborador (Sura-GS) ----
       GS Infonavit: sin catálogo de colaborador definido → sección oculta (documentado, pendiente de catálogo) */
    const esSGS_disp = esGestionSGS();
    /* RETIRADO DE LA CAPTURA (2026-08-16, decisión de Leonardo).
       El bloque no se muestra para ningún cliente, trámite ni tipo de solicitud.
       Se conserva el marcado, el id, la clave de payload y el catálogo, que
       siguen alimentando histórico, reportes y descargas.

       Regla anterior, por si se decide restaurarla:
         esSGS_disp ? (esQueja || esCorreccion || esSeguimiento)
                    : (cliente === "Banorte" && (esQueja || esCorreccion) && !esSiniestralidad)

       HC_Siniestralidad NO se ve afectado: es el analista responsable de un
       error de siniestralidad, un concepto distinto del dictaminador. */
    const verDictaminador = false;
    toggleBlock("dictaminador", verDictaminador);

    // Reetiquetar según campaña
    if(esSGS_disp){
      $("dictaminadorTitulo").textContent = "Colaborador";
      $("dictaminadorLabel").textContent  = "Nombre de colaborador";
      $("dictaminadorHint").textContent   = "Colaborador de la campaña (General de Salud / Sura).";
    }else{
      $("dictaminadorTitulo").textContent = "Dictaminador";
      $("dictaminadorLabel").textContent  = "Nombre dictaminador";
      $("dictaminadorHint").textContent   = "Lista filtrada según el tipo de trámite seleccionado.";
    }

    if(verDictaminador){
      cargarDictaminadoresPorTramite();
    }else{
      $("Nombre_Dictaminador").value = "";
      llenarSelect("Nombre_Dictaminador", [], "Selecciona…");
      ultimoTramiteDictaminador = "";
    }

    /* ---- Siniestralidad: Queja/Corrección con trámite Siniestralidad ---- */
    const verSiniestralidad = (esQueja || esCorreccion) && esSiniestralidad;
    toggleBlock("siniestralidad", verSiniestralidad);

    if(verSiniestralidad){
      cargarHCSiniestralidad();
      const esError = valor("Es_Error_Analista");
      toggleBlock("hc_siniestralidad", esError === "Sí");
      if(esError !== "Sí"){
        $("HC_Siniestralidad").value = "";
      }
    }else{
      $("Es_Error_Analista").value = "";
      $("HC_Siniestralidad").value = "";
      toggleBlock("hc_siniestralidad", false);
      document.querySelectorAll('[data-error-toggle] .impact-option').forEach(btn=>{
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      });
      const errSwitch = document.querySelector('[data-error-toggle] .impact-switch');
      if(errSwitch) errSwitch.classList.remove("invalid");
    }

    /* ---- Tipo de condición: RETIRADO del flujo de Corrección (2026-08-16).
       Se conservan id, clave, columna e histórico; viaja vacío. ---- */
    toggleBlock("correccion", false);
    $("Tipo_Condicion").value = "";

    /* ---- Detalle (mismo bloque reutilizado para Queja y Corrección) ---- */
    const verDetalle = esQueja || esCorreccion;
    toggleBlock("queja", verDetalle);

    if(esCorreccion){
      $("detalleTitulo").textContent  = "Detalle de la corrección";
      $("analisisLabel").textContent  = "Análisis de la corrección";
      $("Analisis_Queja").placeholder = "Describe la corrección realizada…";
    }else{
      $("detalleTitulo").textContent  = "Detalle de la queja";
      $("analisisLabel").textContent  = "Análisis de la queja";
      $("Analisis_Queja").placeholder = "Describe el análisis del caso…";
    }

    /* ---- Imputable y Resultado: EXCLUSIVOS de Queja (2026-08-16) ---- */
    toggleBlock("queja_imputable", esQueja);
    toggleBlock("queja_resultado", esQueja);
    if(!esQueja){
      $("Imputable_Gral").value = "";
      $("Resultado_Queja").value = "";
    }

    if(!verDetalle){
      $("Imputable_Gral").value = "";
      $("Resultado_Queja").value = "";
      $("Analisis_Queja").value = "";
      $("Tiene_Impacto_Economico").value = "";
      $("Impacto_Economico").value = "";
      document.querySelectorAll('[data-impact-toggle] .impact-option').forEach(btn=>{
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      });
      const impactSwitch = document.querySelector('[data-impact-toggle] .impact-switch');
      if(impactSwitch){ impactSwitch.classList.remove("invalid"); }
      actualizarContadorAnalisis();
    }

    /* ---- Impacto económico ($) ---- */
    const verImpactoEconomico = requiereImpactoEconomico();
    toggleBlock("impacto_economico", verImpactoEconomico);
    if(!verImpactoEconomico){ $("Impacto_Economico").value = ""; }

    /* ---- Clasificación (Seguimiento, Queja y Corrección; también Sura/GS) ---- */
    const sgs = esGestionSGS();
    const verClasificacion  = esSeguimiento || esQueja || esCorreccion || sgs;
    /* RETIRADOS DE LA CAPTURA (2026-08-16, decisión de Leonardo).
       "Seguimiento con" deja de mostrarse para todos los clientes, trámites y
       tipos de solicitud, y con él el selector de persona `hc`, que dependía
       funcionalmente de él: no queda un selector de persona huérfano.

       Se conservan marcado, ids, claves de payload, columnas y catálogos, que
       siguen alimentando histórico, reportes y descargas. Los catálogos de
       personas (HC) ya NO se cargan en el cliente: además de evitar el hueco
       visual, deja de copiarse un catálogo de personas al DOM público.

       Regla anterior (HF-CRM-2026-07-30-SEG-QUEJA-01), por si se restaura:
         verSeguimientoCon = esSeguimiento || esCorreccion || esQueja || sgs
         y, en Banorte, HC se mostraba con Seguimiento_Con != "" y opciones. */
    const verSeguimientoCon = false;
    toggleBlock("clasificacion", verClasificacion);
    toggleBlock("seguimiento_con", verSeguimientoCon);
    toggleBlock("hc", false);
    $("Seguimiento_Con").value = "";
    $("HC").value = "";
    ultimoTramiteSeguimiento = "";
    ultimaClaveHC = "";

    if(verClasificacion){
      $("clasificacionTitulo").textContent = "Clasificación y seguimiento";
    }else{
      $("Solicitud_Relacionada").value = "";
      $("Quien_Activa").value = "";
    }

    /* ---- Contratante / Catálogo ---- */
    toggleBlock("contratante", atencion !== "");
    toggleBlock("catalogo", contrat === "Cartera General");
    if(contrat !== "Cartera General"){ $("Catalogo").value = ""; }

    /* ================= v2: campos nuevos ================= */

    /* ---- Cliente (siempre visible y obligatorio) + catálogos por cliente ---- */
    toggleBlock("tipo_gestion", true);
    cargarTipoTramite();
    cargarTipoAtencion();
    const verTramiteOtro = valor("Tipo_Tramite") === "Otro";
    toggleBlock("tipo_tramite_otro", verTramiteOtro);
    if(!verTramiteOtro){ $("Tipo_Tramite_Otro").value = ""; }
    const verAtencionOtro = valor("Tipo_Atencion") === "Otro";
    toggleBlock("tipo_atencion_otro", verAtencionOtro);
    if(!verAtencionOtro){ $("Tipo_Atencion_Otro").value = ""; }

    /* ---- Requerimiento: subtipo obligatorio + detalle si el subtipo es "Otros" ----
       Decisión del área ratificada por Leonardo el 2026-08-13.
       Limpieza ENCADENADA: al dejar de ser Requerimiento se limpian AMBOS campos,
       no solo el primero. Pruebas REQ-01 a REQ-06. */
    const esRequerimiento = valor("Tipo_Atencion") === "Requerimiento";
    toggleBlock("subtipo_requerimiento", esRequerimiento);
    if(esRequerimiento){
      cargarSubtipoRequerimiento();
    }else{
      $("SubtipoRequerimiento").value = "";
    }
    const verSubtipoOtro = esRequerimiento && valor("SubtipoRequerimiento") === "Otros";
    toggleBlock("subtipo_requerimiento_otro", verSubtipoOtro);
    if(!verSubtipoOtro){ $("SubtipoRequerimientoOtro").value = ""; }

    /* ---- Área responsable: visible y obligatoria en los 4 clientes (D-AREA-01) ----
       "Otro" abre un detalle obligatorio (D-AREA-02). NO hay selector de personas:
       ATC retiró Responsable del área del alcance (D-AREA-03). Pruebas AR-01 a AR-09. */
    cargarAreaResponsable();
    const verAreaOtro = valor("AreaResponsable") === "Otro";
    toggleBlock("area_responsable_otro", verAreaOtro);
    if(!verAreaOtro){ $("AreaResponsableOtro").value = ""; }

    /* ---- Folio / ¿Cuenta con folio? por cliente ---- */
    const cfgCliente = CLIENT_CONFIG[cliente] || null;
    const verPreguntaFolio = !!(cfgCliente && cfgCliente.preguntaFolio);
    toggleBlock("cuenta_con_folio", verPreguntaFolio);
    if(!verPreguntaFolio){ $("Cuenta_Con_Folio").value = ""; }
    // Banorte: Folio siempre visible y obligatorio · Sura/GS/GS Infonavit: solo si ¿Cuenta con folio? = Sí
    const verFolio = cliente === "Banorte" || (verPreguntaFolio && valor("Cuenta_Con_Folio") === "Sí");
    toggleBlock("folio", verFolio);
    if(!verFolio){ $("Folio").value = ""; }   // sin folio: el ID de SharePoint es el identificador interno

    /* ---- Asegurado / Agente por cliente ---- */
    const verAsegurado = !!(cfgCliente && cfgCliente.asegurado);
    toggleBlock("asegurado", verAsegurado);
    if(!verAsegurado){ $("Asegurado").value = ""; }
    const verAgente = !!(cfgCliente && cfgCliente.agente);
    toggleBlock("agente", verAgente);
    if(!verAgente){ $("Agente").value = ""; }

    /* ---- Contratante dinámico (Banorte catálogo / GS buscable / Sura libre) ---- */
    cargarContratantes();
    const contratanteNorm = normalizarClaveCatalogo(valor("Contratante"));
    const verContratanteOtro = (atencion !== "") && contratanteNorm === "OTRO";
    toggleBlock("contratante_otro", verContratanteOtro);
    if(!verContratanteOtro){ $("Contratante_Otro").value = ""; }

    /* ---- Implicación: SÓLO CORRECCIÓN DE BANORTE (rectificación 2026-08-16) ----
       Requiere AMBAS condiciones. No aparece en una Queja de Banorte, ni en un
       Requerimiento de Banorte, ni en una Corrección de Sura, General de Salud
       o GS Infonavit. No depende de Solicitud VIP ni de Solicitud_Relacionada.
       Al dejar de cumplirse se limpian la implicación y sus dos detalles en la
       captura actual; los registros históricos no se ven afectados. */
    const verImplicacion = esCorreccion && cliente === "Banorte";
    toggleBlock("implicacion", verImplicacion);
    if(!verImplicacion){ $("Implicacion").value = ""; }

    const imp = valor("Implicacion");
    const verImplicacionDet = verImplicacion && imp !== "" && imp !== "Ninguna";
    toggleBlock("implicacion_detalle", verImplicacionDet);
    if(!verImplicacionDet){
      $("Cargo_Persona_Implicada").value = "";
      $("Partida_Subgrupo").value = "";
    }

    /* ---- Solicitud relacionada = Otra ---- */
    const verSolOtro = verClasificacion && valor("Solicitud_Relacionada") === "Otra";
    toggleBlock("solicitud_relacionada_otro", verSolOtro);
    if(!verSolOtro){ $("Solicitud_Relacionada_Otro").value = ""; }

    /* ---- Quién activa = Otro / Interno-Wee ---- */
    const qa = valor("Quien_Activa");
    const verQAOtro = verClasificacion && qa === "Otro";
    toggleBlock("quien_activa_otro", verQAOtro);
    if(!verQAOtro){ $("Quien_Activa_Otro").value = ""; }

    const verActInterna = verClasificacion && qa === "Interno / Wee";
    toggleBlock("activacion_interna", verActInterna);
    if(verActInterna){
      const verTaiOtro = valor("Tipo_Activacion_Interna") === "Otro";
      toggleBlock("activacion_interna_otro", verTaiOtro);
      if(!verTaiOtro){ $("Tipo_Activacion_Interna_Otro").value = ""; }
    }else{
      $("Tipo_Activacion_Interna").value = "";
      $("Tipo_Activacion_Interna_Otro").value = "";
      $("Detalle_Activacion_Interna").value = "";
      toggleBlock("activacion_interna_otro", false);
    }

    /* ---- Fecha_Activacion_Area y Cuenta_Con_Respuesta_Area_Interna son datos generales:
       siempre visibles, no dependen de Quien_Activa, no se limpian aquí. ----
       Fecha_Respuesta_Area_Interna depende únicamente de Cuenta_Con_Respuesta_Area_Interna. ---- */
    /* La fecha se muestra y se exige SOLO con respuesta "Sí" (2026-08-16).
       Con "No" —o con la pregunta sin responder— se oculta, se limpia y deja
       de ser exigible. La visibilidad se recalcula en el mismo evento. */
    const tieneRespuestaArea = valor("Cuenta_Con_Respuesta_Area_Interna") === "Sí";
    toggleBlock("fecha_respuesta_area", tieneRespuestaArea);
    if(!tieneRespuestaArea){ $("Fecha_Respuesta_Area_Interna").value = ""; }

    /* ---- Acción correctiva: EXCLUSIVA DEL FLUJO DE CORRECCIÓN (2026-08-16) ----
       Rectificación de la autoridad funcional: deja de ser un campo general.
       La tarjeta aparece únicamente con Tipo_Atencion = "Corrección"; en Queja,
       Requerimiento, Oficio y cualquier otra solicitud no se muestra.

       "Aplica" abre el ANÁLISIS DE LA CORRECCIÓN, que es Analisis_Queja
       reetiquetado — no un control nuevo. "No aplica" lo oculta y lo limpia.

       Tipo de acción correctiva y Detalle de la acción correctiva quedan FUERA
       del flujo rectificado: conservan id, clave y columna, y viajan vacíos. */
    toggleBlock("accion_correctiva", esCorreccion);
    if(!esCorreccion){ $("Se_Realizo_Accion_Correctiva").value = ""; }

    const aplicaCorrectiva = esCorreccion && valor("Se_Realizo_Accion_Correctiva") === "Aplica";

    /* Retirados del modelo nuevo: conservan id, clave y columna, viajan vacíos. */
    toggleBlock("accion_correctiva_tipo", false);
    $("TipoAccionCorrectiva").value = "";
    toggleBlock("accion_correctiva_detalle", false);
    $("Accion_Correctiva_Detalle").value = "";

    /* Análisis: siempre en Queja; en Corrección sólo cuando la acción aplica.
       Vive en el mismo subbloque que la pregunta y SIEMPRE debajo de ella. */
    const verAnalisis = esQueja || aplicaCorrectiva;
    toggleBlock("analisis", verAnalisis);
    if(!verAnalisis){
      $("Analisis_Queja").value = "";
      actualizarContadorAnalisis();
    }

    /* El subbloque se muestra si tiene algo que enseñar; su encabezado se
       reetiqueta para no quedar huérfano cuando sólo contiene el análisis. */
    toggleBlock("analisis_card", esCorreccion || verAnalisis);
    $("acTitulo").textContent = esCorreccion ? "Acción correctiva" : "Análisis de la queja";

    /* ---- Adjuntar evidencia: DESACOPLADO de "¿Cuenta con pruebas?" ----
       El control permanece siempre disponible y su valor no se limpia por la
       respuesta de Cuenta_Con_Pruebas, que se conserva como dato independiente.
       La regla definitiva de obligatoriedad (D-EVID-01) queda pendiente. */
    toggleBlock("adjuntos", true);

    actualizarProgreso();
  }

  function toggleBlock(name, show){
    document.querySelectorAll('[data-block="'+name+'"]').forEach(el=>{
      el.classList.toggle("hidden", !show);
    });
  }
