  /* ===== Homologación de catálogos (2026-08-17) ==============================
     Los filtros del módulo Reportes consumen EXACTAMENTE la misma fuente que el
     Registro: `catalogos-publicos.js`. El marcado llevaba copias divergentes
     —9 de los 29 trámites y 10 de las 15 solicitudes— de modo que un mismo folio
     podía ser inencontrable según dónde se consultara.

     "Todos" encabeza cada filtro y representa AUSENCIA de filtro por ese campo,
     no un valor persistido. Ningún catálogo depende del cliente seleccionado: el
     catálogo plano es único por decisión del 2026-08-16. Aquí no se normaliza
     ninguna denominación equivalente ("Incidencias"/"Incidencia", "CAT"/"Áreas
     CAT", "Case Managment"): eso requiere decisión expresa del área. */
  const CATALOGOS_REPORTE = {
    clientes:   () => (typeof CLIENTES !== "undefined" ? CLIENTES : []),
    tramites:   () => (typeof TRAMITES_UNIFICADOS !== "undefined" ? TRAMITES_UNIFICADOS : []),
    atenciones: () => (typeof ATENCIONES_UNIFICADAS !== "undefined" ? ATENCIONES_UNIFICADAS : []),
    prioridad:  () => (typeof PRIORIDAD_ATENCION_OPCIONES !== "undefined" ? PRIORIDAD_ATENCION_OPCIONES : []),
    estatus:    () => (typeof ESTATUS_INTERNO_OPCIONES !== "undefined" ? ESTATUS_INTERNO_OPCIONES : [])
  };

  function llenarFiltroReporte(sel){
    const fuente = CATALOGOS_REPORTE[sel.getAttribute("data-cat-reporte")];
    if(!fuente) return;
    const previo = sel.value;
    sel.innerHTML = "";
    const todos = document.createElement("option");
    todos.value = "Todos";
    todos.textContent = "Todos";
    sel.appendChild(todos);
    (fuente() || []).forEach(v => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
    /* Un filtro que sigue siendo válido no se pierde al repoblar. */
    if(previo && Array.prototype.some.call(sel.options, o => o.value === previo)) sel.value = previo;
  }

  function inicializarFiltrosReporte(){
    document.querySelectorAll("#viewReportes [data-cat-reporte]").forEach(llenarFiltroReporte);
  }

  /* ===== Errores accesibles del periodo =====================================
     Reutiliza `setFieldError` de `validation.js` —no se duplica ni se modifica—
     para que el anuncio sea idéntico al del Registro: `aria-invalid`, mensaje con
     id propio y referencia por `aria-describedby`. La limpieza está ACOTADA a
     #viewReportes para no borrar el estado de validación del Registro. */
  function limpiarErroresReporte(){
    document.querySelectorAll("#viewReportes .field-error.show")
      .forEach(e => e.classList.remove("show"));
    document.querySelectorAll("#viewReportes [aria-invalid]").forEach(c => {
      c.removeAttribute("aria-invalid");
      const ids = (c.getAttribute("aria-describedby") || "").split(/\s+/)
        .filter(id => id && id.indexOf("err_") !== 0);
      if(ids.length) c.setAttribute("aria-describedby", ids.join(" "));
      else c.removeAttribute("aria-describedby");
    });
    ["Reporte_Fecha_Inicio","Reporte_Fecha_Fin"].forEach(id => {
      const el = $(id);
      if(el) el.classList.remove("invalid");
    });
  }

  function errorReporte(id, msg){
    const el = $(id);
    if(!el) return;
    el.classList.add("invalid");
    if(typeof setFieldError === "function") setFieldError(el, msg);
    else el.setAttribute("aria-invalid", "true");
  }

  /* Una generación en curso bloquea la siguiente. El `disabled` del botón por sí
     solo no basta: un doble clic muy rápido, la tecla Enter o una llamada
     programática pueden entrar antes de que el atributo se aplique. */
  let generacionEnCurso = false;

  function sesionBloqueaGeneracion(){
    if(typeof ATCAuth === "undefined" || !ATCAuth.obtenerEstado) return false;
    const E = ATCAuth.ESTADOS || {};
    const estado = ATCAuth.obtenerEstado();
    return estado === E.NO_AUTENTICADO
        || estado === E.SESION_EXPIRADA
        || estado === E.ACCESO_DENEGADO;
  }

  function generarReporteFiltrado(){
    if(generacionEnCurso) return;
    limpiarErroresReporte();

    const fechaInicio = valor("Reporte_Fecha_Inicio");
    const fechaFin    = valor("Reporte_Fecha_Fin");

    /* Periodo obligatorio y coherente. Ninguna de estas ramas envía solicitud. */
    if(!fechaInicio){
      errorReporte("Reporte_Fecha_Inicio","Selecciona la fecha de inicio.");
      mostrarToast("err","Selecciona la fecha de inicio.");
      $("Reporte_Fecha_Inicio").focus();
      return;
    }
    if(!fechaFin){
      errorReporte("Reporte_Fecha_Fin","Selecciona la fecha de fin.");
      mostrarToast("err","Selecciona la fecha de fin.");
      $("Reporte_Fecha_Fin").focus();
      return;
    }
    if(fechaInicio > fechaFin){
      errorReporte("Reporte_Fecha_Inicio","La fecha de inicio no puede ser mayor a la fecha de fin.");
      errorReporte("Reporte_Fecha_Fin","La fecha de fin debe ser igual o posterior a la de inicio.");
      mostrarToast("err","La fecha de inicio no puede ser mayor a la fecha de fin.");
      $("Reporte_Fecha_Inicio").focus();
      return;
    }

    if(sesionBloqueaGeneracion()){
      mostrarToast("err","Tu sesión no está activa. Vuelve a iniciar sesión para generar el reporte.");
      return;
    }

    /* Payload v2 (Fase 2): filtros nuevos + Tipo_Reporte (detalle/calidad/adjuntos).
       CONTRATO INTACTO: mismas claves, mismos nombres, mismo endpoint. `Campania`
       conserva su nombre técnico aunque la etiqueta visible ahora diga "Cliente":
       es la columna histórica y la propiedad que el flujo espera. */
    descargarReporteAvanzado({
      Fecha_Inicio:       fechaInicio,
      Fecha_Fin:          fechaFin,
      Tipo_Tramite:       valor("Reporte_Tipo_Tramite")  || "Todos",
      Tipo_Atencion:      valor("Reporte_Tipo_Atencion") || "Todos",
      Campania:           valor("Reporte_Campania")      || "Todos",
      Prioridad_Atencion: valor("Reporte_Prioridad")     || "Todos",
      Estatus_Interno:    valor("Reporte_Estatus_Interno") || "Todos",
      Tipo_Reporte:       valor("Reporte_Tipo")          || "detalle"
    });
  }

  async function descargarReporteAvanzado(payload){
    if(!REPORT_URL || REPORT_URL.includes("PEGA_AQUI") || REPORT_URL.includes("TU_WORKFLOW_ID")){
      mostrarToast("err","Falta configurar la URL del flujo de descarga (REPORT_URL).");
      return;
    }

    const btn = $("btnGenerarReporte");
    /* El texto vive en su propio span: sustituir `btn.textContent` borraría el
       icono Fluent junto con la etiqueta. */
    const etiqueta = btn ? btn.querySelector(".btn-label") : null;
    const textoOriginal = etiqueta ? etiqueta.textContent : "";
    generacionEnCurso = true;
    if(btn){
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.classList.add("loading");
    }
    if(etiqueta) etiqueta.textContent = "Generando…";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try{
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if(!res.ok){
        const errorText = await res.text();
        /* Nunca se imprime el cuerpo crudo: puede contener la URL firmada del flujo. */
        console.error("Respuesta del flujo:", res.status,
          String(errorText).replace(/https?:\/\/\S+/g, "[url-omitida]").slice(0, 500));
        throw new Error("HTTP " + res.status);
      }

      const blob = await res.blob();

      if(!blob || blob.size === 0){
        mostrarToast("err","El flujo respondió vacío. Revisa el flujo de descarga.");
        return;
      }

      const nombreArchivo = "reporte_" + payload.Tipo_Reporte + "_" + payload.Fecha_Inicio + "_a_" + payload.Fecha_Fin + ".csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      mostrarToast("ok","Reporte generado correctamente.");
    }catch(err){
      clearTimeout(timeoutId);
      console.error("Error al generar el reporte filtrado:", err?.name || "Error",
        String(err?.message || "").replace(/https?:\/\/\S+/g, "[url-omitida]"));
      mostrarToast("err", err.name === "AbortError"
        ? "Tiempo de espera agotado al generar el reporte."
        : "No se pudo generar el reporte. Revisa la consola.");
    }finally{
      /* El estado se restaura SIEMPRE, también cuando la operación falla: no se
         simula ninguna descarga y el botón vuelve a quedar operable. */
      generacionEnCurso = false;
      if(btn){
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
        btn.classList.remove("loading");
      }
      if(etiqueta) etiqueta.textContent = textoOriginal;
    }
  }

  async function descargarReporte(tipo){
    if(!REPORT_URL || REPORT_URL.includes("PEGA_AQUI") || REPORT_URL.includes("TU_WORKFLOW_ID")){
      mostrarToast("err","Falta configurar la URL del flujo de descarga (REPORT_URL).");
      return;
    }

    const btn = tipo === "detalle" ? $("btnReporteDetalle") : $("btnReporteCalidad");
    const dl  = btn ? btn.querySelector(".report-dl") : null;
    const textoOriginal = dl ? dl.textContent : "";

    if(dl) dl.textContent = "Generando…";
    if(btn) btn.classList.add("loading");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try{
    const res = await fetch(REPORT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tipoReporte: tipo
    }),
    signal: controller.signal
  });

      clearTimeout(timeoutId);

      if(!res.ok){
        const errorText = await res.text();
        /* Nunca se imprime el cuerpo crudo: puede contener la URL firmada del flujo. */
        console.error("Respuesta del flujo:", res.status,
          String(errorText).replace(/https?:\/\/\S+/g, "[url-omitida]").slice(0, 500));
        throw new Error("HTTP " + res.status);
      }

      const blob = await res.blob();

      if(!blob || blob.size === 0){
        mostrarToast("err","El flujo respondió vacío. Revisa Get items y Create CSV table.");
        return;
      }

      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = tipo === "detalle"
        ? "reporte_detalle_tramites_" + fecha + ".csv"
        : "reporte_calidad_seguimiento_" + fecha + ".csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = nombreArchivo;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      mostrarToast("ok","Reporte descargado correctamente.");
    }catch(err){
      clearTimeout(timeoutId);
      console.error("Error al generar el reporte:", err?.name || "Error",
        String(err?.message || "").replace(/https?:\/\/\S+/g, "[url-omitida]"));

      mostrarToast("err", err.name === "AbortError"
        ? "Tiempo de espera agotado al generar el reporte."
        : "No se pudo generar el reporte. Revisa la consola.");
    }finally{
      if(dl) dl.textContent = textoOriginal;
      if(btn) btn.classList.remove("loading");
    }
  }

  /* Los filtros se llenan en cuanto el documento está listo. El marcado de
     #viewReportes es estático (vive oculto dentro del App Shell), así que no hace
     falta esperar a que el módulo se muestre. Se limpia el estado de error al
     corregir cualquiera de las dos fechas. */
  document.addEventListener("DOMContentLoaded", () => {
    inicializarFiltrosReporte();
    ["Reporte_Fecha_Inicio","Reporte_Fecha_Fin"].forEach(id => {
      const el = $(id);
      if(el) el.addEventListener("change", () => limpiarErroresReporte());
    });
  });
