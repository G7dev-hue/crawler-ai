# Refactor Plan

The main goal is to make extension work possible without breaking the existing single-qubit Bloch sphere behavior. The safest path is incremental: preserve current UI behavior while introducing explicit state, operation, and render boundaries.

## Current High-Risk Areas

### Global Mutable State

Current globals include:

- `QMSTATEVECTOR`
- `BLOCHSPHERE`
- `STATEARROW`
- `PHOSPHOR`
- `PHOSPHOR_ENABLED`

Many temporary variables are also implicit globals because they are assigned without declaration.

Risk:

- New features can overwrite unrelated state.
- Tests are hard to isolate.
- Undo, scrubber, and timeline features have no single source of truth.

### DOM-Coupled Math

`pulse(...)`, `rabi_plot(...)`, `rot_phosphor(...)`, `pulse_phosphor(...)`, `gen_vector_plot(...)`, and `gen_bloch_sphere(...)` read DOM controls directly.

Risk:

- Math cannot be reused independently.
- Operation history cannot reliably capture the exact parameters used unless it reads the same DOM controls at the same moment.
- Multi-qubit work would mix state math with page controls.

### Split History Model

`QMSTATEVECTOR` stores state snapshots, while `PHOSPHOR` stores visual trajectory traces.

Risk:

- No operation names or parameters.
- No direct support for timeline labels.
- No robust history cursor.
- Undo assumes every operation adds exactly one phosphor trace.

### Single-Qubit Assumptions

The code assumes:

- 2-element state vectors.
- 2x2 operators.
- One current arrow.
- One Bloch vector.

Risk:

- Multi-qubit support is not a rendering-only change.
- Entangled states cannot be represented by one pure-state Bloch arrow per full state.

## Phase 1: Stabilize Existing Behavior

Scope: no user-visible feature changes.

1. Add explicit declarations for temporary variables with `let` and `const`.
2. Keep current globals but group them conceptually as app state.
3. Replace direct `QMSTATEVECTOR[QMSTATEVECTOR.length - 1]` reads with `getCurrentState()`.
4. Replace repeated render calls with `renderApp()` that delegates to existing plotting functions.

Target helpers:

```js
function getCurrentState() {
  return QMSTATEVECTOR[QMSTATEVECTOR.length - 1];
}

function renderApp() {
  update_state_plot();
}
```

Why this phase matters:

- It creates stable insertion points for timeline, explanation, and scrubber features.
- It reduces accidental globals before larger refactors.

## Phase 2: Introduce Structured History

Scope: support operation metadata while preserving `QMSTATEVECTOR` and `PHOSPHOR` temporarily.

Add:

```js
HISTORY = [];
HISTORY_CURSOR = 0;
```

Add operation entries:

```js
{
  type: 'rotation',
  label: 'Rx(90)',
  params: { axis: 'x', angle: Math.PI / 2 },
  beforeState,
  afterState,
  trajectory,
  trace
}
```

Refactor:

- `rotate_state(...)` creates a history entry.
- `pulse_apply(...)` creates a history entry.
- `undo()` moves `HISTORY_CURSOR` or pops via one helper.
- `restart()` resets all state through one helper.

Keep:

- Existing `QMSTATEVECTOR` array until the new history model proves equivalent.
- Existing `PHOSPHOR` rendering path initially.

Verification:

- Apply rotations, Hadamard, custom rotation, and pulses.
- Confirm the final Bloch vector and visible traces match pre-refactor behavior.
- Confirm undo and restart still work.

## Phase 3: Add Timeline And Scrubber Support

Scope: add navigation-ready state model.

Refactor current-state selection:

```js
function getCurrentSnapshot() {
  return HISTORY[HISTORY_CURSOR];
}
```

Render from cursor:

- Current state comes from selected snapshot.
- Visible phosphor traces are derived from entries up to `HISTORY_CURSOR`.
- Future operations can be hidden, dimmed, or shown separately.

Operation application from earlier history:

- Initial simple behavior: truncate future entries before appending.
- Later optional behavior: support branching timelines.

UI extension points:

- Timeline list renders from `HISTORY`.
- Scrubber input maps value to `HISTORY_CURSOR`.
- Explanation panel renders from `HISTORY[HISTORY_CURSOR]`.

## Phase 4: Separate Math From DOM

Scope: make quantum functions pure enough to test and reuse.

Change pulse APIs from DOM-reading functions:

```js
pulse(axis, time, state)
```

to parameterized functions:

```js
pulse(axis, time, state, { detuning, amplitude, phase })
```

Change plotting APIs from DOM-reading factories:

```js
gen_vector_plot(vector)
gen_bloch_sphere()
```

to parameterized factories:

```js
gen_vector_plot(vector, { color })
gen_bloch_sphere({ northText, southText })
```

Add UI readers:

```js
readPulseControls()
readRenderSettings()
readLabelSettings()
```

Benefits:

- Operation entries can store exact parameters.
- Tests can call math without DOM setup.
- Explanation panel can reuse operation data.

## Phase 5: Extract Render Pipeline

Scope: make main rendering explicit and extensible.

Introduce:

```js
function buildMainPlotData(appState) {
  return [...sphereTraces, ...arrowTraces, ...historyTraces];
}

function renderMainPlot(appState) {
  Plotly.react('myDiv', buildMainPlotData(appState), layout, config);
}
```

Move layout/config constants out of `init_plotting` so every render does not recreate them unnecessarily unless settings change.

Keep trace factories separate:

- `makeBlochSphereTraces(settings)`
- `makeStateArrowTraces(vector, settings)`
- `makeTrajectoryTrace(points, settings)`

Benefits:

- Multiple qubit arrows or multiple spheres can be added without changing operation math.
- Timeline selection can alter trace style in one place.

## Phase 6: Extract Quantum Engine

Scope: prepare for multi-qubit support.

Introduce an engine object or module-like namespace:

```js
QuantumEngine = {
  makeInitialState(numQubits),
  applyGate(state, gate),
  applyPulse(state, pulseParams),
  toBlochVector(state, qubitIndex),
  makeRotationGate(axis, angle)
};
```

For the first step, implement only existing single-qubit behavior behind this API.

Then add multi-qubit support:

- Represent state as `2 ** numQubits` amplitudes.
- Add tensor-product helpers.
- Add target qubit indexing.
- Add controlled gates if needed.
- Add reduced-density-matrix Bloch vector extraction for each qubit.

Important product decision:

Multi-qubit visualization must decide how to represent entanglement. One Bloch sphere per qubit can show reduced states, but it cannot fully encode the full multi-qubit state.

## Phase 7: Migrate Event Binding

Scope: reduce inline HTML coupling.

Add `data-action` and `data-*` attributes to controls, then bind listeners in JavaScript:

```html
<button data-action="rotate" data-axis="x" data-angle="1.57079632679">+90</button>
```

```js
document.addEventListener('click', handleCommandClick);
```

Benefits:

- UI can grow without many inline JavaScript expressions.
- New controls can share command handling.
- Operation metadata can be created consistently.

## Suggested File Evolution

The current five-file structure can remain at first. Once the boundaries are stable, split by responsibility:

- `app-state.js`: state, history, cursor, serialization.
- `commands.js`: operation dispatcher and command metadata.
- `quantum.js`: pure quantum engine.
- `plot.js`: Plotly trace and layout rendering.
- `ui.js`: DOM event binding and DOM control readers.
- `helper.js`: generic numeric utilities.

## Testing Strategy

Current repository has no automated tests. Add lightweight tests around pure functions once DOM coupling is reduced.

High-value tests:

- `gen_state(true)` returns `|0>`.
- `state2vector(|0>)` returns north pole.
- `state2vector(|1>)` returns south pole.
- `rot('x', Math.PI, |0>)` maps to the expected Bloch vector.
- Four quarter-turns return approximately to the original state.
- `applyOperation` appends exactly one history entry.
- Scrubbing to a prior index renders that state without deleting future history.

Use approximate equality for complex values and Bloch vectors.

## Practical First Pull Request

The smallest useful refactor PR should:

1. Add explicit `let`/`const` declarations in local scopes.
2. Add `getCurrentState()`.
3. Add `renderApp()` wrapping `update_state_plot()`.
4. Add a small structured `HISTORY` entry alongside existing `QMSTATEVECTOR` and `PHOSPHOR`.
5. Keep UI and visual output unchanged.

This sets up snapshot timeline, explanation panel, and scrubber work without taking on multi-qubit complexity immediately.

