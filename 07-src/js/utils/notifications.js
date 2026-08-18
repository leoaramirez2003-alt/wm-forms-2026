  let toastTimer;

  function mostrarToast(tipo,msg){
    const t = $("toast");

    $("toastIc").textContent = tipo==="ok" ? "✓" : "!";
    $("toastMsg").textContent = msg;

    t.className = "toast show "+tipo;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(()=>{
      t.className = "toast "+tipo;
    }, 3800);
  }
