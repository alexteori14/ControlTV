# Plan Integral de Pruebas - ControlTV NOC

## 1. Alcance y Objetivos
Validar el correcto funcionamiento funcional, de rendimiento, resiliencia y seguridad de la plataforma ControlTV en escenarios operativos reales y simulados.

---

## 2. Matriz de Casos de Prueba

### 2.1 Módulo 1: Gestión de Dispositivos (CRUD)
| ID | Caso de Prueba | Entrada | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Registrar pantalla válida | Nombre, IP, Puerto, Marca, Conexión | Pantalla guardada en BD, evento `device_created` emitido por WebSocket | Superado |
| **TC-02** | Validación de campos obligatorios | Solicitud POST sin IP ni Marca | Retorna HTTP 400 Bad Request con mensaje descriptivo | Superado |
| **TC-03** | Edición de configuración | Modificar puerto y entrada por defecto | Registro actualizado en BD y reflejado en el Dashboard | Superado |
| **TC-04** | Eliminación restringida | Intento de eliminación con rol OPERADOR | Retorna HTTP 403 Forbidden | Superado |
| **TC-05** | Eliminación autorizada | Eliminación con rol ADMIN | Pantalla eliminada, audit log generado | Superado |

### 2.2 Módulo 2: Control Remoto & Protocolos
| ID | Caso de Prueba | Protocolo | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-06** | Encendido por Wake-on-LAN | WoL (UDP 9) | Paquete mágico transmitido a la MAC, comando aceptado | Superado |
| **TC-07** | Control PJLink Standard | PJLink (TCP 4352) | Envío de `%1POWR 1\r`, respuesta `%1POWR=OK` analizada | Superado |
| **TC-08** | Control Samsung MDC | RS232-over-IP | Trama binaria `0xAA` calculada con checksum exacto | Superado |
| **TC-09** | Conmutación de Entradas | HDMI1, HDMI2, DP, USB | Driver traduce a código de entrada correspondiente | Superado |
| **TC-10** | Comando crudo (Raw Console) | Sintaxis nativa | Envío directo al socket y captura de respuesta en consola | Superado |

### 2.3 Módulo 3: Comunicación de Red & Resiliencia
| ID | Caso de Prueba | Condición | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-11** | Validación previa de conectividad | Pantalla apagada / IP inalcanzable | Comando abortado en < 2500ms, pantalla marcada OFFLINE | Superado |
| **TC-12** | Heartbeat en segundo plano | Intervalo de 15s | Detección automática de pantallas caídas y recuperadas | Superado |
| **TC-13** | Sincronización WebSocket | Múltiples navegadores abiertos | Cambio de volumen en un cliente se refleja al instante en los demás | Superado |

### 2.4 Módulo 4: Vista Remota & Screen Capture
| ID | Caso de Prueba | Tecnología | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-14** | Activación de Screen Capture API | Navegador de operador | Captura interactiva del escritorio / HDMI sin plugins | Superado |
| **TC-15** | Patrón de prueba simulado | Modo desarrollo | Canvas animado en 60 FPS con telemetría visual | Superado |
| **TC-16** | Captura instantánea (Snapshot) | Botón cámara | Exportación y descarga de archivo PNG de alta resolución | Superado |

### 2.5 Módulo 5: Descubrimiento Automático (Discovery)
| ID | Caso de Prueba | Parámetro | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-17** | Escaneo de subred local | Subred `192.168.1.0/24` | Lista con IP, MAC, Fabricante y protocolos abiertos | Superado |
| **TC-18** | Importación en 1 Clic | Dispositivo descubierto | Se registra en la BD con el driver sugerido preseleccionado | Superado |

### 2.6 Módulo 6: Seguridad & Auditoría
| ID | Caso de Prueba | Condición | Resultado Esperado | Estado |
| :--- | :--- | :--- | :--- | :---: |
| **TC-19** | Autenticación JWT | Credenciales válidas | Token firmado generado, expiración a las 24h | Superado |
| **TC-20** | Trazabilidad inmutable | Ejecución de comando remoto | Registro generado en `audit_logs` y `command_history` con ms | Superado |

---

## 3. Entorno de Pruebas Ejecutado
- **Sistema Operativo:** Windows 10/11 x64
- **Node.js:** v24.22.0
- **Base de Datos:** SQLite WAL / PostgreSQL 16
- **Navegadores validados:** Chrome / Edge / Firefox (Compatibles con Web Screen Capture API)
