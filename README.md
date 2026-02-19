# Mp3Kut — Editor de Audio MP3

Aplicación web para importar, reproducir y cortar archivos de audio (MP3 u otros formatos soportados por el navegador). Permite marcar puntos de corte en la forma de onda y exportar el audio dividido en segmentos en formato WAV.

## Funcionamiento

1. **Carga de audio**: En la pantalla inicial se selecciona un archivo de audio. La app lo decodifica en memoria (Web Audio API) y muestra la duración y la forma de onda.

2. **Reproducción**: El reproductor permite play/pausa, barra de búsqueda, saltos de ±5 s y un campo **“Ir a”** para escribir un tiempo (p. ej. `mm:ss` o `mm:ss.cc`) y posicionar el cabezal ahí. Opción de velocidad **1x** o **2x**.

3. **Forma de onda**: Se dibuja la onda del canal izquierdo. Tiene **zoom** (1x–8x) y **scroll** horizontal para archivos largos. Una línea verde indica la posición actual de reproducción.

4. **Puntos de corte**: Clic en la onda añade un punto de corte (línea roja discontinua). En la lista **“Puntos de Corte”** se puede:
   - **Editar el tiempo** en cada fila (formato `mm:ss` o similar) y la guía en la onda se actualiza.
   - Pulsar el botón **Reproducir** para iniciar la reproducción desde ese instante.
   - Eliminar el punto con la X.

5. **Exportación**: Con al menos un punto de corte, **“Exportar Archivos Cortados”** genera tantos archivos WAV como segmentos (entre el inicio, los puntos de corte y el final) y los descarga.

## Características

- Carga de archivos de audio (MP3, WAV, etc., según soporte del navegador)
- Reproducción con barra de búsqueda, saltos y velocidad 1x / 2x
- Ir a un tiempo manual (campo “Ir a” con formato `mm:ss`)
- Forma de onda con zoom (1x–8x) y scroll horizontal
- Puntos de corte en la onda (añadir / eliminar con clic)
- Lista de puntos de corte con tiempo editable y sincronizado con la onda
- Reproducir desde un punto de corte con un botón en la lista
- Exportación de segmentos en WAV

## Tecnologías

- **React** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide React** (iconos)
- **Web Audio API** (decodificación, reproducción y procesamiento de audio)

## Instalación y uso

Requisitos: Node.js (recomendado v18+).

```bash
# Clonar y entrar en el proyecto
cd mp3kut

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Vista previa del build
npm run preview
```

Con `npm run dev` se abre la app en `http://localhost:5173` (o el puerto que indique Vite).

## Estructura del proyecto

```
src/
├── main.tsx           # Entrada de la aplicación
├── App.tsx            # Estado global, flujo y composición de la UI
├── index.css          # Estilos globales (Tailwind)
├── components/
│   ├── FileUpload.tsx # Selector y carga de archivo
│   ├── AudioPlayer.tsx# Controles de reproducción y tiempo
│   └── Waveform.tsx  # Forma de onda, zoom, scroll y puntos de corte
└── utils/
    └── audioProcessor.ts  # Carga, corte, conversión a WAV y descarga
```

## Licencia

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
