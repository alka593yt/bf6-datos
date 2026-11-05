# bf6-datos

Base de datos de armas de Battlefield 6 para el comparador de [alka593.com](https://www.alka593.com/p/comparadorbf.html).

## Archivos

| Archivo | Qué contiene |
|---|---|
| `data/armas.json` | Todas las armas: estadísticas, daño por tramos, equipamientos y el esquema de campos. |
| `admin/index.html` | Panel privado para editar `data/armas.json`. Pide una clave de GitHub para guardar. |

## Cómo se usa

- **Editar datos:** abre el panel en `https://alka593yt.github.io/bf6-datos/admin/` (requiere GitHub Pages activado) y entra con tu clave de GitHub.
- **Leer datos desde la página pública:** `https://cdn.jsdelivr.net/gh/alka593yt/bf6-datos@main/data/armas.json`

## Formato de `data/armas.json`

- `esquema.estadisticas`: lista de estadísticas (clave, nombre, unidad, grupo, si "más es mejor" y si se muestra). Las páginas leen los campos de aquí, así que agregar uno no rompe nada.
- `esquema.zonas`, `esquema.municiones`, `esquema.ranuras`, `esquema.otros`: zonas de daño, multiplicadores de munición, ranuras de accesorios y datos con opciones.
- `armas[]`: una entrada por arma.
  - `base`: estadísticas base.
  - `dano`: por zona, una lista de tramos `[desde_metro, daño]`. El daño se mantiene hasta el siguiente tramo; el último llega a 200 m.
  - `equipamientos[]`: equipamientos preestablecidos, con su nombre, accesorios y, si hace falta, estadísticas y daño propios.
  - `idAnalizador`: el arma equivalente en BF6 Weapon Analyzer (para el constructor).

Las balas y el TTK no se guardan; se calculan a partir del daño:

```
balas = Math.ceil(vida / daño)
ttk   = Math.round((60 / cadencia) * (balas - 1) * 1000)   // ms
```
