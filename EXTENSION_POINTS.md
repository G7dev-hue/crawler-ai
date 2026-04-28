# Extension Points

This document identifies the safest places to extend the current codebase without first rewriting the whole app. The current architecture is small, but it is browser-global and tightly coupled, so extensions should start by introducing explicit boundaries around state, operations, and rendering.

## Current Boundaries

Useful existing boundaries:

- `rotate_state(axis, angle)` is the main operation entry point for gates and rotations.
- `pulse_apply(axis)` is the main operation entry point for pulses.
- `update_state_plot()` is the main redraw point.
- `gen_vector_plot(...)` and `gen_bloch_sphere()` are trace factories.
- `state2vector(...)`, `rot(...)`, and `pulse(...)` are the core math functions.

Weak boundaries:

- Math functions read DOM controls.
- Math functions mutate visual history.
- UI handlers are global functions referenced by inline HTML.
- Plotting reads global state and DOM controls.
- History is split between quantum states and Plotly traces.

## Best Extension Point: Operation Dispatcher

Before adding larger features, introduce one central operation function in front of `rotate_state` and `pulse_apply`.

Target shape:

```js
applyOperation({
  type: 'rotation',
  label: 'Rx(90)',
  params: { axis: 'x', angle: Math.PI / 2 }
});
```

This dispatcher should:

- Read the current state.
- Compute the next state.
- Compute any trajectory samples.
- Append a structured history entry.
- Trigger all renders.

Benefits:

- Snapshot timeline can listen to one path.
- Explanation panel can describe one operation model.
- History scrubber can address entries by index.
- Undo can move a cursor instead of destructively popping arrays.

## Snapshot Timeline

### Best Current Hook

Hook immediately after state mutation in:

- `rotate_state(...)`
- `pulse_apply(...)`
- `restart()`
- `undo()`

### Recommended Model

Add structured snapshots instead of relying on `QMSTATEVECTOR` plus `PHOSPHOR` alone:

```js
{
  id: 'op-3',
  index: 3,
  label: 'Rx(90)',
  kind: 'rotation',
  params: { axis: 'x', angle: 1.57079632679 },
  beforeState: math.matrix(...),
  afterState: math.matrix(...),
  beforeVector: [u, v, w],
  afterVector: [u, v, w],
  trajectory: [[u, v, w], ...],
  createdAt: Date.now()
}
```

### Implementation Path

1. Create `HISTORY = []` and `HISTORY_CURSOR = 0`.
2. Make `rotate_state` and `pulse_apply` append operation entries.
3. Derive visible state from `HISTORY_CURSOR`, not always from the last array entry.
4. Render the timeline from `HISTORY`.
5. Make undo decrement the cursor first; destructive trimming can be a separate command.

### Risk

If the timeline reads directly from `PHOSPHOR`, it will only have visual traces, not operation semantics. That would make labels, explanations, and scrubber state harder to implement.

## Multi-Qubit Support

### Best Current Hook

The current math engine is not ready for multi-qubit support as a small patch. The key replacement points are:

- `QMSTATEVECTOR` shape in `ui.js`
- `gen_state(...)`
- `state2vector(...)`
- `rot(...)`
- Gate definitions in `ui.js`
- Render assumptions in `gen_vector_plot(...)`

### Required Architectural Shift

Multi-qubit support needs a new state model:

```js
{
  numQubits: 2,
  amplitudes: math.matrix([a00, a01, a10, a11])
}
```

For `n` qubits, the state vector has `2 ** n` amplitudes. Single-qubit gates require tensor expansion to the full Hilbert space. Controlled gates require explicit full-system operators or specialized state-vector transforms.

### Rendering Choices

Bloch spheres represent single-qubit pure states directly. For multi-qubit systems, choose one of these product decisions:

- Render one reduced Bloch vector per qubit using density matrices and partial trace.
- Render only separable/product states and keep one Bloch sphere per qubit.
- Add a separate amplitude/probability view for the full state.
- Add entanglement indicators when a qubit's reduced state is mixed.

### Recommended First Step

Extract single-qubit math into a `QuantumEngine` boundary before adding multi-qubit logic:

```js
QuantumEngine.applyGate(state, gate, targets)
QuantumEngine.toBlochVector(state, qubitIndex)
QuantumEngine.makeInitialState(numQubits)
```

Then keep the existing single-qubit behavior as the `numQubits === 1` case.

### Risk

Trying to retrofit multi-qubit support into `state2vector` and `rot` directly will spread dimension checks throughout the code and make rendering ambiguous.

## Explanation Panel

### Best Current Hook

Use the same operation dispatcher recommended above. If a dispatcher is not added yet, hook into:

- `rotate_state(...)`
- `pulse_apply(...)`
- `hadamard()`
- `custom_rotate_state()`

### Recommended Data

An explanation panel should not infer meaning from raw matrices or button text. Store operation metadata at action time:

```js
{
  label: 'Hadamard',
  description: 'Rotates around the normalized X+Z axis by pi.',
  matrix: [[...], [...]],
  beforeStateText: '...',
  afterStateText: '...',
  blochVectorText: '...',
  formula: '...'
}
```

### Rendering Hook

Add a separate UI update after state mutation:

```js
renderExplanation(currentHistoryEntry);
```

This should run beside `update_state_plot()`, not inside Plotly trace generation.

### Risk

If explanations are embedded in `gen_vector_plot` hover text, they will be hard to test, hard to format, and tied to the 3D renderer.

## State History Scrubber

### Best Current Hook

The scrubber should target a history cursor rather than mutating arrays. Current code always renders `QMSTATEVECTOR[QMSTATEVECTOR.length - 1]`, so the first required change is a function that returns the selected current state.

Target boundary:

```js
getCurrentState()
setHistoryCursor(index)
renderApp()
```

### Recommended Behavior

- Keep full history in memory.
- Use `HISTORY_CURSOR` to select which snapshot is currently shown.
- When the user applies a new operation from an earlier cursor, truncate future history or branch it explicitly.
- Derive visible phosphor traces from entries up to the cursor.

### Current-Code Bridge

If implementing with minimal changes first:

1. Add `CURRENT_INDEX`.
2. Update `update_state_plot()` to use `QMSTATEVECTOR[CURRENT_INDEX]`.
3. Render `PHOSPHOR.slice(0, CURRENT_INDEX)` or a bounded tail from that slice.
4. Make operation application trim arrays after `CURRENT_INDEX` before pushing a new state.

This is not as clean as structured history, but it creates scrubber behavior with lower initial churn.

## Render Extension Points

### Main Plot

`update_state_plot()` is the right place to add render inputs that depend on current state:

- selected snapshot marker
- previous/future trajectory styling
- multiple qubit arrows
- overlays for target axes

### Static Sphere

`gen_bloch_sphere()` is the right place for static Bloch sphere changes:

- label customization
- axis styling
- additional reference circles
- alternate basis labels

### Secondary Plots

`rabi_plot()` is currently independent from main render except for shared pulse input controls. Add new secondary visualizations as separate render functions rather than expanding `rabi_plot()`.

## Event Handler Extension Points

Inline HTML handlers are usable for small additions but become costly as features grow.

Recommended next pattern:

```js
function bindUIEvents() {
  document.querySelector('[data-action="undo"]').addEventListener('click', undo);
}
```

Move new features to event listeners with `data-*` attributes, then migrate existing inline handlers gradually.

## Storage Extension Points

Current storage is in global memory only. For timeline and scrubber features, keep the first version in memory. For persistence or sharing later, add serialization:

```js
serializeHistory(HISTORY)
deserializeHistory(json)
```

Do not serialize math.js matrix internals directly. Convert states to plain arrays of `{ re, im }` complex values or strings.

## Specific Risks For Extensions

### Tightly Coupled Code

- `quantum.js` reads DOM inputs inside `pulse(...)`, `rabi_plot(...)`, `rot_phosphor(...)`, and `pulse_phosphor(...)`.
- `plot.js` reads DOM inputs inside trace factories.
- `ui.js` assumes global functions and global mutable variables.

Impact: features cannot easily reuse math in tests, workers, or alternative UI surfaces.

### Globals

Many variables are assigned without `let`, `const`, or `var`, which creates or mutates globals:

- `op`, `rot_op`, `r01`, `u`, `v`, `w`
- `time`, `detune`, `w1`, `Omega`
- `point_vector`, `new_data`, `phosphor_data`
- `north_text`, `south_text`

Impact: new code can accidentally overwrite existing runtime values.

### Hidden Assumptions

- State vectors have exactly two amplitudes.
- Operators are 2x2.
- Bloch vectors are nonzero and normalizable.
- `document.getElementById(...)` always finds controls.
- `PHOSPHOR` and `QMSTATEVECTOR` lengths remain aligned by convention.
- Plotly trace order is implicit and manually concatenated.
- math.js matrix internals are accessed through `state['_data']`.

### Single-Qubit Limitations

- `state2vector` only supports a two-level pure state.
- `gen_vector_plot` renders one arrow.
- `rot` only knows x/y/z single-qubit Pauli-like operators or a passed 2x2 matrix.
- Hadamard and custom-axis operators are hard-coded as 2x2 matrices.
- History assumes one current state, not per-qubit or full-register views.

## Recommended Extension Priority

1. Add structured operation history while preserving existing globals.
2. Add a single `renderApp()` function that updates plot, explanation, and timeline panels.
3. Add a history cursor for scrubber and undo.
4. Extract DOM reads from math functions.
5. Extract quantum operations into a pure engine.
6. Add multi-qubit state representation behind that engine.

