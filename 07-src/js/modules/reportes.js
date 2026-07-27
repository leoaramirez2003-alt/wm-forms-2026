  function generarReporteFiltrado(){
    const fechaInicio = valor("Reporte_Fecha_Inicio");
    const fechaFin    = valor("Reporte_Fecha_Fin");

    $("Reporte_Fecha_Inicio").classList.remove("invalid");
    $("Reporte_Fecha_Fin").classList.remove("invalid");

    if(!fechaInicio){
      $("Reporte_Fecha_Inicio").classList.add("invalid");
      mostrarToast("err","Selecciona la fecha de inicio.");
      return;
    }
    if(!fechaFin){
      $("Reporte_Fecha_Fin").classList.add("invalid");
      mostrarToast("err","Selecciona la fecha de fin.");
      return;
    }
    if(fechaInicio > fechaFin){
      $("Reporte_Fecha_Inicio").classList.add("invalid");
      $("Reporte_Fecha_Fin").classList.add("invalid");
      mostrarToast("err","La fecha de inicio no puede ser mayor a la fecha de fin.");
      return;
    }

    /* Payload v2 (Fase 2): filtros nuevos + Tipo_Reporte (detalle/calidad/adjuntos) */
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
    const textoOriginal = btn ? btn.textContent : "";
    if(btn){ btn.disabled = true; btn.textContent = "Generando…"; }

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
        console.error("Respuesta del flujo:", res.status, errorText);
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
      console.error("Error al generar el reporte filtrado:", err);
      mostrarToast("err", err.name === "AbortError"
        ? "Tiempo de espera agotado al generar el reporte."
        : "No se pudo generar el reporte. Revisa la consola.");
    }finally{
      if(btn){ btn.disabled = false; btn.textContent = textoOriginal; }
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
      console.log("REPORT_URL:", REPORT_URL);
      console.log("tipoReporte:", tipo);

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
        console.error("Respuesta del flujo:", res.status, errorText);
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
      console.error("Error al generar el reporte:", err);

      mostrarToast("err", err.name === "AbortError"
        ? "Tiempo de espera agotado al generar el reporte."
        : "No se pudo generar el reporte. Revisa la consola.");
    }finally{
      if(dl) dl.textContent = textoOriginal;
      if(btn) btn.classList.remove("loading");
    }
  }
