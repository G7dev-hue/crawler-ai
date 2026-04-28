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


function getCurrentState() {
    return QMSTATEVECTOR[HISTORY_CURSOR];
}

function renderApp() {
    update_state_plot();
    renderTimeline();
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
    STATEARROW = gen_vector_plot(state2vector(getCurrentState()));
    PHOSPHOR = [];
    PHOSPHOR_ENABLED = true;
    HISTORY = [createInitialHistoryEntry(QMSTATEVECTOR[0])];
    HISTORY_CURSOR = 0;
    init_plotting(BLOCHSPHERE.concat(STATEARROW).concat(PHOSPHOR));
    renderTimeline();
}
