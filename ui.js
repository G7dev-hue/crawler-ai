const HISTORY_TRAIL_COLORS = [
    "#1565c0",
    "#2e7d32",
    "#c62828",
    "#6a1b9a",
    "#ef6c00",
    "#00838f",
    "#ad1457",
    "#558b2f",
    "#5d4037",
    "#283593"
];

var QMSTATEVECTOR = [gen_state(true)];
var BLOCHSPHERE =  gen_bloch_sphere();
var PHOSPHOR = [];
var PHOSPHOR_ENABLED = true;
var HISTORY = [createInitialHistoryEntry(QMSTATEVECTOR[0])];
var HISTORY_CURSOR = 0;
var STATEARROW = gen_vector_plot(state2vector(getCurrentState()));

init_plotting(BLOCHSPHERE.concat(STATEARROW).concat(PHOSPHOR));
// BLOCHSPHERE.concat(STATEARROW).concat(PHOSPHOR)
rabi_plot();
renderTimeline();
renderInspector();


function getCurrentState() {
    return QMSTATEVECTOR[HISTORY_CURSOR];
}

function renderApp() {
    update_state_plot();
    renderTimeline();
    renderInspector();
}

function truncateFutureHistory() {
    if (HISTORY_CURSOR < HISTORY.length - 1) {
        HISTORY = HISTORY.slice(0,HISTORY_CURSOR + 1);
        QMSTATEVECTOR = QMSTATEVECTOR.slice(0,HISTORY_CURSOR + 1);
        PHOSPHOR = PHOSPHOR.slice(0,HISTORY_CURSOR);
    }
}

function setHistoryCursor(index) {
    const parsedIndex = parseInt(index,10);
    if (Number.isNaN(parsedIndex)) {
        return;
    }
    HISTORY_CURSOR = Math.max(0,Math.min(parsedIndex,HISTORY.length - 1));
    renderApp();
}

function renderTimeline() {
    const slider = document.getElementById('history_slider');
    const steps = document.getElementById('history_steps');
    if (!slider || !steps) {
        return;
    }

    slider.max = HISTORY.length - 1;
    slider.value = HISTORY_CURSOR;
    steps.innerHTML = "";

    for (let i = 0; i < HISTORY.length; i++) {
        const entry = ensureHistoryEntryVisuals(HISTORY[i],i);
        const step = document.createElement('button');
        step.type = 'button';
        step.className = 'history-step' + (HISTORY_CURSOR === i ? ' active' : '');
        step.style.setProperty('--step-color',entry.color);
        step.title = plainStepMetadata(entry);
        step.onclick = function() { setHistoryCursor(i); };

        const stepNumber = document.createElement('span');
        stepNumber.className = 'history-step-number';
        stepNumber.textContent = entry.step;
        const stepLabel = document.createElement('span');
        stepLabel.className = 'history-step-label';
        stepLabel.textContent = entry.label;
        step.appendChild(stepNumber);
        step.appendChild(stepLabel);
        steps.appendChild(step);
    }
    renderHistoryLegend();
}

function getStepColor(step) {
    if (step === 0) {
        return "#455a64";
    }
    const colors = [getHistoryBaseColor()].concat(HISTORY_TRAIL_COLORS);
    return colors[(step - 1) % colors.length];
}

function getHistoryBaseColor() {
    const input = document.getElementById('phosphor_color');
    return input && input.value ? input.value : "#1a237e";
}

function ensureHistoryEntryVisuals(entry, index) {
    if (entry.step === undefined || entry.step === null) {
        entry.step = index;
    }
    if (!entry.color) {
        entry.color = getStepColor(entry.step);
    }
    return entry;
}

function getHistoryEntryForSegment(segmentIndex) {
    const historyIndex = segmentIndex + 1;
    if (historyIndex < 0 || historyIndex >= HISTORY.length) {
        return null;
    }
    return ensureHistoryEntryVisuals(HISTORY[historyIndex],historyIndex);
}

function renderHistoryLegend() {
    const legend = document.getElementById('history_legend');
    if (!legend) {
        return;
    }
    legend.innerHTML = "";

    for (let i = 0; i < HISTORY.length; i++) {
        const entry = ensureHistoryEntryVisuals(HISTORY[i],i);
        const item = document.createElement('div');
        item.className = 'history-legend-item' + (i > HISTORY_CURSOR ? ' future' : '');
        item.style.setProperty('--step-color',entry.color);
        item.title = plainStepMetadata(entry);

        const stepNumber = document.createElement('span');
        stepNumber.className = 'history-legend-step';
        stepNumber.textContent = entry.step;
        const swatch = document.createElement('span');
        swatch.className = 'history-legend-swatch';
        const operation = document.createElement('span');
        operation.className = 'history-legend-operation';
        operation.textContent = operationSummary(entry);

        item.appendChild(stepNumber);
        item.appendChild(swatch);
        item.appendChild(operation);
        legend.appendChild(item);
    }
}

function plainStepMetadata(entry) {
    const metadata = [
        "Step " + entry.step,
        "Operation: " + entry.label,
        "Kind: " + entry.kind
    ];
    if (entry.params && Object.keys(entry.params).length > 0) {
        metadata.push("Parameters: " + formatStepParams(entry.params));
    }
    if (entry.afterVector) {
        metadata.push("Bloch: " + formatBlochVector(entry.afterVector));
    }
    return metadata.join("\n");
}

function formatStepParams(params) {
    try {
        return JSON.stringify(params);
    }
    catch (error) {
        return "[complex parameters]";
    }
}

function createInitialHistoryEntry(initialState) {
    const step = 0;
    return {
        id: "init",
        step: step,
        kind: "init",
        label: "Init",
        color: getStepColor(step),
        params: {},
        beforeState: null,
        afterState: initialState,
        beforeVector: null,
        afterVector: state2vector(initialState),
        createdAt: new Date().toISOString()
    };
}

function complexParts(value) {
    if (typeof(value) === "number") {
        return {re: value, im: 0};
    }
    return {
        re: value.re || 0,
        im: value.im || 0
    };
}

function roundValue(value, digits=3) {
    const factor = Math.pow(10,digits);
    const rounded = Math.round(value * factor) / factor;
    return Object.is(rounded,-0) ? 0 : rounded;
}

function formatReal(value, digits=3) {
    return roundValue(value,digits).toString();
}

function formatComplex(value, digits=3) {
    const parts = complexParts(value);
    const re = roundValue(parts.re,digits);
    const im = roundValue(parts.im,digits);
    if (im === 0) {
        return re.toString();
    }
    if (re === 0) {
        return im + "i";
    }
    return re + (im >= 0 ? " + " : " - ") + Math.abs(im) + "i";
}

function probability(value) {
    const parts = complexParts(value);
    return parts.re * parts.re + parts.im * parts.im;
}

function phaseOf(value) {
    const parts = complexParts(value);
    return Math.atan2(parts.im,parts.re);
}

function formatPercent(value) {
    return formatReal(value * 100,2) + "%";
}

function formatRelativePhase(state) {
    const phase = relativePhaseValue(state);
    if (phase === null) {
        return "undefined";
    }
    return formatAngle(phase);
}

function relativePhaseValue(state) {
    const alpha = state['_data'][0];
    const beta = state['_data'][1];
    if (probability(alpha) === 0 || probability(beta) === 0) {
        return null;
    }
    let phase = phaseOf(beta) - phaseOf(alpha);
    while (phase <= -Math.PI) {
        phase += 2 * Math.PI;
    }
    while (phase > Math.PI) {
        phase -= 2 * Math.PI;
    }
    return phase;
}

function phaseDelta(beforePhase, afterPhase) {
    if (beforePhase === null || afterPhase === null) {
        return null;
    }
    let delta = afterPhase - beforePhase;
    while (delta <= -Math.PI) {
        delta += 2 * Math.PI;
    }
    while (delta > Math.PI) {
        delta -= 2 * Math.PI;
    }
    return delta;
}

function clamp(value, minValue, maxValue) {
    return Math.max(minValue,Math.min(value,maxValue));
}

function blochAngularDisplacement(beforeVector, afterVector) {
    const beforeNorm = math.norm(beforeVector,2);
    const afterNorm = math.norm(afterVector,2);
    if (beforeNorm === 0 || afterNorm === 0) {
        return 0;
    }
    const dot = math.dot(beforeVector,afterVector) / (beforeNorm * afterNorm);
    return Math.acos(clamp(dot,-1,1));
}

function stateAmplitudes(state) {
    return {
        alpha: state['_data'][0],
        beta: state['_data'][1]
    };
}

function stateProbabilities(state) {
    const amplitudes = stateAmplitudes(state);
    return {
        zero: probability(amplitudes.alpha),
        one: probability(amplitudes.beta)
    };
}

function analyzeTransition(beforeState, afterState) {
    const effectiveBeforeState = beforeState || afterState;
    const beforeAmplitudes = stateAmplitudes(effectiveBeforeState);
    const afterAmplitudes = stateAmplitudes(afterState);
    const beforeProbabilities = stateProbabilities(effectiveBeforeState);
    const afterProbabilities = stateProbabilities(afterState);
    const beforeVector = state2vector(effectiveBeforeState);
    const afterVector = state2vector(afterState);
    const beforePhase = relativePhaseValue(effectiveBeforeState);
    const afterPhase = relativePhaseValue(afterState);

    return {
        amplitudes: {
            before: beforeAmplitudes,
            after: afterAmplitudes
        },
        probabilities: {
            before: beforeProbabilities,
            after: afterProbabilities,
            deltaZero: afterProbabilities.zero - beforeProbabilities.zero,
            deltaOne: afterProbabilities.one - beforeProbabilities.one
        },
        relativePhase: {
            before: beforePhase,
            after: afterPhase,
            delta: phaseDelta(beforePhase,afterPhase)
        },
        bloch: {
            before: beforeVector,
            after: afterVector,
            angularDisplacement: blochAngularDisplacement(beforeVector,afterVector)
        }
    };
}

function formatSignedPercent(value) {
    const rounded = roundValue(value * 100,2);
    if (rounded > 0) {
        return "+" + rounded + "%";
    }
    return rounded + "%";
}

function formatPhaseValue(value) {
    return value === null ? "undefined" : formatAngle(value);
}

function closeTo(value, target, tolerance=0.001) {
    return Math.abs(value - target) <= tolerance;
}

function normalizedAngle(value) {
    let angle = value;
    while (angle < 0) {
        angle += 2 * Math.PI;
    }
    while (angle >= 2 * Math.PI) {
        angle -= 2 * Math.PI;
    }
    return angle;
}

function formatAngle(value) {
    if (value === null) {
        return "undefined";
    }
    const sign = value < 0 ? "-" : "";
    const magnitude = Math.abs(value);
    const candidates = [
        {value: 0, label: "0"},
        {value: Math.PI / 4, label: "π/4"},
        {value: Math.PI / 2, label: "π/2"},
        {value: 3 * Math.PI / 4, label: "3π/4"},
        {value: Math.PI, label: "π"},
        {value: 5 * Math.PI / 4, label: "5π/4"},
        {value: 3 * Math.PI / 2, label: "3π/2"},
        {value: 7 * Math.PI / 4, label: "7π/4"},
        {value: 2 * Math.PI, label: "2π"}
    ];

    for (let i = 0; i < candidates.length; i++) {
        if (closeTo(magnitude,candidates[i].value)) {
            return candidates[i].label === "0" ? "0 rad" : sign + candidates[i].label + " rad";
        }
    }
    return formatReal(value,3) + " rad";
}

function canonicalStateName(state) {
    const probs = stateProbabilities(state);
    const phase = relativePhaseValue(state);
    if (closeTo(probs.zero,1) && closeTo(probs.one,0)) {
        return "|0⟩";
    }
    if (closeTo(probs.zero,0) && closeTo(probs.one,1)) {
        return "|1⟩";
    }
    if (!closeTo(probs.zero,0.5) || !closeTo(probs.one,0.5) || phase === null) {
        return null;
    }

    const angle = normalizedAngle(phase);
    if (closeTo(angle,0) || closeTo(angle,2 * Math.PI)) {
        return "|+⟩";
    }
    if (closeTo(angle,Math.PI)) {
        return "|−⟩";
    }
    if (closeTo(angle,Math.PI / 2)) {
        return "|+i⟩";
    }
    if (closeTo(angle,3 * Math.PI / 2)) {
        return "|−i⟩";
    }
    return null;
}

function symbolicKet(state) {
    const canonical = canonicalStateName(state);
    if (canonical) {
        return canonical;
    }
    const amplitudes = stateAmplitudes(state);
    return formatComplex(amplitudes.alpha) + "|0⟩ + " + formatComplex(amplitudes.beta) + "|1⟩";
}

function blochAxisName(vector) {
    const axes = [
        {name: "+X", vector: [1,0,0]},
        {name: "-X", vector: [-1,0,0]},
        {name: "+Y", vector: [0,1,0]},
        {name: "-Y", vector: [0,-1,0]},
        {name: "+Z", vector: [0,0,1]},
        {name: "-Z", vector: [0,0,-1]}
    ];

    for (let i = 0; i < axes.length; i++) {
        if (blochAngularDisplacement(vector,axes[i].vector) < 0.001) {
            return axes[i].name;
        }
    }
    return null;
}

function formatBlochVector(vector) {
    const axis = blochAxisName(vector);
    const coords = "(" + vector.map(function(value) { return formatReal(value); }).join(", ") + ")";
    return axis ? axis + " " + coords : coords;
}

function formatProbabilities(probs) {
    return "|0⟩ " + formatPercent(probs.zero) + ", |1⟩ " + formatPercent(probs.one);
}

function operationSummary(entry) {
    const parts = [entry.label];
    if (entry.params && entry.params.angle !== undefined) {
        parts.push("angle " + formatAngle(entry.params.angle));
    }
    if (entry.params && entry.params.polar !== undefined) {
        parts.push("polar " + formatAngle(entry.params.polar));
    }
    if (entry.params && entry.params.azimuth !== undefined) {
        parts.push("azimuth " + formatAngle(entry.params.azimuth));
    }
    if (entry.params && entry.params.time !== undefined) {
        parts.push("time " + entry.params.time);
    }
    return parts.join(", ");
}

function describeTransition(entry) {
    if (!entry.beforeState) {
        return [
            {title: "Before", body: "No prior state. This is the initial snapshot."},
            {title: "Operation", body: "Initialize the system."},
            {title: "After", body: symbolicKet(entry.afterState) + " at " + formatBlochVector(entry.afterVector) + "; probabilities " + formatProbabilities(stateProbabilities(entry.afterState)) + "."},
            {title: "What changed", body: "The history starts at the north pole with no transition yet."},
            {title: "Interpretation", body: "This establishes the reference state for subsequent operations."}
        ];
    }
    const analysis = analyzeTransition(entry.beforeState,entry.afterState);

    return [
        {
            title: "Before",
            body: symbolicKet(entry.beforeState) + " at " + formatBlochVector(analysis.bloch.before) + "; probabilities " + formatProbabilities(analysis.probabilities.before) + "; relative phase " + formatPhaseValue(analysis.relativePhase.before) + "."
        },
        {
            title: "Operation",
            body: operationSummary(entry) + "."
        },
        {
            title: "After",
            body: symbolicKet(entry.afterState) + " at " + formatBlochVector(analysis.bloch.after) + "; probabilities " + formatProbabilities(analysis.probabilities.after) + "; relative phase " + formatPhaseValue(analysis.relativePhase.after) + "."
        },
        {
            title: "What changed",
            body: "|0⟩ changed by " + formatSignedPercent(analysis.probabilities.deltaZero) + ", |1⟩ changed by " + formatSignedPercent(analysis.probabilities.deltaOne) + "; phase changed by " + formatPhaseValue(analysis.relativePhase.delta) + "; Bloch angle moved " + formatAngle(analysis.bloch.angularDisplacement) + "."
        },
        {
            title: "Interpretation",
            body: transitionInterpretation(analysis)
        }
    ];
}

function transitionInterpretation(analysis) {
    const probabilityShift = Math.abs(analysis.probabilities.deltaZero) + Math.abs(analysis.probabilities.deltaOne);
    const phaseShift = analysis.relativePhase.delta === null ? 0 : Math.abs(analysis.relativePhase.delta);
    const movement = analysis.bloch.angularDisplacement;

    if (movement < 0.001) {
        return "the selected operation leaves the observable Bloch state effectively unchanged.";
    }
    if (probabilityShift < 0.001 && phaseShift >= 0.001) {
        return "the state mainly changes phase while keeping the measurement probabilities stable.";
    }
    if (probabilityShift >= 0.001 && phaseShift < 0.001) {
        return "the state mainly redistributes population between |0⟩ and |1⟩.";
    }
    return "the state changes both population balance and relative phase.";
}

function renderTransitionExplanation(entry) {
    const explanation = document.getElementById('transition_explanation');
    if (!explanation) {
        return;
    }
    explanation.innerHTML = "";
    const sections = describeTransition(entry);
    for (let i = 0; i < sections.length; i++) {
        const section = document.createElement('div');
        section.className = 'transition-section';
        const title = document.createElement('div');
        title.className = 'transition-section-title';
        title.textContent = sections[i].title;
        const body = document.createElement('p');
        body.textContent = sections[i].body;
        section.appendChild(title);
        section.appendChild(body);
        explanation.appendChild(section);
    }
}

function renderInspector() {
    const operation = document.getElementById('inspector_operation');
    const ket = document.getElementById('inspector_ket');
    const probabilities = document.getElementById('inspector_probabilities');
    const bloch = document.getElementById('inspector_bloch');
    const phase = document.getElementById('inspector_phase');
    if (!operation || !ket || !probabilities || !bloch || !phase) {
        return;
    }

    const entry = ensureHistoryEntryVisuals(HISTORY[HISTORY_CURSOR],HISTORY_CURSOR);
    const state = getCurrentState();
    const alpha = state['_data'][0];
    const beta = state['_data'][1];
    const vector = entry.afterVector || state2vector(state);

    operation.textContent = "Step " + entry.step + ": " + entry.label;
    ket.textContent = symbolicKet(state);
    probabilities.textContent = "|0⟩: " + formatPercent(probability(alpha)) + ", |1⟩: " + formatPercent(probability(beta));
    bloch.textContent = formatBlochVector(vector);
    phase.textContent = formatRelativePhase(state);
    renderTransitionExplanation(entry);
}

function appendHistoryEntry(kind, label, params, beforeState, afterState) {
    const step = HISTORY.length;
    const entry = {
        id: "op-" + step,
        step: step,
        kind: kind,
        label: label,
        color: getStepColor(step),
        params: params,
        beforeState: beforeState,
        afterState: afterState,
        beforeVector: state2vector(beforeState),
        afterVector: state2vector(afterState),
        createdAt: new Date().toISOString()
    };
    HISTORY.push(entry);
    HISTORY_CURSOR = HISTORY.length - 1;
    console.log("Applied operation:", entry);
    return entry;
}

function operationLabel(axis, angle) {
    if (typeof(axis) === "string") {
        return "R" + axis + "(" + formatAngle(angle) + ")";
    }
    return "Custom rotation";
}

function rotate_state(axis,angle,metadata={}) {
    truncateFutureHistory();
    const beforeState = getCurrentState();
    const afterState = rot(axis,angle,beforeState);
    QMSTATEVECTOR.push(afterState);
    const entry = appendHistoryEntry(
        metadata.kind || "rotation",
        metadata.label || operationLabel(axis, angle),
        metadata.params || {axis: axis, angle: angle},
        beforeState,
        afterState
    );
    rot_phosphor(axis,angle,beforeState,Math.max(6,Math.round(angle/(0.5*math.PI)*10)),entry);
    renderApp();
}


function pulse_apply(axis){
    truncateFutureHistory();
    const time = document.getElementById('pulselength').value;
    const beforeState = getCurrentState();
    const afterState = pulse(axis,time,beforeState);
    QMSTATEVECTOR.push(afterState);
    const entry = appendHistoryEntry(
        "pulse",
        "Pulse " + axis,
        {axis: axis, time: time},
        beforeState,
        afterState
    );
    pulse_phosphor(axis,time,beforeState,Math.max(6,Math.round(time/0.01)),entry);
    renderApp();
  }
  


function export_png() {
    var currentdate = new Date(); 
    var datetime =  currentdate.getFullYear() + "-" + (currentdate.getMonth()+1)  + "-" + currentdate.getDate() + "_" + currentdate.getHours() + '- ' + currentdate.getMinutes() + '-' + currentdate.getSeconds();
    Plotly.downloadImage('myDiv', {format: 'png', width: document.getElementById('export_size').value, height: document.getElementById('export_size').value, filename: datetime});
}

function hadamard(){
    const opX = math.matrix([[0,math.complex(0.5,0)],[math.complex(0.5,0),0]]);
    const opZ = math.matrix([[math.complex(0.5,0),0],[0,math.complex(-0.5,0)]]);

    
    const rot_op = math.add(math.multiply(opX,1/math.sqrt(2)),math.multiply(opZ,1/math.sqrt(2)));
    rotate_state(rot_op,math.PI,{
        kind: "gate",
        label: "Hadamard",
        params: {gate: "H", angle: math.PI}
    });
}


function custom_rotate_state(){
    const opX = math.matrix([[0,math.complex(0.5,0)],[math.complex(0.5,0),0]]);
    const opY =  math.matrix([[0,math.complex(0,-0.5)],[math.complex(0,0.5),0]]);
    const opZ = math.matrix([[math.complex(0.5,0),0],[0,math.complex(-0.5,0)]]);
    const polar = document.getElementById('custom_axis_polar').value/180*math.PI;
    const azimuth = document.getElementById('custom_axis_azimuth').value/180*math.PI;
    const angle = document.getElementById('custom_axis_rot_angle').value/180*math.PI;

    let rot_op = math.multiply(math.cos(polar),opZ);
    rot_op = math.add(rot_op,math.multiply(math.sin(polar)*math.cos(azimuth),opX));
    rot_op = math.add(rot_op,math.multiply(math.sin(polar)*math.sin(azimuth),opY));
    
    rotate_state(rot_op,angle,{
        kind: "rotation",
        label: "Custom rotation",
        params: {polar: polar, azimuth: azimuth, angle: angle}
    });
}


function undo() {
    if (HISTORY_CURSOR > 0){
        truncateFutureHistory();
        QMSTATEVECTOR.pop();
        PHOSPHOR.pop();
        HISTORY.pop();
        HISTORY_CURSOR = HISTORY.length - 1;
        renderApp();
    }

}

function restart() {
    QMSTATEVECTOR = [gen_state(true)];
    BLOCHSPHERE =  gen_bloch_sphere();
    PHOSPHOR = [];
    PHOSPHOR_ENABLED = true;
    HISTORY = [createInitialHistoryEntry(QMSTATEVECTOR[0])];
    HISTORY_CURSOR = 0;
    STATEARROW = gen_vector_plot(state2vector(getCurrentState()));
    init_plotting(BLOCHSPHERE.concat(STATEARROW).concat(PHOSPHOR));
    renderTimeline();
    renderInspector();
}
