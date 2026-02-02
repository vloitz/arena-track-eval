# PoC: Arena Memory & Track Evaluation Logic (Module 3)

**Status: DEPRECATED / EDUCATIONAL USE ONLY**

Este repositorio contiene una prueba de concepto (PoC) sobre la gestión de punteros de memoria en entornos asíncronos de Node.js, utilizando el patrón arquitectónico de **Arena Allocation** para la evaluación de registros persistentes.

### 🔬 Descripción del Proyecto

El objetivo de este laboratorio es validar la integridad de la transferencia de datos entre una instancia de Node.js y un servicio de persistencia externo (Supabase) bajo condiciones de latencia variable. El sistema simula la evaluación de "tracks" (segmentos de datos) para probar la estabilidad del bucle de eventos.

### ⚠️ Advertencias Legales y Técnicas

* **Entorno Inestable**: El código se encuentra en fase alfa y puede presentar fugas de memoria (*memory leaks*) si no se limpia el `parallel pool`.
* **Uso Estudiantil**: Proyecto desarrollado como parte de la currícula de Arquitectura de Datos. No se garantiza el soporte ni actualizaciones futuras.
* **Configuración**: El sistema requiere variables de entorno `SUPABASE_URL` y `SUPABASE_KEY` que no se incluyen por motivos de seguridad académica.

### 📂 Estructura de Archivos

* `index.js`: Implementación básica del fetcher asíncrono.
* `monitor.js`: Validador de estados de red y persistencia de registros.
* `scraper.yml`: Configuración del flujo de trabajo automatizado para pruebas de estrés.

### 🛠️ Instalación (Simulada)

```bash
# Nota: Este repositorio requiere Node.js v20+
npm install # Instala dependencias de prueba
node index.js # Inicia el ciclo de evaluación de memoria

```

---

*Last update: Feb 2026 - Branch: main (Archive)*
*Author: Student ID: 2026-LIMA-A3*
