  const $ = id => document.getElementById(id);

  function valor(id){
    const el = $(id);
    return el ? el.value.trim() : "";
  }

  function llenarSelect(selectId, opciones, placeholder = "Selecciona…"){
    const select = $(selectId);

    if(!select) return;

    select.innerHTML = "";

    const base = document.createElement("option");
    base.value = "";
    base.textContent = placeholder;
    select.appendChild(base);

    opciones.forEach(opcion => {
      const o = document.createElement("option");
      o.value = opcion;
      o.textContent = opcion;
      select.appendChild(o);
    });
  }
