  function leerAdjuntos(){
    const input = $("Adjuntos_Files");
    const files = input && input.files ? Array.from(input.files) : [];
    return Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1] || "";  // quita el prefijo data:...;base64,
        resolve({
          NombreArchivo:   file.name,
          TipoContenido:   file.type || "application/octet-stream",
          ContenidoBase64: base64
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
  }

  async function enviar(){
    if(!validar()){
      mostrarToast("err","Faltan campos obligatorios");
      return;
    }

    if(FLOW_URL === ""){
      mostrarToast("err","Falta pegar la URL del flujo en el código");
      return;
    }

    /* Identidad del gestor: sesión autenticada, no selección manual.
       El selector queda oculto y su valor ya no participa en el payload. */
    const identGestor = identidadGestor();
    const tramite = valor("Tipo_Tramite");
    const adjuntos = await leerAdjuntos();

    const payload = {
      Folio:                    valor("Folio"),
      Fecha_Recepcion_ATC:      fechaMX(valor("Fecha_Recepcion_ATC")),
      Tipo_Tramite:             tramite,
      Tipo_Atencion:            valor("Tipo_Atencion"),

      Escenario:                valor("Escenario"),
      Subescenario:             valor("Subescenario"),
      Nombre_Escenario:         construirNombreEscenario(),

      Imputable_Gral:           valor("Imputable_Gral"),
      Resultado_Queja:          valor("Resultado_Queja"),
      Analisis_Queja:           valor("Analisis_Queja"),
      Tiene_Impacto_Economico:  valor("Tiene_Impacto_Economico"),
      Impacto_Economico:        (() => {
                                  const raw = valor("Impacto_Economico");
                                  if(raw === "") return 0;
                                  const num = parseFloat(raw);
                                  return isNaN(num) ? 0 : num;
                                })(),
    Solicitud_Relacionada:    valor("Solicitud_Relacionada"),
  Seguimiento_Con:          valor("Seguimiento_Con"),
  HC:                       valor("HC"),
  Quien_Activa:             valor("Quien_Activa"),

  Contratante:              valor("Contratante"),
  Fecha_Respuesta_Final:    fechaMX(valor("Fecha_Respuesta_Final")),

  Nombre_Dictaminador:      tramite === "Siniestralidad"
    ? valor("HC_Siniestralidad")
    : valor("Nombre_Dictaminador"),

  Tipo_Condicion:           valor("Tipo_Condicion"),
  Catalogo:                 valor("Catalogo"),

      Es_Error_Analista:        valor("Es_Error_Analista"),

      Fecha_Inicio:             fechaInicio,
      Fecha_Fin:                new Date().toISOString(),
      Correo_Gestor:             identGestor.correo,
      Nombre_Gestor:            identGestor.nombre,

      /* ===== v2: campos nuevos ===== */
      Tipo_Gestion:                 valor("Tipo_Gestion"),   /* multicliente: SIEMPRE explícito ("Banorte" incluido) */
      Tipo_Tramite_Otro:            valor("Tipo_Tramite_Otro"),

      /* Medio de contacto reincorporado (2026-08-13). Reutiliza la clave y la
         columna existentes en SharePoint; no se crea CanalEntrada. Opcional:
         viaja vacío cuando no se captura. */
      Medio_Contacto:               valor("Medio_Contacto"),

      /* TipoAccionCorrectiva RETIRADO del payload (decisión final 2026-08-16).
         Sustituye la aprobación provisional del 2026-08-14: no es una clave
         nueva, no se crea columna en SharePoint DEV ni se mapea en Power
         Automate DEV. El control permanece oculto en el HTML con su id y su
         catálogo, por si el área lo reactiva; hoy no viaja. */

      /* ===== Requerimiento (2026-08-13) — vacío cuando Tipo_Atencion ≠ "Requerimiento".
         Los folios históricos sin subtipo permanecen válidos. ===== */
      SubtipoRequerimiento:         valor("SubtipoRequerimiento"),
      SubtipoRequerimientoOtro:     valor("SubtipoRequerimientoOtro"),

      /* ===== Área responsable (D-AREA-01 / D-AREA-02, 2026-08-13) =====
         Las columnas NO existen todavía en SharePoint: verificado el 2026-08-13
         sobre la extracción de la lista productiva (56 columnas, ninguna coincide).
         Las claves viajan listas en el payload DEV; su persistencia está PENDIENTE.
         NO se envían ResponsableAreaPersona ni ResponsableAreaOid: ATC retiró el
         requisito (D-AREA-03). ResponsableAsignado no se ve afectado. */
      AreaResponsable:              valor("AreaResponsable"),
      AreaResponsableOtro:          valor("AreaResponsableOtro"),

      /* ===== Eventos operativos nuevos (2026-08-13) =====
         Las tres son ≥ Fecha_Recepcion_ATC, validado en validation.js.
         Fecha_Comunicacion_Cliente NO sustituye a Fecha_Respuesta_Final: son
         dos momentos distintos y viajan como claves separadas.
         FechaCierre queda fuera: la asigna el backend, no el formulario.
         Las columnas aún NO existen en SharePoint; persistencia PENDIENTE. */
      Fecha_Primera_Atencion_ATC:   fechaMX(valor("Fecha_Primera_Atencion_ATC")),
      Fecha_Compromiso_Respuesta:   fechaMX(valor("Fecha_Compromiso_Respuesta")),
      Fecha_Comunicacion_Cliente:   fechaMX(valor("Fecha_Comunicacion_Cliente")),

      /* ===== Multicliente v1 ===== */
      Cuenta_Con_Folio:             valor("Cuenta_Con_Folio"),
      Poliza:                       valor("Poliza"),
      Asegurado:                    valor("Asegurado"),
      Agente:                       valor("Agente"),
      Tipo_Atencion_Otro:           valor("Tipo_Atencion_Otro"),
      Solicitud_Relacionada_Otro:   valor("Solicitud_Relacionada_Otro"),
      Implicacion:                  valor("Implicacion"),
      Cargo_Persona_Implicada:      valor("Cargo_Persona_Implicada"),
      Partida_Subgrupo:             valor("Partida_Subgrupo"),
      Prioridad_Atencion:           valor("Prioridad_Atencion"),
      Quien_Activa_Otro:            valor("Quien_Activa_Otro"),
      Cuenta_Con_Pruebas:           valor("Cuenta_Con_Pruebas"),
      Tipo_Activacion_Interna:      valor("Tipo_Activacion_Interna"),
      Tipo_Activacion_Interna_Otro: valor("Tipo_Activacion_Interna_Otro"),
      Detalle_Activacion_Interna:   valor("Detalle_Activacion_Interna"),
      Cuenta_Con_Respuesta_Area_Interna: valor("Cuenta_Con_Respuesta_Area_Interna"),
      Fecha_Activacion_Area:        fechaMX(valor("Fecha_Activacion_Area")),
      Fecha_Respuesta_Area_Interna: fechaMX(valor("Fecha_Respuesta_Area_Interna")),
      Estatus_Interno:              valor("Estatus_Interno"),
      Se_Realizo_Accion_Correctiva: valor("Se_Realizo_Accion_Correctiva"),
      Accion_Correctiva_Detalle:    valor("Accion_Correctiva_Detalle"),
      Contratante_Otro:             valor("Contratante_Otro"),
      Tiene_Adjuntos:               adjuntos.length > 0 ? "Sí" : "No",
      Adjuntos:                     adjuntos
    };

    const btn = $("submitBtn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Guardando…';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try{
      const res = await fetch(FLOW_URL,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if(res.ok){
        let msgOk = "Registro guardado correctamente";
        if(!payload.Folio){
          /* Sin folio: el identificador interno es el ID de SharePoint.
             Requiere que el flujo lo devuelva en la Response (ver guía backend multicliente). */
          try{
            const j = await res.clone().json();
            const idInterno = j && (j.id ?? j.ID ?? j.Id);
            if(idInterno !== undefined && idInterno !== null && idInterno !== ""){
              msgOk = "Registro guardado. ID interno: " + idInterno;
            }
          }catch(e){ /* el flujo aún no devuelve ID */ }
        }
        mostrarToast("ok", msgOk);
        limpiar();
      }else{
        let msg = "Error al guardar (código "+res.status+")";
        try{
          const j = await res.json();
          if(j.mensaje) msg = j.mensaje;
        }catch(e){}
        mostrarToast("err", msg);
      }
    }catch(err){
      clearTimeout(timeoutId);
      /* Nunca se imprime el objeto de error completo: puede arrastrar la URL firmada. */
      console.error("Error de envío:", err?.name || "Error",
        String(err?.message || "").replace(/https?:\/\/\S+/g, "[url-omitida]"));
      if(err.name === "AbortError"){
        mostrarToast("err","Tiempo de espera agotado (20s). Revisa tu conexión e intenta de nuevo.");
      }else{
        mostrarToast("err","No se pudo conectar. Revisa la consola.");
      }
    }finally{
      btn.disabled = false;
      btn.textContent = "Guardar registro";
    }}

  function limpiar(){
    document.querySelectorAll("input,select,textarea").forEach(el=>{
      if(el.tagName==="SELECT") el.selectedIndex = 0;
      else el.value = "";
    });

    document.querySelectorAll(".invalid").forEach(e=>e.classList.remove("invalid"));

    document.querySelectorAll(".impact-option").forEach(btn=>{
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });

    document.querySelectorAll(".impact-switch").forEach(s=>s.classList.remove("invalid"));

    ultimoTramite = "";
    ultimoTramiteSeguimiento = "";
    ultimaClaveHC = "";
    ultimoTipoGestionHC = "";
    ultimoTramiteDictaminador = "";
    hcSiniestralidadCargado = false;

    inicializarCatalogosFijos();
    actualizarVisibilidad();
    actualizarContadorAnalisis();

    fechaInicio = new Date().toISOString();
  }
