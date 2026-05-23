# Guía de Preparación: LILYGO T-Dongle-S3 como "BadUSB" (DuckyScript)

Al configurar tu LILYGO T-Dongle-S3 (o cualquier ESP32-S3/S2) con un firmware compatible, puedes utilizar scripts en formato `.txt` (DuckyScript) para automatizar la apertura de herramientas de diagnóstico, recolección de logs, o ejecución de scripts en equipos Windows con solo conectarlo.

## Paso 1: Instalar el Firmware (CircuitPython)

1. Conecta el **T-Dongle-S3** a tu PC manteniendo presionado el botón "BOOT" (si lo tiene) o ponlo en modo *Bootloader* (DFU).
2. Ve a la página oficial de CircuitPython para el T-Dongle-S3: [CircuitPython T-Dongle-S3](https://circuitpython.org/board/lilygo_t_dongle_s3/).
3. Descarga el archivo **.bin** o **.uf2** más reciente.
4. Si usas la herramienta web (Web Serial ESPTool):
   - Entra a [ESP Web Flasher](https://nabucasa.github.io/esp-web-flasher/).
   - Conecta, selecciona el puerto COM del Dongle y flashea el `.bin` de CircuitPython.
5. Una vez instalado, desconecta y vuelve a conectar el Dongle. Debería aparecer en tu PC una nueva unidad USB llamada **`CIRCUITPY`**.

## Paso 2: Instalar Librerías HID

Para que el Dongle pueda enviar pulsaciones de teclado, necesitas la librería `adafruit_hid`.
1. Descarga el paquete de librerías de CircuitPython (`adafruit-circuitpython-bundle-8.x...`) desde [aquí](https://circuitpython.org/libraries).
2. Extrae el .zip y busca la carpeta `adafruit_hid` dentro de `lib/`.
3. Copia la carpeta **`adafruit_hid`** y pégala dentro de la carpeta **`lib`** en la unidad `CIRCUITPY`.

## Paso 3: Cargar el Intérprete de DuckyScript

Necesitas un script en Python que lea archivos `.txt` y los convierta en pulsaciones de teclado. Usaremos una adaptación de *PicoDucky*.

1. En la unidad `CIRCUITPY`, crea o edita el archivo **`code.py`**.
2. Pega el código del intérprete de DuckyScript. (Puedes buscar en GitHub un script de "CircuitPython DuckyScript Interpreter"). Un intérprete básico leerá el archivo de texto línea por línea y usará `Keyboard(usb_hid.devices)` para enviar las teclas.
3. *Nota:* Por seguridad y para evitar que el script se ejecute mientras intentas programarlo, es útil agregar una condición en `code.py` para que **no se ejecute** si el botón del Dongle está presionado al conectarlo.

## Paso 4: Cargar tu Payload (.txt)

Ahora el Dongle está listo para recibir archivos `.txt` en lenguaje DuckyScript.
1. Crea un archivo llamado **`payload.txt`** en la raíz de la unidad `CIRCUITPY`.
2. Escribe tu script (ver ejemplos en la carpeta `scripts_tecnicos_dongle/`).

---

## ⚠️ Cómo detener la ejecución (Modo Edición)
Si necesitas modificar el `payload.txt`, pero el dongle empieza a escribir y abrir ventanas apenas lo conectas, **mantén presionado el botón del dongle** mientras lo insertas en el puerto USB, o abre rápidamente el archivo y bórralo/renómbralo.

## Ventajas para NEXORC:
*   **Diagnóstico Inmediato:** Extrae información del sistema (dxdiag, msinfo32, logs de red) a un archivo o a la memoria del dongle en segundos.
*   **Auditorías Rápidas:** Ejecuta scripts de recolección de información para auditorías de redes de forma estandarizada.
