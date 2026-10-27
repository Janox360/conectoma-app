# Conectoma Musical · app web para el iPhone

El Conectoma del Acer corriendo entero en el iPhone, como app de la pantalla de inicio. Elige las canciones con el mismo cerebro (listas, filtros, vueltas sin repetir, semillas) y las reproduce con el reproductor embebido de YouTube.

- `index.html`: la pantalla. `app.js`: memoria, reproductor, controles de la pantalla bloqueada y menú. `conectoma.js`: la lógica, la misma de `Conectoma-iPhone-1.1.0.js` de Scriptable.
- Se publica con GitHub Pages (Settings › Pages › rama `main`, carpeta raíz). En Safari: Compartir › Agregar a inicio.
- Lo aprendido queda en el iPhone (localStorage). El menú ☰ importa `conectoma-iphone.json` de Scriptable y guarda copias.
- Para buscar canciones nuevas necesita una clave gratis de la YouTube Data API v3, que se pega en el menú y queda solo en el iPhone.
