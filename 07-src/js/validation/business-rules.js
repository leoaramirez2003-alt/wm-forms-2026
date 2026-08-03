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
    // Banorte: Queja/Corrección salvo Siniestralidad · Sura/GS: en Queja/Corrección/Seguimiento
    const verDictaminador = esSGS_disp
      ? (esQueja || esCorreccion || esSeguimiento)
      : (cliente === "Banorte" && (esQueja || esCorreccion) && !esSiniestralidad);
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

    /* ---- Tipo de condición: SOLO Corrección ---- */
    toggleBlock("correccion", esCorreccion);
    if(!esCorreccion){ $("Tipo_Condicion").value = ""; }

    /* ---- Detalle (mismo bloque reutilizado para Queja y Corrección) ---- */
    const verDetalle = esQueja || esCorreccion;
    toggleBlock("queja", verDetalle);

    if(esCorreccion){
      $("detalleTitulo").textContent  = "Detalle de la corrección";
      $("analisisLabel").textContent  = "Análisis de la corrección";
      $("Analisis_Queja").placeholder = "Describe el análisis de la corrección…";
    }else{
      $("detalleTitulo").textContent  = "Detalle de la queja";
      $("analisisLabel").textContent  = "Análisis de la queja";
      $("Analisis_Queja").placeholder = "Describe el análisis del caso…";
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
    /* HF-CRM-2026-07-30-SEG-QUEJA-01: "Seguimiento con" y "HC / persona de seguimiento"
       se muestran en las tres atenciones — Queja, Seguimiento y Corrección — por
       decisión de la autoridad funcional. Antes Queja quedaba excluida. */
    const verSeguimientoCon = esSeguimiento || esCorreccion || esQueja || sgs;
    toggleBlock("clasificacion", verClasificacion);
    toggleBlock("seguimiento_con", verSeguimientoCon);

    if(verClasificacion){
      /* El título deja de alternar: la sección ahora contiene campos de
         seguimiento también en Queja (HF-CRM-2026-07-30-SEG-QUEJA-01). */
      $("clasificacionTitulo").textContent = "Clasificación y seguimiento";

      if(sgs){
        /* Sura/GS: seguimiento general (no filtra). El colaborador se captura en la
           sección "Colaborador" (Nombre_Dictaminador), no en HC → se oculta HC aquí. */
        if(ultimoTramiteSeguimiento !== "SGS"){
          llenarSelect("Seguimiento_Con", SEGUIMIENTO_SGS_OPCIONES, "Selecciona seguimiento…");
          ultimoTramiteSeguimiento = "SGS";
        }
        $("HC").value = "";
        toggleBlock("hc", false);
        ultimaClaveHC = "";        // fuerza recarga de Banorte al volver
      }else{
        /* Banorte — Queja, Seguimiento y Corrección: cargan "Seguimiento con" y
           HC filtrados por trámite. La rama previa "Queja: sin Seguimiento con ni
           HC" se retiró por quedar inalcanzable tras HF-CRM-2026-07-30-SEG-QUEJA-01
           (verSeguimientoCon pasó a cubrir las tres atenciones). */
        ultimoTipoGestionHC = "";  // fuerza recarga de SGS al volver
        cargarOpcionesSeguimiento(tramite);
        cargarOpcionesHC();
        const verHC = valor("Seguimiento_Con") !== "" && hayOpcionesHC();
        toggleBlock("hc", verHC);
        if(!verHC){ $("HC").value = ""; }
      }
    }else{
      $("Solicitud_Relacionada").value = "";
      $("Seguimiento_Con").value = "";
      $("HC").value = "";
      $("Quien_Activa").value = "";
      toggleBlock("hc", false);
      ultimoTramiteSeguimiento = "";
      ultimaClaveHC = "";
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

    /* ---- Implicación: solo si Solicitud relacionada = "Solicitud VIP" ---- */
    const esSolicitudVIP = valor("Solicitud_Relacionada") === "Solicitud VIP";
    toggleBlock("implicacion", esSolicitudVIP);
    if(!esSolicitudVIP){
      $("Implicacion").value = "";
      $("Cargo_Persona_Implicada").value = "";
      $("Partida_Subgrupo").value = "";
      toggleBlock("implicacion_detalle", false);
    }else{
      const imp = valor("Implicacion");
      const verImplicacionDet = (imp === "UNE" || imp === "CONDUSEF" || imp === "DEMANDA");
      toggleBlock("implicacion_detalle", verImplicacionDet);
      if(!verImplicacionDet){
        $("Cargo_Persona_Implicada").value = "";
        $("Partida_Subgrupo").value = "";
      }
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
    const tieneRespuestaArea = valor("Cuenta_Con_Respuesta_Area_Interna") === "Sí";
    if(!tieneRespuestaArea){ $("Fecha_Respuesta_Area_Interna").value = ""; }

    /* ---- Acción correctiva (Corrección o Resultado = Procede) ---- */
    const verAccionCorr = esCorreccion || valor("Resultado_Queja") === "Procede";
    toggleBlock("accion_correctiva", verAccionCorr);
    if(verAccionCorr){
      const verAccDet = valor("Se_Realizo_Accion_Correctiva") === "Aplica";
      toggleBlock("accion_correctiva_detalle", verAccDet);
      if(!verAccDet){ $("Accion_Correctiva_Detalle").value = ""; }
    }else{
      $("Se_Realizo_Accion_Correctiva").value = "";
      $("Accion_Correctiva_Detalle").value = "";
      toggleBlock("accion_correctiva_detalle", false);
    }

    /* ---- Adjuntos (si Cuenta con pruebas = Sí) ---- */
    const verAdjuntos = valor("Cuenta_Con_Pruebas") === "Sí";
    toggleBlock("adjuntos", verAdjuntos);
    if(!verAdjuntos){ const af = $("Adjuntos_Files"); if(af) af.value = ""; }

    actualizarProgreso();
  }

  function toggleBlock(name, show){
    document.querySelectorAll('[data-block="'+name+'"]').forEach(el=>{
      el.classList.toggle("hidden", !show);
    });
  }
