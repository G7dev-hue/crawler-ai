# Architecture

Blochy is a static browser application. `index.html` loads all JavaScript into the global browser scope, then `ui.js` initializes the global application state and first Plotly render. There is no module system, build step, router, or framework state container.

## Runtime Loading Order

`index.html` loads dependencies and local files in this order:

1. Plotly: `plotly-2.16.1.min.js`
2. math.js from CDN
3. `helper.js`
4. `quantum.js`
5. Materialize JS from CDN
6. `plot.js`
7. `ui.js`

This order is part of the architecture. `ui.js` assumes every function from `helper.js`, `quantum.js`, and `plot.js` already exists globally. `quantum.js` and `plot.js` both assume global `math`, `document`, and sometimes global app variables exist.

## File Responsibilities

### `index.html`

`index.html` defines the entire UI and wires most interactions through inline `onclick` and `onchange` attributes.

Main DOM surfaces:

- `#myDiv`: main Plotly 3D Bloch sphere.
- `#rabi_div`: secondary Plotly 2D pulse transition probability plot.
- Rotation controls for x, y, and z axes.
- Custom-axis rotation inputs.
- Gate buttons for Pauli, Hadamard, phase, and T gates.
- Pulse controls for detuning, phase, amplitude, and pulse length.
- Settings for spin color, phosphor trace color, state labels, history trace length, and export size.

Important event bindings:

- Init: `restart()`
- Undo: `undo()`
- Axis rotations: `rotate_state(axis, angle)`
- Custom rotation: `custom_rotate_state()`
- Gates: mostly `rotate_state(...)`, with Hadamard using `hadamard()`
- Pulse plot changes: `rabi_plot()`
- Pulse application: `pulse_apply(axis)`
- Spin color change: `update_state_plot()`
- Pole label changes: `BLOCHSPHERE = gen_bloch_sphere(); update_state_plot(full_update=true)`
- Download: `export_png()`

### `ui.js`

`ui.js` is the application coordinator. It creates the initial global state, invokes the first render, and exposes global handlers called by `index.html`.

Global state initialized here:

- `QMSTATEVECTOR`: array of math.js 2-element state vectors. The last entry is the current qubit state.
- `BLOCHSPHERE`: static Plotly traces for sphere, grid, axes, labels, and equator plane.
- `STATEARROW`: current Plotly traces for the state arrow.
- `PHOSPHOR`: array of Plotly line traces representing per-operation trajectories.
- `PHOSPHOR_ENABLED`: boolean controlling whether history traces are rendered.

Core handlers:

- `rotate_state(axis, angle)`: applies a rotation, stores the new state, creates a trajectory trace, and rerenders.
- `pulse_apply(axis)`: reads pulse controls, applies a pulse, stores the new state, creates a pulse trajectory, and rerenders.
- `hadamard()`: builds a custom operator and delegates to `rotate_state(...)`.
- `custom_rotate_state()`: builds a custom-axis operator from DOM inputs and delegates to `rotate_state(...)`.
- `undo()`: pops the last quantum state and last phosphor trace, then rerenders.
- `restart()`: resets state and rerenders from scratch.
- `export_png()`: downloads the main Plotly plot as a PNG.

### `quantum.js`

`quantum.js` is the math engine, but it also contains DOM and Plotly trace concerns.

Math functions:

- `gen_state(up_is_true)`: returns `|0>` as `[1, 0]` or `|1>` as `[0, 1]`.
- `state2vector(state)`: converts a 2-element complex state vector into Bloch coordinates `[u, v, w]`.
- `rot(axis_op, angle, ...state)`: builds a unitary rotation from an axis string or operator matrix. If a state is provided, returns the transformed state; otherwise returns the rotation operator.
- `pulse(axis, time, state)`: builds a pulse Hamiltonian from current DOM controls and applies its matrix exponential to the state.

Trajectory generation:

- `rot_phosphor(axis_op, angle, state, divider)`: samples intermediate rotated states and pushes a Plotly `scatter3d` line trace into global `PHOSPHOR`.
- `pulse_phosphor(axis, time, state, divider)`: samples intermediate pulse states and pushes a Plotly `scatter3d` line trace into global `PHOSPHOR`.

Secondary plotting:

- `rabi_plot(data = null)`: computes a transition probability curve from DOM pulse controls and renders it into `#rabi_div` with `Plotly.react`.

### `plot.js`

`plot.js` builds Plotly traces and renders the main Bloch sphere.

Rendering functions:

- `init_plotting(data)`: creates the Plotly layout/config and calls `Plotly.react('myDiv', data, layout, config)`.
- `update_state_plot(full_update = false)`: computes the latest Bloch vector, regenerates arrow traces, slices visible phosphor history, concatenates all traces, and calls `init_plotting(...)`.

Trace factories:

- `gen_bloch_sphere()`: creates static sphere, gridline, equator, axis, and pole-label traces.
- `gen_vector_plot(vector, normalize = true)`: creates the state arrow as a Plotly cone plus surface cylinder.
- `cylinder_axes(v, k = [2, 0, 0])`: derives perpendicular basis vectors used to draw the arrow cylinder.

Trace order used by main render:

1. `BLOCHSPHERE`: 6 static traces.
2. `new_data` / `STATEARROW`: 2 current arrow traces.
3. `phosphor_data`: 0 or more trajectory traces.

### `helper.js`

`helper.js` contains generic helpers:

- `linspace(a, b, n)`: numeric range.
- `meshgrid(a, b)`: 2D coordinate grid generation.
- `print2d(arr)`: console diagnostic helper.
- `assert(condition, message)`: minimal assertion helper.
- `combine(a1, a2)`: combines arrays using non-null entries.

`linspace` and `meshgrid` are active dependencies of sphere generation and Rabi plotting. `combine`, `assert`, and `print2d` are not central to the current main flow.

## State Representation

The canonical quantum state is `QMSTATEVECTOR`, an array of math.js matrices:

```js
QMSTATEVECTOR = [gen_state(true)];
```

Each entry is expected to be a length-2 state vector representing a single pure qubit:

```js
math.matrix([alpha, beta])
```

The current state is always:

```js
QMSTATEVECTOR[QMSTATEVECTOR.length - 1]
```

The rendered 3D state is derived, not canonical:

```js
state2vector(currentState) -> [u, v, w]
```

Visual history is stored separately in `PHOSPHOR`, an array of Plotly traces. There is no explicit operation model, command log, metadata object, timestamp, label, or immutable snapshot format.

## Gate Application Pipeline

For normal rotations and most gates:

1. A UI event calls `rotate_state(axis, angle)`.
2. `rotate_state` reads the current state from the tail of `QMSTATEVECTOR`.
3. `rot(axis, angle, currentState)` creates an operator with math.js matrix exponential and applies it.
4. The new math.js state matrix is pushed to `QMSTATEVECTOR`.
5. `rot_phosphor(...)` samples intermediate states and pushes a Plotly trajectory trace to `PHOSPHOR`.
6. `update_state_plot()` redraws the main plot.

Hadamard and custom-axis rotation first construct a matrix operator, then call the same `rotate_state(operator, angle)` path.

Pulse application follows a parallel path:

1. `pulse_apply(axis)` reads `#pulselength`.
2. `pulse(axis, time, currentState)` reads detuning, amplitude, and phase from the DOM and applies the pulse operator.
3. The new state is pushed to `QMSTATEVECTOR`.
4. `pulse_phosphor(...)` samples intermediate pulse states and pushes a trajectory trace.
5. `update_state_plot()` redraws.

## Render And Update Pipeline

Initial render:

```text
ui.js load
  -> gen_state(true)
  -> gen_bloch_sphere()
  -> state2vector(current state)
  -> gen_vector_plot(...)
  -> init_plotting(BLOCHSPHERE + STATEARROW + PHOSPHOR)
  -> rabi_plot()
```

Main plot update:

```text
update_state_plot()
  -> state2vector(current state)
  -> gen_vector_plot(point_vector)
  -> choose PHOSPHOR slice using #phosphor_length
  -> init_plotting(BLOCHSPHERE + current arrow + visible phosphor)
  -> Plotly.react('myDiv', ...)
```

Secondary Rabi plot update:

```text
rabi_plot()
  -> read #pulselength, #detuning, #amplitude
  -> compute transition probability
  -> Plotly.react('rabi_div', ...)
```

`full_update` is accepted by `update_state_plot` but currently does not alter behavior.

## Event Handlers

Most event handlers are inline in `index.html`, which makes the UI dependent on global function names.

State-mutating handlers:

- `rotate_state(...)`
- `custom_rotate_state()`
- `hadamard()`
- `pulse_apply(...)`
- `undo()`
- `restart()`

Render-only or mostly render handlers:

- `update_state_plot()`
- `rabi_plot()`
- `gen_bloch_sphere(); update_state_plot(...)` for pole label changes.
- `export_png()` for image download.

## History Storage

There are two separate history concepts:

- Quantum state history: `QMSTATEVECTOR`.
- Visual trajectory history: `PHOSPHOR`.

They are kept in sync by convention:

- Every successful `rotate_state` push should correspond to one `PHOSPHOR` push.
- Every successful `pulse_apply` push should correspond to one `PHOSPHOR` push.
- `undo()` pops one item from both arrays.

Important limitations:

- The initial state has no matching `PHOSPHOR` entry.
- Operation metadata is not stored.
- Intermediate trajectory samples are stored only as Plotly traces, not as quantum states or semantic snapshots.
- Changing `#phosphor_length` affects only rendering, not stored history.
- Restart discards all history.

## Math Engine

The math engine is math.js plus hand-written quantum operations:

- Complex numbers: `math.complex`, `math.conj`, `math.re`, `math.im`.
- Matrices: `math.matrix`, `math.multiply`, `math.add`.
- Matrix exponentials: `math.expm`.
- Vector helpers: `math.dot`, `math.cross`, `math.norm`, `math.map`, `math.dotMultiply`.

The implementation assumes a single pure qubit. State conversion and operator construction are hard-coded for 2-element vectors and 2x2 matrices.

## Call Graph: User Action To Render

### Axis Rotation

```text
click axis button in index.html
  -> rotate_state(axis, angle)
    -> rot(axis, angle, currentState)
      -> build 2x2 axis operator
      -> math.expm(...)
      -> math.multiply(rotationOperator, currentState)
    -> QMSTATEVECTOR.push(newState)
    -> rot_phosphor(axis, angle, previousState, divider)
      -> repeated rot(...)
      -> repeated state2vector(...)
      -> PHOSPHOR.push(plotlyLineTrace)
    -> update_state_plot()
      -> state2vector(currentState)
      -> gen_vector_plot(...)
      -> PHOSPHOR.slice(...)
      -> init_plotting(...)
        -> Plotly.react('myDiv', ...)
```

### Hadamard

```text
click H in index.html
  -> hadamard()
    -> build custom opX/opZ combination
    -> rotate_state(rot_op, Math.PI)
    -> same rotate/render path as axis rotation
```

### Custom Axis Rotation

```text
click Apply rotation in index.html
  -> custom_rotate_state()
    -> read custom-axis DOM inputs
    -> build custom rotation axis operator
    -> rotate_state(rot_op, angle)
    -> same rotate/render path as axis rotation
```

### Pulse

```text
click Apply pulse in index.html
  -> pulse_apply(axis)
    -> read #pulselength
    -> pulse(axis, time, currentState)
      -> read detuning/amplitude/phase DOM inputs
      -> build pulse Hamiltonian
      -> math.expm(...)
      -> math.multiply(pulseOperator, currentState)
    -> QMSTATEVECTOR.push(newState)
    -> pulse_phosphor(axis, time, previousState, divider)
      -> repeated pulse(...)
      -> repeated state2vector(...)
      -> PHOSPHOR.push(plotlyLineTrace)
    -> update_state_plot()
      -> Plotly.react('myDiv', ...)
```

### Undo

```text
click Undo in index.html
  -> undo()
    -> QMSTATEVECTOR.pop()
    -> PHOSPHOR.pop()
    -> update_state_plot()
      -> Plotly.react('myDiv', ...)
```

### Restart

```text
click Init in index.html
  -> restart()
    -> QMSTATEVECTOR = [gen_state(true)]
    -> BLOCHSPHERE = gen_bloch_sphere()
    -> STATEARROW = gen_vector_plot(state2vector(currentState))
    -> PHOSPHOR = []
    -> PHOSPHOR_ENABLED = true
    -> init_plotting(BLOCHSPHERE + STATEARROW)
      -> Plotly.react('myDiv', ...)
```

### Settings

```text
change spin color
  -> update_state_plot()
  -> gen_vector_plot(...) reads #spin_color
  -> Plotly.react('myDiv', ...)
```

```text
change north/south text
  -> gen_bloch_sphere() reads label inputs
  -> BLOCHSPHERE = new static traces
  -> update_state_plot(...)
  -> Plotly.react('myDiv', ...)
```

