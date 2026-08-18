  function validar(){
    const honeypot = document.getElementById("website_url");
    if(honeypot && honeypot.value.trim() !== ""){
      console.warn("Honeypot activado — posible bot detectado.");
      return false; // Bloquea el envío sin avisarle al bot que lo detectamos.
    }

    let ok = true;
    let primerError = null;
    document.querySelectorAll(".invalid").forEach(e=>e.classList.remove("invalid"));
    clearFieldErrors();

    document.querySelectorAll(".impact-switch").forEach(s=>s.classList.remove("invalid"));

  document.querySelectorAll("[data-required]").forEach(el=>{
    el.value = el.value.trim();
    if(!el.value.trim()){
      el.classList.add("invalid");
      setFieldError(el, "Este campo es obligatorio");
      ok = false;
      if(!primerError) primerError = el;
    }
  });
    document.querySelectorAll("[data-cond-required]").forEach(el=>{
      const bloque = el.getAttribute("data-cond-required");
      const seccionVisible = document.querySelector('[data-block="'+bloque+'"]:not(.hidden)');
      const contenedorCampo = el.closest(".field");
      const campoVisible = contenedorCampo ? contenedorCampo.offsetParent !== null : el.offsetParent !== null;

      if(seccionVisible && campoVisible && !el.value.trim()){
        el.classList.add("invalid");
        setFieldError(el, "Este campo es obligatorio");

        let switchAsociado = null;
        if(el.id === "Tiene_Impacto_Economico"){
          switchAsociado = document.querySelector('[data-impact-toggle] .impact-switch');
        }else if(el.id === "Es_Error_Analista"){
          switchAsociado = document.querySelector('[data-error-toggle] .impact-switch');
        }

        if(switchAsociado){
          switchAsociado.classList.add("invalid");
        }

        ok = false;

        if(!primerError){
          primerError = switchAsociado || el;
        }
      }
    });
  // Validación específica: Impacto_Economico debe ser número > 0 si Tiene_Impacto = "Sí"
    if(valor("Tiene_Impacto_Economico") === "Sí"){
      const inputImpacto = $("Impacto_Economico");
      const rawImpacto = inputImpacto.value.trim();
      const montoImpacto = parseFloat(rawImpacto);

      if(rawImpacto !== "" && (isNaN(montoImpacto) || montoImpacto <= 0)){
        inputImpacto.classList.add("invalid");
        setFieldError(inputImpacto, "Ingresa un monto mayor a 0");
        ok = false;
        if(!primerError) primerError = inputImpacto;
      }
    }

    /* Validación: si ya se cuenta con respuesta del área interna, la fecha de respuesta es obligatoria */
    if(valor("Cuenta_Con_Respuesta_Area_Interna") === "Sí"){
      const inputFechaResp = $("Fecha_Respuesta_Area_Interna");
      if(inputFechaResp && !inputFechaResp.value.trim()){
        inputFechaResp.classList.add("invalid");
        setFieldError(inputFechaResp, "Este campo es obligatorio");
        ok = false;
        if(!primerError) primerError = inputFechaResp;
      }
    }

    /* ---- Orden cronológico de los eventos operativos (2026-08-13) ----
       Las tres fechas nuevas no pueden ser anteriores a la recepción. Se comparan
       como marcas de tiempo locales del control `datetime-local`; una recepción
       vacía no dispara la regla, porque su propia obligatoriedad ya la cubre.
       Fecha_Comunicacion_Cliente es un campo distinto de Fecha_Respuesta_Final. */
    const recepcionCruda = valor("Fecha_Recepcion_ATC");
    if(recepcionCruda !== ""){
      const tRecepcion = Date.parse(recepcionCruda);
      [
        ["Fecha_Primera_Atencion_ATC", "La primera atención no puede ser anterior a la recepción"],
        ["Fecha_Compromiso_Respuesta", "El compromiso no puede ser anterior a la recepción"],
        ["Fecha_Comunicacion_Cliente", "La comunicación al cliente no puede ser anterior a la recepción"]
      ].forEach(par => {
        const campo = $(par[0]);
        if(!campo) return;
        const crudo = campo.value.trim();
        if(crudo === "") return;
        const t = Date.parse(crudo);
        if(isNaN(t) || isNaN(tRecepcion)) return;
        if(t < tRecepcion){
          campo.classList.add("invalid");
          setFieldError(campo, par[1]);
          ok = false;
          if(!primerError) primerError = campo;
        }
      });
    }

    /* Adjuntar evidencia quedó DESACOPLADO de "¿Cuenta con pruebas?" (2026-08-13):
       responder Sí ya no exige archivo por sí solo. La regla definitiva
       (D-EVID-01: obligatoria si el estatus es Cerrado o hay fecha de respuesta
       final) está aprobada pero NO se implementa en esta misión. */

    /* Respuesta del área: la fecha no puede ser anterior a la activación. */
    const activacionCruda = valor("Fecha_Activacion_Area");
    const respuestaCruda  = valor("Fecha_Respuesta_Area_Interna");
    if(activacionCruda !== "" && respuestaCruda !== ""){
      const tAct = Date.parse(activacionCruda);
      const tRes = Date.parse(respuestaCruda);
      if(!isNaN(tAct) && !isNaN(tRes) && tRes < tAct){
        const campoRes = $("Fecha_Respuesta_Area_Interna");
        campoRes.classList.add("invalid");
        setFieldError(campoRes, "La respuesta del área no puede ser anterior a la activación");
        ok = false;
        if(!primerError) primerError = campoRes;
      }
    }

    /* Comunicación al cliente: además de ser posterior a la recepción, no puede
       ser anterior a la resolución operativa cuando ambas existen. Son campos
       distintos: la comunicación no sustituye a Fecha_Respuesta_Final. */
    const finalCruda = valor("Fecha_Respuesta_Final");
    const comuCruda  = valor("Fecha_Comunicacion_Cliente");
    if(finalCruda !== "" && comuCruda !== ""){
      const tFin = Date.parse(finalCruda);
      const tCom = Date.parse(comuCruda);
      if(!isNaN(tFin) && !isNaN(tCom) && tCom < tFin){
        const campoCom = $("Fecha_Comunicacion_Cliente");
        campoCom.classList.add("invalid");
        setFieldError(campoCom, "La comunicación al cliente no puede ser anterior a la respuesta final");
        ok = false;
        if(!primerError) primerError = campoCom;
      }
    }

    if(primerError){
      primerError.scrollIntoView({behavior:"smooth", block:"center"});

      if(typeof primerError.focus === "function"){
        primerError.focus({preventScroll:true});
      }
    }

    return ok;
  }

  /* ===== Errores accesibles (2026-08-16) =====================================
     El estado visual `.invalid` se conserva tal cual; se le añade la capa
     semántica que faltaba: `aria-invalid`, un mensaje con id único y la
     referencia desde el control mediante `aria-describedby`.

     El hint NO se sustituye: si el campo ya describe algo, el error se AÑADE a
     la lista de ids. Al limpiar se retira solo el id del error y el hint
     permanece. Los dos grupos de botones excluyentes no marcan su input oculto
     —un lector de pantalla no lo alcanza—: marcan el grupo visible. */

  function contenedorAccesible(el){
    /* Los toggles guardan el valor en un input oculto; quien recibe el foco y
       el anuncio es el grupo de botones, no el input. */
    if(el.id === "Tiene_Impacto_Economico"){
      return document.querySelector('[data-impact-toggle] .impact-switch') || el;
    }
    if(el.id === "Es_Error_Analista"){
      return document.querySelector('[data-error-toggle] .impact-switch') || el;
    }
    return el;
  }

  function idsDescritos(el){
    return (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  }

  function setFieldError(el, msg){
    const field = el.closest(".field") || el.closest("fieldset");
    if(!field) return;
    let err = field.querySelector(".field-error");
    if(!err){
      err = document.createElement("span");
      err.className = "field-error";
      field.appendChild(err);
    }
    /* Id estable y único: permite referenciarlo y volver a encontrarlo. */
    if(!err.id) err.id = "err_" + (el.id || Math.random().toString(36).slice(2));
    err.textContent = msg;
    err.classList.add("show");
    /* El mensaje se anuncia al aparecer sin robar el foco. */
    if(!err.getAttribute("role")) err.setAttribute("role", "status");

    const destino = contenedorAccesible(el);
    destino.setAttribute("aria-invalid", "true");
    const ids = idsDescritos(destino);
    if(ids.indexOf(err.id) === -1) ids.push(err.id);
    destino.setAttribute("aria-describedby", ids.join(" "));
  }

  /* La limpieza es GLOBAL, no por contenedor: recorre todo lo marcado y todo lo
     que referencie un id `err_`. Condicionarla a que exista un `.field-error`
     visible dejaba estados `aria-invalid` colgados cuando el mensaje se ocultaba
     por otra vía —un bloque que se esconde, una sección que cambia—. */
  function clearFieldErrors(){
    document.querySelectorAll(".field-error.show").forEach(err => err.classList.remove("show"));

    document.querySelectorAll("[aria-invalid]").forEach(c => c.removeAttribute("aria-invalid"));

    document.querySelectorAll("[aria-describedby]").forEach(c => {
      const ids = idsDescritos(c).filter(x => x.indexOf("err_") !== 0);
      if(ids.length) c.setAttribute("aria-describedby", ids.join(" "));
      else c.removeAttribute("aria-describedby");
    });
  }
