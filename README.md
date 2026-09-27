# AutFlow — landing

Página estática: HTML, CSS y JavaScript. No necesita Node, npm ni compilarse.
Three.js y GSAP vienen incluidos en `js/vendor/`.

## Ver la página

Hay que abrirla desde un servidor web (con doble clic, el navegador puede
bloquear el brazo 3D):

- En tu PC: VS Code con la extensión Live Server, o `python3 -m http.server`
  en esta carpeta y entrar a http://localhost:8000/landing-autflow.html
- En un servidor: copiar la carpeta a la carpeta web de Apache o nginx
  (por ejemplo `/var/www/autflow`). Si se quiere que abra en la raíz del
  dominio, renombrar `landing-autflow.html` a `index.html`.

## Estructura

- `landing-autflow.html` — la página
- `css/styles.css` — estilos
- `js/main.js` — cotizador, menú, slides y WhatsApp
- `js/i18n.js` — traducción español / inglés
- `js/robot-hand/` — brazo robótico 3D
- `js/vendor/` — Three.js y GSAP
- `assets/logo.png` — logo
