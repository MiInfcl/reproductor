// Cuenta común de Taller (Google, Firebase tiempos-921ec, esquema users/{uid}/reproductor/listas).
// Todavía no está lista: la coordinan los agentes portada y cronometros. Mientras tanto las listas viven en este
// navegador y esta pieza no hace nada. Cuando exista, aquí se inicia sesión y se sincronizan las listas:
//   Cuenta.disponible  → true cuando haya configuración y reglas para «reproductor»
//   Cuenta.alCambiar(fn) → avisa cuando llegan listas desde otro dispositivo
//   Cuenta.guardar(listas) → sube las listas
window.Cuenta = {
  disponible: false,
  alCambiar() {},
  guardar() {}
};
