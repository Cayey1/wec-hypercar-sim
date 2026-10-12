# 🏎️ WEC Hypercar 3D Simulator - Spa-Francorchamps

Simulador de carreras 3D de alta fidelidad para navegador web (Three.js), inspirado en el Campeonato Mundial de Resistencia (**WEC** / 24 Horas de Le Mans) en el legendario circuito belga de **Spa-Francorchamps**.

---

## 📸 Recreación Fiel del Juego

La interfaz y el motor 3D replican con exactitud todos los elementos visibles en la captura:
1. **Circuito de Spa-Francorchamps en 3D**:
   - Subida icónica de **Eau Rouge y Raidillon** con más de 40 metros de desnivel vertical.
   - Pianos (curbs) rojo y amarillo en el ápice de las curvas.
   - Guardarraíles de protección y torre roja de comisarios.
   - Tribunas con techo en la recta principal y en la colina.
   - Bosque de pinos de las Ardenas en el horizonte.

2. **Coches Hypercar (LMP1 / LMDh)**:
   - Chasis aerodinámico con splitter de carbono y difusor trasero.
   - Aleta dorsal de tiburón (*shark fin*) reglamentaria.
   - Alerón trasero elevado con soportes de cuello de cisne (*swan-neck*).
   - Cabina burbuja central con reflejos.
   - Luces LED delanteras y traseras funcionales.
   - Escape con llamaradas de fuego (*backfire*) en desaceleración.
   - Rivales con IA compitiendo en pista (Porsche, Ferrari, BMW, Cadillac, Alpine, Toyota).

3. **HUD Telemétrico Profesional WEC**:
   - **Retrovisor en Vivo (Superior Derecho)**: Renderizado secundario en tiempo real que muestra los rivales detrás de ti.
   - **Minimapa 2D (Inferior Izquierdo)**: Traza el circuito completo con puntos GPS en vivo para el jugador y rivales.
   - **Leaderboard (Lateral Izquierdo)**: Tabla WEC TOP 11-20 con brechas de tiempo (GAP), combustible y fiabilidad.
   - **Barra Superior**: Telemetría de viento, carga aerodinámica (kN), agarre (G) y densidad del aire.
   - **Tacómetro Digital (Inferior Derecho)**:
     - Indicador gigante de marcha actual (`1` a `7`, `N`, `R`).
     - Velocímetro digital (`km/h`).
     - Barra LED de revoluciones (luces verdes, amarillas y rojas de corte de inyección).
     - Nivel de combustible y peso del coche.
     - Temperatura de los 4 neumáticos (FL, FR, RL, RR).
     - Vuelta actual, cronómetro y velocidad máxima alcanzada.
   - **Indicador de Curva**: Muestra el nombre oficial de cada curva a medida que la recorres (*La Source, Eau Rouge, Raidillon, Kemmel, Pouhon, Blanchimont, Bus Stop*).

4. **Audio del Motor Sintetizado**:
   - Motor híbrido V8 generado en tiempo real con Web Audio API (sin descargas pesadas).
   - Silbido del turbo y ERS al acelerar.

---

## 🎮 Controles de Conducción

### En Computadora (Teclado):
| Tecla | Acción |
|---|---|
| <kbd>W</kbd> o <kbd>▲</kbd> | Acelerar |
| <kbd>S</kbd> o <kbd>▼</kbd> | Frenar / Marcha atrás |
| <kbd>A</kbd> <kbd>D</kbd> o <kbd>◀</kbd> <kbd>▶</kbd> | Girar a la izquierda / derecha |
| <kbd>Espacio</kbd> | Freno de mano |
| <kbd>Shift</kbd> | Boost Híbrido (ERS / Push to Pass) |
| <kbd>C</kbd> | Cambiar Cámara (Persecución, Capó, Cockpit) |
| <kbd>R</kbd> | Reubicar el coche en el centro de la pista |
| <kbd>M</kbd> | Silenciar / Activar sonido del motor |

### En Teléfonos Móviles / Tablets:
- **Botones táctiles en pantalla**: Pedales de acelerador (⚡), freno (🛑) y flechas de dirección (◀ ▶).

---

## 🚀 Cómo Jugar

1. Haz doble clic en [**`iniciar.bat`**](file:///C:/Users/Realf/.gemini/antigravity/scratch/wec_hypercar_sim/iniciar.bat) en tu explorador de Windows.
2. Se abrirá automáticamente tu navegador en **`http://localhost:5050`**.
3. Haz clic en **`INICIAR CARRERA`** y ¡a correr!
