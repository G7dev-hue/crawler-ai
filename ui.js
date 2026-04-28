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
        const entry = HISTORY[i];
        const step = document.createElement('button');
        step.type = 'button';
        step.className = 'history-step' + (HISTORY_CURSOR === i ? ' active' : '');
        step.textContent = i + ': ' + entry.label;
        step.onclick = function() { setHistoryCursor(i); };
        steps.appendChild(step);
    }
}

function createInitialHistoryEntry(initialState) {
    return {
        id: "init",
        kind: "init",
        label: "Init",
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
    return formatReal(phase,3) + " rad";
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
    return value === null ? "undefined" : formatReal(value,3) + " rad";
}

function describeTransition(entry) {
    if (!entry.beforeState) {
        return [
            "Probability redistribution: initialized at " + formatPercent(1) + " in |0⟩ and " + formatPercent(0) + " in |1⟩.",
            "Phase shift: no relative phase is defined because |1⟩ has zero amplitude.",
            "Bloch sphere movement: initial state is placed at x: 0, y: 0, z: 1.",
            "Interpretation: this snapshot establishes the starting point for later transitions."
        ];
    }

    const analysis = analyzeTransition(entry.beforeState,entry.afterState);
    const probabilityText = "Probability redistribution: |0⟩ changed by " + formatSignedPercent(analysis.probabilities.deltaZero) + " and |1⟩ changed by " + formatSignedPercent(analysis.probabilities.deltaOne) + ".";
    const phaseText = "Phase shift: relative phase moved from " + formatPhaseValue(analysis.relativePhase.before) + " to " + formatPhaseValue(analysis.relativePhase.after) + ", change " + formatPhaseValue(analysis.relativePhase.delta) + ".";
    const blochText = "Bloch sphere movement: vector moved from (" + analysis.bloch.before.map(function(value) { return formatReal(value); }).join(", ") + ") to (" + analysis.bloch.after.map(function(value) { return formatReal(value); }).join(", ") + "), angular displacement " + formatReal(analysis.bloch.angularDisplacement,3) + " rad.";
    const interpretationText = "Interpretation: " + transitionInterpretation(analysis);
    return [probabilityText, phaseText, blochText, interpretationText];
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
    const lines = describeTransition(entry);
    for (let i = 0; i < lines.length; i++) {
        const paragraph = document.createElement('p');
        paragraph.textContent = lines[i];
        explanation.appendChild(paragraph);
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

    const entry = HISTORY[HISTORY_CURSOR];
    const state = getCurrentState();
    const alpha = state['_data'][0];
    const beta = state['_data'][1];
    const vector = entry.afterVector || state2vector(state);

    operation.textContent = entry.label;
    ket.textContent = formatComplex(alpha) + "|0⟩ + " + formatComplex(beta) + "|1⟩";
    probabilities.textContent = "|0⟩: " + formatPercent(probability(alpha)) + ", |1⟩: " + formatPercent(probability(beta));
    bloch.textContent = "x: " + formatReal(vector[0]) + ", y: " + formatReal(vector[1]) + ", z: " + formatReal(vector[2]);
    phase.textContent = formatRelativePhase(state);
    renderTransitionExplanation(entry);
}

function appendHistoryEntry(kind, label, params, beforeState, afterState) {
    const entry = {
        id: "op-" + HISTORY.length,
        kind: kind,
        label: label,
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
        return "R" + axis + "(" + angle + ")";
    }
    return "Custom rotation";
}

function rotate_state(axis,angle,metadata={}) {
    truncateFutureHistory();
    const beforeState = getCurrentState();
    const afterState = rot(axis,angle,beforeState);
    QMSTATEVECTOR.push(afterState);
    rot_phosphor(axis,angle,beforeState,Math.max(6,Math.round(angle/(0.5*math.PI)*10)));
    appendHistoryEntry(
        metadata.kind || "rotation",
        metadata.label || operationLabel(axis, angle),
        metadata.params || {axis: axis, angle: angle},
        beforeState,
        afterState
    );
    renderApp();
}


function pulse_apply(axis){
    truncateFutureHistory();
    const time = document.getElementById('pulselength').value;
    const beforeState = getCurrentState();
    const afterState = pulse(axis,time,beforeState);
    QMSTATEVECTOR.push(afterState);
    pulse_phosphor(axis,time,beforeState,Math.max(6,Math.round(time/0.01)));
    appendHistoryEntry(
        "pulse",
        "Pulse " + axis,
        {axis: axis, time: time},
        beforeState,
        afterState
    );
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
