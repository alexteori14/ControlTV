# ControlTV NOC - Consola Web Frontend

Interfaz de usuario del Centro de Monitoreo y Operaciones (NOC) construida con **React 19, TypeScript, Vite y Tailwind CSS v4**.

---

## 🚀 Inicio en Desarrollo

```bash
npm install
npm run dev
```

La consola se levantará en `http://localhost:3000` con proxy reverso automático hacia el backend Node.js en `:5000` para las rutas `/api` y los canales de WebSocket `/socket.io`.

---

## 🖥️ Módulos Principales de la Interfaz

1. **Control Remoto & Capturas de Pantalla en Vivo (`UnifiedRemoteScreen.tsx`):**
   - **Monitor 16:9 de Captura de TV:** En lugar de imágenes estáticas o lienzos genéricos, toma y muestra de manera reactiva una captura de pantalla de la televisión tras **CADA acción del control remoto** (Encendido, Standby con LED rojo físico, OSD de volumen, silencio, conmutación de entradas HDMI 1/2/TV/USB, escritura desde teclado y navegación con cruceta D-Pad).
   - **Efecto de Obturador Fotográfico (Shutter Flash):** Animación visual de destello y sonido táctil al capturar fotogramas.
   - **Carrete Histórico de Capturas:** Galería horizontal en miniatura debajo de la pantalla con visualización en alta resolución y descarga de capturas en formato PNG/SVG.
   - **Modos de Captura Híbrida:** Alternancia entre `Capturas TV` (Motor IP en tiempo real), `HDMI USB` (Capturadora física vía `getUserMedia`) y `Capturar PC` (`getDisplayMedia`).
   - **Barra de Escritura desde Laptop:** Envío de texto directo a los buscadores de la Smart TV (`SEND_TEXT`) y modo *Passthrough* en vivo.

2. **Dashboard Industrial (`IndustrialDashboard.tsx`):**
   - Tarjetas KPI con estado de pantallas, disponibilidad y alertas de temperatura.
   - Matriz de tarjetas de cada pantalla con indicadores LED y botones de acción rápida.
   - Gráficas en tiempo real de temperatura y latencia con **Recharts**.

3. **Gestión de Pantallas (`DeviceManager.tsx`):**
   - ABM completo con formulario modal y autodescubrimiento por IP.
   - Pruebas de conectividad (Ping TCP) bajo demanda.

4. **Escáner de Red Local (`NetworkScanner.tsx`):**
   - Descubrimiento automático de Smart TVs en la subred local e importación en 1 clic.

5. **Auditoría y Seguridad (`AuditLogViewer.tsx`):**
   - Bitácora inmutable de eventos (`audit_logs`) e historial de comandos (`command_history`).

---

## 🛠️ Scripts Disponibles

* `npm run dev`: Inicia el servidor de desarrollo Vite con Hot Module Replacement (HMR).
* `npm run build`: Compila TypeScript (`tsc -b`) y empaqueta la aplicación con Vite para producción en `dist/`.
* `npm run preview`: Levanta un servidor local para previsualizar la compilación de producción.
