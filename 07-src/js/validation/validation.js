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

    /* Validación de adjuntos: si "Cuenta con pruebas" = Sí, debe haber al menos un archivo */
    if(valor("Cuenta_Con_Pruebas") === "Sí"){
      const inputAdj = $("Adjuntos_Files");
      const sinArchivos = !inputAdj || !inputAdj.files || inputAdj.files.length === 0;
      if(sinArchivos){
        if(inputAdj) inputAdj.classList.add("invalid");
        setFieldError(inputAdj, "Adjunta al menos un archivo de evidencia");
        ok = false;
        if(!primerError) primerError = inputAdj;
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

  function setFieldError(el, msg){
    const field = el.closest(".field");
    if(!field) return;
    let err = field.querySelector(".field-error");
    if(!err){
      err = document.createElement("span");
      err.className = "field-error";
      field.appendChild(err);
    }
    err.textContent = msg;
    err.classList.add("show");
  }

  function clearFieldErrors(){
    document.querySelectorAll(".field-error.show").forEach(e=>e.classList.remove("show"));
  }
