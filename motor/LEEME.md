# Motor del constructor

Calcula las estadísticas de un arma con los accesorios elegidos: cadencia, velocidad de bala, tiempo de apuntado, recarga, retroceso, las cuatro barras del menú del juego (Disparo de cadera, Precisión, Control y Movilidad) y el daño por distancia.

## Crédito

El motor de cálculo (`sim/`) y los datos del juego (`datos-juego.json`) provienen de **[BF6 Weapon Analyzer](https://raymdl.github.io/BF6-Weapon-Analyzer/)**, de **Raymdl** ([repositorio](https://github.com/raymdl/BF6-Weapon-Analyzer)), y se usan con su permiso. Los archivos de `sim/` son copias sin modificar.

La versión copiada figura en `datos-juego.json` → `origen`.

## Archivos

| Archivo | Qué es |
|---|---|
| `bf6-motor.js` | Envoltorio en español: ranuras, opciones y cálculo. Es lo único que usan el panel y la página. |
| `sim/*.js` | Motor del analizador, sin cambios. |
| `datos-juego.json` | Datos del juego que usa el motor (armas, accesorios, munición, tablas). |
| `../data/accesorios.json` | Nombres de los accesorios en español. Se editan desde el panel. |

## Uso

```js
const M = await import('https://cdn.jsdelivr.net/gh/alka593yt/bf6-datos@main/motor/bf6-motor.js');
await M.cargar();
const sel = M.seleccionPorDefecto('m433');            // configuración de fábrica
M.ranuras('m433', sel);                               // ranuras y opciones para las listas
M.modos('m433', sel);                                 // modos de disparo (vacío si hay uno)
M.calcular('m433', { ...sel, canonInferior: 'ribbed_vert' });
// -> { stats, dano: { pecho, cabeza, estomago }, puntos, seleccion, ... }
```

Ranuras: `mira`, `accesorioOptico`, `boca`, `canon`, `canonInferior`, `laser`, `luz`, `cargador`, `municion`, `ergonomia` y `modo`. En las armas donde el láser y la luz comparten lugar, se usa `riel` con el valor `"tipo:id"` (por ejemplo `"light:flashlight"`).

## Actualizar a una temporada nueva

```bash
git clone --depth 1 https://github.com/raymdl/BF6-Weapon-Analyzer /tmp/analizador
python3 scripts/actualizar_motor.py /tmp/analizador
```

Copia el motor y los datos nuevos, y agrega a `data/accesorios.json` los accesorios nuevos sin tocar las traducciones existentes.
