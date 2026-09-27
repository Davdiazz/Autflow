# AutFlow — landing

Página estática (HTML, CSS y JavaScript con Three.js). No necesita compilarse.

## Ejecutar con Docker

```bash
docker compose up -d --build
```

Luego abre http://localhost:8080 (en el servidor: `http://IP-DEL-SERVIDOR:8080`).
Para usar el puerto 80, cambia `"8080:80"` por `"80:80"` en `docker-compose.yml`.

Ver registros: `docker compose logs -f` · Detener: `docker compose down`

## Estructura

- `landing-autflow.html` — la página (en Docker se sirve como `index.html`)
- `css/styles.css` — estilos
- `js/main.js` — cotizador, menú, slides y WhatsApp
- `js/i18n.js` — traducción español / inglés
- `js/robot-hand/` — brazo robótico 3D
- `js/vendor/` — Three.js y GSAP (incluidos, sin CDN)
- `docker/nginx.conf`, `Dockerfile`, `docker-compose.yml` — despliegue
