# ControlTV NOC - Smart TV & Digital Signage Remote Control Platform

Plataforma web moderna y centro de monitoreo industrial (NOC / Command Center) para la gestión, telemetría y control remoto centralizado de pantallas **Smart TV y Digital Signage profesionales** mediante su dirección IP y protocolos de red.

Desarrollada bajo estándares de Arquitectura Senior para IoT, redes industriales y control audiovisual corporativo.

---

## 🚀 Inicio Rápido (En 2 Pasos)

El proyecto cuenta con un motor de base de datos dual (**PostgreSQL** para producción y **SQLite WAL** integrado para ejecución instantánea sin necesidad de configurar bases de datos externas).

### 1. Iniciar Backend
```bash
cd backend
npm install
npm run dev
```
> El backend iniciará en `http://localhost:5000` con el servidor de sockets en el puerto `9099` y la base de datos preinicializada con pantallas de prueba.

### 2. Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```
> La interfaz del centro de operaciones cargará automáticamente en `http://localhost:3000`.

---

## 🔐 Credenciales de Acceso por Rol (RBAC)

El sistema incluye tres usuarios listos para demostración inmediata:

| Usuario | Contraseña | Rol | Privilegios |
| :--- | :--- | :---: | :--- |
| **`admin`** | `admin123` | **ADMIN** | Acceso total: Usuarios, pantallas, comandos, escáner y auditoría |
| **`supervisor`** | `super123` | **SUPERVISOR** | Registro y edición de pantallas, envío de comandos y auditoría |
| **`operator`** | `oper123` | **OPERADOR** | Control táctil, cambio de canales/entradas y vista remota |

---

## 📺 Capacidades y Requisitos Funcionales Implementados

1. **Gestión Integral de Dispositivos:**
   - Registro por Nombre, IP, Puerto, Marca, Modelo, Tipo de conexión y Dirección MAC.
   - Guardado persistente en base de datos relacional.
   - Edición y eliminación con control de permisos RBAC.
   - Prueba de enlace en vivo (Ping TCP con medición de latencia en milisegundos).

2. **Control Remoto Táctil (Master Remote Controller):**
   - Botón Encender (con soporte **Wake-on-LAN** y tramas de red).
   - Botón Apagar y Reinicio de pantalla.
   - Silenciar / Desmutear con indicador visual.
   - Sliders de ajuste de volumen (0-100%) y calibración de brillo del panel.
   - Selector directo de entradas: **HDMI1, HDMI2, HDMI3, DisplayPort, USB, TV**.
   - Sintonizador de canal directo.
   - Cruceta D-Pad táctil (Arriba, Abajo, Izquierda, Derecha, OK, Volver, Menú, Inicio).
   - Consola de comandos crudos para envío de sintaxis nativa de cualquier fabricante.

3. **Comunicación Multiprotocolo de Red:**
   - **PJLink:** Estándar internacional JBMIA clase 1 y 2 en puerto TCP 4352 (`%1POWR`, `%1INPT`, `%1AVMT`).
   - **Samsung MDC:** Control serie RS232-over-IP con tramas binarias (`0xAA`) y suma de comprobación (checksum), más API Tizen REST.
   - **LG SuperSign / webOS:** Comandos ASCII sobre Ethernet (puerto 9761, `ka 01 01\r`, `xb 01 90\r`) y SSAP WebSocket.
   - **Sony BRAVIA Professional:** REST API JSON-RPC con autenticación Pre-Shared Key (PSK).
   - **Telnet / Raw TCP:** Sockets directos para cualquier monitor industrial.
   - **SNMP:** Consultas de telemetría MIB y estados operativos.
   - **Validación previa:** Comprobación de enlace antes de enviar comandos para evitar cuelgues.
   - **Heartbeat en segundo plano:** Sondeo automático cada 15 segundos con actualización reactiva en tiempo real por WebSocket.

4. **Dashboard Industrial NOC (Tema Oscuro):**
   - Tarjetas informativas de alta visibilidad: Pantallas totales, en línea, disponibilidad porcentual, temperatura media del chasis y alertas activas.
   - Gráfica en tiempo real con **Recharts** de temperatura térmica y latencia de red.
   - Matriz de pantallas con indicadores glowing de estado y acciones rápidas en 1 clic.

5. **Vista Remota de Pantalla (Streaming & Screen Capture):**
   - **Screen Capture API nativa:** Conecta la señal de cualquier PC intermedia o tarjeta capturadora HDMI USB conectada a la pantalla con 1 clic directo en el navegador.
   - **Soporte RTSP / WebRTC:** Selector de fuentes de video en directo.
   - **Simulador de señal en vivo:** Canvas animado a 60 FPS con patrón de prueba SMPTE y telemetría de emisión.
   - **Modo pantalla completa** y botón de captura instantánea (Snapshot PNG).
   - **Inspector de compatibilidad:** Análisis diagnóstico de capacidades del modelo según las especificaciones técnicas.

6. **Descubrimiento Automático (Network Discovery):**
   - Escaneo inteligente de la subred local (`192.168.1.0/24` o personalizada).
   - Sondeo en paralelo de puertos Smart TV (4352, 1515, 9761, 8001, 80, 23).
   - Fingerprinting automático mostrando IP, MAC Address, Fabricante, Hostname y protocolos abiertos.
   - Importación de pantallas descubiertas a la base de datos en 1 solo clic.

7. **Seguridad y Auditoría:**
   - Autenticación segura mediante JSON Web Tokens (JWT) y passwords con hash bcrypt.
   - Matriz de roles RBAC (Administrador, Supervisor, Operador).
   - Registro de auditoría inmutable (`audit_logs`) de todas las operaciones realizadas.
   - Historial de comandos ejecutados (`command_history`) con duración exacta en milisegundos y resultado.

---

## 📂 Estructura del Proyecto

```
ControlTV/
├── backend/
│   ├── src/
│   │   ├── config/            # Configuración de variables de entorno
│   │   ├── db/                # Pool PostgreSQL, SQLite fallback y migraciones SQL
│   │   ├── middleware/        # Autenticación JWT y validación RBAC
│   │   ├── protocols/         # Drivers: PJLink, Samsung MDC, LG, Sony, Telnet, SNMP, Virtual
│   │   ├── routes/            # Endpoints REST (auth, devices, control, discovery, audit, telemetry)
│   │   ├── services/          # Gestor de pantallas, ejecutor de comandos, escáner, heartbeat
│   │   ├── websocket/         # Hub Socket.IO para eventos reactivos y señalización WebRTC
│   │   └── index.ts           # Servidor principal HTTP, WS y Socket Simulator
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Dashboard, Control Remoto, Stream, Escáner, Dispositivos, Auditoría
│   │   ├── context/           # AuthContext (roles) y DeviceContext (WebSocket & comandos)
│   │   ├── services/          # Clientes API Axios y Socket.IO
│   │   ├── types/             # Tipado TypeScript compartido
│   │   ├── App.tsx            # Enrutador y layout principal del NOC
│   │   └── index.css          # Estilos industriales oscuros con Tailwind CSS v4
│   ├── package.json
│   ├── vite.config.ts         # Configuración Vite con proxy a API backend
│   └── Dockerfile
│
├── docs/                      # Entregables técnicos detallados
│   ├── ARQUITECTURA.md        # Arquitectura completa, C4 y diseño por capas
│   ├── BASE_DE_DATOS.md       # Diagrama ERD, tablas y diccionario de datos
│   ├── ENDPOINTS_API.md       # Especificación completa de APIs REST y WebSockets
│   ├── DIAGRAMAS_DE_FLUJO.md  # Diagramas Mermaid (comandos, descubrimiento, video)
│   ├── ESTRATEGIA_DESPLIEGUE.md # Guía Docker, Kubernetes y producción
│   ├── SEGURIDAD.md           # Políticas RBAC, hardening y auditoría
│   └── PLAN_DE_PRUEBAS.md     # Casos de prueba funcionales y de rendimiento
│
├── docker-compose.yml         # Orquestación con PostgreSQL 16, Backend y Frontend
├── Especificaciones.txt       # Requerimientos originales del proyecto
└── README.md
```

---

## 🐳 Despliegue con Docker Compose (Producción)

Para poner en marcha el sistema completo con PostgreSQL 16 y Nginx en un solo comando:

```bash
docker compose up --build -d
```
Accede a la consola web en `http://localhost:3000`.
