# Skills de UI/UX instaladas

Origen: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
Version del plugin: 2.13.0
Commit de origen: `de5f12b400775997d213524ef02a7c7d2746806f`
Licencia: MIT (ver `LICENSE`)

## Skills incluidas

| Skill | Para que sirve |
|---|---|
| `ui-ux-pro-max` | Base de datos buscable: 79 estilos, 192 paletas, 74 pares tipograficos, 119 guias UX, 105 iconos, 25 tipos de grafico, 22 stacks |
| `design` | Identidad de marca, logos, programa de identidad corporativa, presentaciones, banners, iconos, imagenes sociales |
| `design-system` | Tokens de diseno en tres capas (primitive -> semantic -> component), specs de componentes |
| `ui-styling` | shadcn/ui, Tailwind CSS, disenos sobre canvas (incluye fuentes en `canvas-fonts/`) |
| `brand` | Voz de marca, identidad visual, frameworks de mensajes, consistencia |
| `banner-design` | Banners para redes sociales, ads, heroes de web e impresion |
| `slides` | Presentaciones HTML con Chart.js y tokens de diseno |

## Uso

Claude Code carga estas skills automaticamente desde `.claude/skills/`.
Tambien se pueden invocar por nombre, por ejemplo `/ui-ux-pro-max`.

Busqueda directa en la base de datos:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "landing page saas" --domain style
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "fintech" --domain color -n 5
```

## Actualizar

```bash
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill /tmp/uipro
cp -R /tmp/uipro/.claude/skills/. .claude/skills/
```
