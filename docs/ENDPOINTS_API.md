# Especificación de Endpoints REST y WebSocket - ControlTV

## 1. Convenciones y Autenticación
- **Base URL:** `/api`
- **Autenticación:** Cabecera HTTP `Authorization: Bearer <JWT_TOKEN>`.
- **Formato:** JSON (`Content-Type: application/json`).

---

## 2. Módulo de Autenticación (`/api/auth`)

### 2.1 Iniciar Sesión
- **Método:** `POST /api/auth/login`
- **Acceso:** Público
- **Cuerpo de Solicitud:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Respuesta (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "3c01418e-9949-48f8-b570-54317e014c36",
    "username": "admin",
    "email": "admin@controltv.lan",
    "role": "ADMIN",
    "fullName": "System Administrator"
  }
}
```

### 2.2 Perfil del Usuario Actual
- **Método:** `GET /api/auth/me`
- **Acceso:** Autenticado (Cualquier rol)

---

## 3. Módulo de Gestión de Pantallas (`/api/devices`)

### 3.1 Listar Pantallas
- **Método:** `GET /api/devices`
- **Acceso:** Autenticado

### 3.2 Obtener Detalle de Pantalla
- **Método:** `GET /api/devices/:id`
- **Acceso:** Autenticado

### 3.3 Registrar Nueva Pantalla
- **Método:** `POST /api/devices`
- **Acceso:** Roles `ADMIN`, `SUPERVISOR`
- **Cuerpo de Solicitud:**
```json
{
  "name": "Display Videowall NOC",
  "ip": "192.168.1.101",
  "port": 1515,
  "macAddress": "00:1A:E8:4A:BC:11",
  "brand": "Samsung",
  "model": "QM85R-B",
  "connectionType": "TELNET",
  "location": "Sala de Control Principal",
  "streamType": "SIMULATED"
}
```

### 3.4 Actualizar Pantalla
- **Método:** `PUT /api/devices/:id`
- **Acceso:** Roles `ADMIN`, `SUPERVISOR`

### 3.5 Eliminar Pantalla
- **Método:** `DELETE /api/devices/:id`
- **Acceso:** Rol `ADMIN`

### 3.6 Probar Conectividad (Ping)
- **Método:** `POST /api/devices/:id/ping`
- **Acceso:** Autenticado
- **Respuesta:**
```json
{
  "reachable": true,
  "latencyMs": 14,
  "error": null
}
```

---

## 4. Módulo de Control Remoto (`/api/control`)

### 4.1 Enviar Comando Universal
- **Método:** `POST /api/control/:id/command`
- **Acceso:** Autenticado
- **Cuerpo de Solicitud:**
```json
{
  "command": "SET_INPUT",
  "payload": { "input": "HDMI2" }
}
```
Comandos soportados:
- `POWER_ON`, `POWER_OFF`, `RESTART`
- `SET_VOLUME`, `VOLUME_UP`, `VOLUME_DOWN`
- `MUTE`, `UNMUTE`, `TOGGLE_MUTE`
- `SET_BRIGHTNESS`, `BRIGHTNESS_UP`, `BRIGHTNESS_DOWN`
- `SET_INPUT` (`HDMI1`, `HDMI2`, `HDMI3`, `DISPLAYPORT`, `USB`, `TV`)
- `SET_CHANNEL`
- `KEY_PRESS` (`UP`, `DOWN`, `LEFT`, `RIGHT`, `ENTER`, `HOME`, `MENU`, `BACK`)
- `RAW_COMMAND` (Sintaxis nativa del fabricante)

- **Respuesta (200 OK):**
```json
{
  "success": true,
  "command": "SET_INPUT",
  "deviceId": "8493b871-...",
  "message": "Samsung MDC Input switched to HDMI2",
  "executionTimeMs": 28,
  "deviceState": { "currentInput": "HDMI2" }
}
```

---

## 5. Módulo de Descubrimiento de Red (`/api/discovery`)

### 5.1 Iniciar Escaneo de Red Local
- **Método:** `POST /api/discovery/scan`
- **Acceso:** Roles `ADMIN`, `SUPERVISOR`
- **Cuerpo:** `{ "subnet": "192.168.1.0/24" }`

### 5.2 Estado del Escaneo y Resultados
- **Método:** `GET /api/discovery/status`
- **Acceso:** Autenticado

### 5.3 Importar Dispositivo en 1 Clic
- **Método:** `POST /api/discovery/import`
- **Acceso:** Roles `ADMIN`, `SUPERVISOR`

---

## 6. Módulo de Auditoría y Telemetría

- `GET /api/audit/logs?limit=100`: Listado de auditoría de usuarios y eventos.
- `GET /api/audit/history?deviceId=...`: Historial de comandos ejecutados con tiempos en ms.
- `GET /api/telemetry/stats`: Resumen cuantitativo para el Dashboard NOC.
- `GET /api/telemetry/device/:id`: Historial térmico y de latencia para gráficas Recharts.

---

## 7. Eventos WebSocket (Socket.IO)

| Evento | Dirección | Descripción |
| :--- | :---: | :--- |
| `device_updated` | Servidor -> Cliente | Emite el nuevo estado en tiempo real tras un comando o heartbeat |
| `device_created` | Servidor -> Cliente | Notifica que se registró una nueva pantalla |
| `device_deleted` | Servidor -> Cliente | Notifica eliminación de un display |
| `command_executed` | Servidor -> Cliente | Emite resultado y duración del comando |
| `subscribe_device` | Cliente -> Servidor | Suscribe la conexión a una sala específica de un display |
| `webrtc_signal` | Bidireccional | Intercambio de señales SDP e ICE candidates para streaming WebRTC |
