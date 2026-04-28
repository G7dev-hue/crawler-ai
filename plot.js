function init_plotting(data) {

    const config = {
        displayModeBar: false, // hide toolbar
        responsive:true // resize 
    };

    var layout = {
        hovermode: 'closest',
        scene: {
            xaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            }, 
            yaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            },
            zaxis: {
                showspikes: false,
                showgrid: false,
                zeroline: false,
                showline: false,
                visible: false,
                ticks: '',
                showticklabels: false,
                range: [-1.1,1.1]
            },
            camera: {
                center: {
                    x:0, y:0,z:0
                },
                eye: {
                    x:-0.9, y:1, z:0.6
                },
                projection: 'perspective'
            }
        },
        showlegend: false,
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0
        },
        annotations: [
            {
                showarrow: false,
                text: 'bloch.kherb.io',
                x:1.0,
                y:0.0,
                xref: 'paper',
                yref: 'paper', 
                xanchor: 'right',
                yanchor: 'bottom',
                opacity: 0.4
            }
        ]
        
    };

    Plotly.react('myDiv', data, layout,config);
}

function cylinder_axes(v,k=[2,0,0]) {
    // v needs to be normalized, k must not be parallel to v
    // t is height
    //k = [2,0,0];
    //vp = (k+p2)-((k+p2)*p2)*p2;
    //c = vp/norm(vp);
    //p = (1-t)*p2 + c*d*cos(phi) + u*d*sin(phi);
    qp = math.subtract(k,math.dotMultiply(Array(3).fill(math.dot(v,k)),v));
    //console.log(qp);
    q = math.dotMultiply(qp,Array(3).fill(1/math.norm(qp,2)));
    //console.log("-----------");
    //console.log(q);
    p = math.cross(v,q);
    p = math.dotMultiply(p,Array(3).fill(1/math.norm(p,2)));
    //console.log("+++++++++++")
    //console.log(p);
    return [q,p]

}

function gen_vector_plot(vector,normalize=true) {
    color = document.getElementById('spin_color').value;
    [u,v,w] = vector;
    if (normalize === true) {
        l = math.sqrt(u**2+v**2+w**2);
        u = u/l;
        v = v/l;
        w = w/l;
    }
    //console.log("NUR ZUR SICHERHEIT");
    //console.log(u);
    //console.log(v);
    //console.log(w);
    hovertext = '|Ψ⟩ = |0⟩ + 0.5 |1⟩<extra></extra>';
    
    /*var upp = {
        name: 'stick',
        showscale: false,
        type: 'streamtube',
        hovertemplate: hovertext,
        sizeref: 0.5,
        u: [u*0.9],
        v: [v*0.9],
        w: [w*0.9],
        x: [0],
        y: [0],
        z: [0],
        starts: {
            x: 0,
            y: 0,
            z: 0
        }
        }
        */

        /*
        var upp = {
            name: 'stick',
            showscale: false,
            type: 'scatter3d',
            mode: 'lines',
            hovertemplate: hovertext,
            width: 5,
            x: [0,u*0.9],
            y: [0,v*0.9],
            z: [0,w*0.9],
            line: {color: '#000000', width:9},
            }
        */
        

        zax = [u,v,w];
        [q,p] = cylinder_axes(zax);
    
        xarr =Array(0);
        yarr = Array(0);
        zarr = Array(0);

        //console.log("q is");
        //console.log(q);
        //console.log("p is")
        //console.log(p);
        //console.log("zarr is");
        //console.log(zarr);
        
        //console.log("Jetzt kommt Schleife");
        for (var i = 0; i < 7; i++) {
            phi = 2*Math.PI*i/6;
            r = 0.025;
            l = 0.9
            //console.log(phi);
            //console.log(math.cos(phi));
            //console.log(q[0]*math.cos(phi)+p[0]*math.sin(phi));
            //console.log("############");
            xarr.push([(q[0]*math.cos(phi)+p[0]*math.sin(phi))*r,(q[0]*math.cos(phi)+p[0]*math.sin(phi))*r+zax[0]*l]);
            //xarr.push(q[0]*math.cos(phi)+p[0]*math.sin(phi)+zax[0]);

            yarr.push([(q[1]*math.cos(phi)+p[1]*math.sin(phi))*r,(q[1]*math.cos(phi)+p[1]*math.sin(phi))*r+zax[1]*l]);
            //yarr.push(q[1]*math.cos(phi)+p[1]*math.sin(phi)+zax[1]);

            zarr.push([(q[2]*math.cos(phi)+p[2]*math.sin(phi))*r,(q[2]*math.cos(phi)+p[2]*math.sin(phi))*r+zax[2]*l]);
            //zarr.push(q[2]*math.cos(phi)+p[2]*math.sin(phi)+zax[2]);
            
        }

        //console.log(xarr);
        //console.log(yarr);
        //console.log(zarr);
    

        //phiT = linspace(0,2*Math.PI,12);
        //zT = [0,0.8];
        //[uT,vT] = meshgrid(zT,phiT);
        //xT =  math.dotMultiply(math.map(vT,math.cos),0.025);
        //yT =  math.dotMultiply(math.map(vT,math.sin),0.025);  
        
        var upp = {
            name: 'tail',
            x:xarr, y: yarr, z: zarr,
            type: 'surface',
            colorscale: [['0.0', color], ['1.0',color]],
            showscale: false,
            opacity:1.0,
            //hoverinfo: 'skip',
            hovertemplate: hovertext,
            contours: {
                x : {
                    highlight: false
                },
                y : {
                    highlight: false
                },
                z : {
                    highlight: false
                }
            }
            };
        var head = {
            u: [0.3*(u)],
            v: [0.3*(v)],
            w: [0.3*(w)],
            sizemode: 'absolute',
            sizeref: .25,
            hovertemplate: hovertext,
            colorscale: [['0.0', color], ['1.0',color]],
            showscale: false,
            type: 'cone',
            anchor: 'tip',
            x: [u],
            y: [v],
            z: [w]
        }
    //console.log(upp);
    return [head,upp]
}

function gen_bloch_sphere() {

    theta = linspace(0,Math.PI,20);
    phi = linspace(0,2*Math.PI,40);
    [u,v] = meshgrid(theta,phi);
    su = math.map(u,math.sin);
    xs = math.dotMultiply(math.map(v,math.cos),su);
    ys = math.dotMultiply(math.map(v,math.sin),su);
    zs = math.map(u,math.cos);
    //console.log("Here is the sphere");
    //console.log(xs);
    //console.log(ys);
    //console.log(zs);


    var x = []
    var y = []
    var z = []
    var xb = []
    var yb = []
    var zb = []
    for (var i = 0; i < 12; i++) {
        //meridians 
        t = i*math.PI/6;
        xcurr = math.multiply(math.map(theta,math.sin),math.cos(t));
        ycurr = math.multiply(math.map(theta,math.sin),math.sin(t));
        zcurr = math.map(theta,math.cos);
        if ([0,3,6,9].includes(i)) {
            xb = xb.concat(xcurr);
            xb = xb.concat([null]);
            
            yb = yb.concat(ycurr);
            yb = yb.concat([null]);
            
            zb = zb.concat(zcurr);
            zb = zb.concat([null]);

        }
        else {
            x = x.concat(xcurr);
            x = x.concat([null]);
            
            y = y.concat(ycurr);
            y = y.concat([null]);
            
            z = z.concat(zcurr);
            z = z.concat([null]);
        }

    }
    for (var i = 1; i < 9; i++) {
        //parallels
        t = i*math.PI/6;
        xcurr = math.multiply(math.map(phi,math.cos),math.sin(t));
        ycurr = math.multiply(math.map(phi,math.sin),math.sin(t));
        zcurr = Array(phi.length).fill(math.cos(t));

        if ([3].includes(i)) {
            xb = xb.concat(xcurr);
            xb = xb.concat([null]);
            
            yb = yb.concat(ycurr);
            yb = yb.concat([null]);
            
            zb = zb.concat(zcurr);
            zb = zb.concat([null]);
        }
        else {
            x = x.concat(xcurr);
            x = x.concat([null]);
            
            y = y.concat(ycurr);
            y = y.concat([null]);
    
            z = z.concat(zcurr);
            z = z.concat([null]);
        }        
    }

    var sphere = {
        name: 'sphere',
        x:xs, y: ys, z: zs,
        type: 'surface',
        colorscale: [['0.0', '#AAAAAA' ], ['1.0', '#AAAAAA']],
        showscale: false,
        opacity:0.1,
        hoverinfo: 'skip',
        contours: {
            x : {
                highlight: false
            },
            y : {
                highlight: false
            },
            z : {
                highlight: false
            }
        }
    };

    
    var gridlines = {
        name: 'gridlines_bold',
        x:x, y: y, z: z,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 0.05,
        line: {color: '#000000', width:3},
    }
    

    var gridlines_bold = {
        name: 'gridlines_bold',
        x:xb, y: yb, z: zb,
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines',
        opacity: 0.075,
        line: {color: '#000000', width:3},
    }
    

    var equator_plane = {
        name: 'equator_plane',
        x: xs, y:ys, z:math.multiply(zs,0),
        type: 'surface',
        colorscale: [['0.0', '#AAAAAA' ], ['1.0', '#AAAAAA']],
        showscale: false,
        opacity:0.075,
        hoverinfo: 'skip',

    }

    north_text = document.getElementById('north_text').value;
    south_text = document.getElementById('south_text').value;
    if (north_text != "") {
        north_text = "|" + north_text + "⟩"
    }
    if (south_text != "") {
        south_text = "|" + south_text + "⟩"
    }

    var axes = {
        name: 'axes',
        x: [-1,1,null,0,0,null,0,0], y:[0,0,null,-1,1,null,0,0], z:[0,0,null,0,0,null,-1,1],
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'lines+text',
        opacity: 0.5,
        line: {color: '#000000', width:3},
        text: ["x","","","y","","","",north_text,""],
        textfont: {
            size:30,
            color: "#000000"
        },
        textposition: 'top center'
    }
    var lower_tag = {
        x: [0], y:[0], z:[-1],
        type: 'scatter3d',
        showscale: false,
        hoverinfo: 'skip', 
        mode: 'text',
        opacity: 0.5,
        line: {color: '#000000', width:3},
        text: [south_text],
        textfont: {
            size:30,
            color: "#000000"
        },
        textposition: 'bottom center'
    }

       


    return [sphere, gridlines, gridlines_bold,equator_plane,axes,lower_tag]
    //return [axes,lower_tag]
    
}


const TRAIL_MAX_VISIBLE_ARROWS = 8;
const TRAIL_PREVIEW_SEGMENT_LIMIT = 2;
const TRAIL_ACTIVE_QUEUE_COUNT = 3;
const TRAIL_FADE_QUEUE_COUNT = 3;

function historyTraceLength() {
    const input = document.getElementById('phosphor_length');
    const parsed = input ? parseInt(input.value,10) : 10;
    if (Number.isNaN(parsed)) {
        return 10;
    }
    return Math.max(0,parsed);
}

function resolveSegmentEntry(segmentIndex, segment) {
    if (typeof getHistoryEntryForSegment === "function") {
        const entry = getHistoryEntryForSegment(segmentIndex);
        if (entry) {
            return entry;
        }
    }
    const fallbackStep = segment && segment.step ? segment.step : segmentIndex + 1;
    return {
        id: segment && segment.historyId ? segment.historyId : "segment-" + segmentIndex,
        step: fallbackStep,
        kind: "operation",
        label: "Step " + fallbackStep,
        color: segment && segment.color ? segment.color : "#1a237e",
        params: {},
        afterVector: null
    };
}

function queueRoleForSegment(segmentIndex, stopidx) {
    const age = stopidx - segmentIndex;
    if (age <= TRAIL_ACTIVE_QUEUE_COUNT) {
        return "active";
    }
    if (age <= TRAIL_ACTIVE_QUEUE_COUNT + TRAIL_FADE_QUEUE_COUNT) {
        return "fading";
    }
    return "tail";
}

function trailStyleForRole(role) {
    if (role === "active") {
        return {
            lineOpacity: 0.92,
            lineWidth: 7,
            arrowOpacity: 0.95,
            arrowSize: 0.18,
            arrowScale: 0.19,
            arrowSpacing: 2,
            markerOpacity: 1,
            markerSize: 10,
            textSize: 14,
            directionalArrows: true,
            endpointArrow: true,
            numberedMarker: true
        };
    }
    if (role === "fading") {
        return {
            lineOpacity: 0.38,
            lineWidth: 4,
            arrowOpacity: 0.42,
            arrowSize: 0.13,
            arrowScale: 0.14,
            arrowSpacing: 5,
            markerOpacity: 0.58,
            markerSize: 8,
            textSize: 12,
            directionalArrows: true,
            endpointArrow: true,
            numberedMarker: true
        };
    }
    return {
        lineOpacity: 0.11,
        lineWidth: 2,
        arrowOpacity: 0,
        arrowSize: 0,
        arrowScale: 0,
        arrowSpacing: 0,
        markerOpacity: 0,
        markerSize: 0,
        textSize: 0,
        directionalArrows: false,
        endpointArrow: false,
        numberedMarker: false
    };
}

function futureTrailStyle() {
    return {
        lineOpacity: 0.2,
        lineWidth: 2,
        arrowOpacity: 0.25,
        arrowSize: 0.1,
        arrowScale: 0.12,
        arrowSpacing: 8,
        markerOpacity: 0.3,
        markerSize: 7,
        textSize: 11,
        directionalArrows: true,
        endpointArrow: false,
        numberedMarker: true
    };
}

function escapeHoverText(value) {
    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;");
}

function stepHoverTemplate(entry, prefix="Trail segment") {
    const label = typeof formatStepNumber === "function" ? formatStepNumber(entry.step) : entry.step;
    const rows = typeof getStepTooltipRows === "function" ? getStepTooltipRows(entry) : [
        "Operation: " + entry.label,
        "Kind: " + (entry.kind || "operation")
    ];
    const escapedRows = rows.map(function(row) { return escapeHoverText(row); });
    return "<b>" + escapeHoverText(prefix) + " " + escapeHoverText(label) + "</b><br>" + escapedRows.join("<br>") + "<extra></extra>";
}

function isFinitePoint(segment, index) {
    return segment &&
        segment.x[index] !== null &&
        segment.y[index] !== null &&
        segment.z[index] !== null &&
        Number.isFinite(segment.x[index]) &&
        Number.isFinite(segment.y[index]) &&
        Number.isFinite(segment.z[index]);
}

function segmentTip(segment) {
    if (!segment || !segment.x || !segment.y || !segment.z) {
        return null;
    }
    for (let i = segment.x.length - 1; i >= 0; i--) {
        if (isFinitePoint(segment,i)) {
            return {x: segment.x[i], y: segment.y[i], z: segment.z[i], index: i};
        }
    }
    return null;
}

function normalizeVector(vector, fallback={x: 0, y: 0, z: 1}) {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    if (length < 0.000001) {
        return fallback;
    }
    return {x: vector.x / length, y: vector.y / length, z: vector.z / length};
}

function segmentDirection(segment) {
    const tip = segmentTip(segment);
    if (!tip) {
        return null;
    }
    const fallback = normalizeVector({x: tip.x, y: tip.y, z: tip.z});
    for (let i = tip.index - 1; i >= 0; i--) {
        if (isFinitePoint(segment,i)) {
            return normalizeVector({
                x: tip.x - segment.x[i],
                y: tip.y - segment.y[i],
                z: tip.z - segment.z[i]
            },fallback);
        }
    }
    return fallback;
}

function segmentTangentAt(segment, index) {
    if (!segment || !segment.x || segment.x.length === 0) {
        return null;
    }
    const currentIndex = Math.max(0,Math.min(index,segment.x.length - 1));
    let previousIndex = currentIndex - 1;
    let nextIndex = currentIndex + 1;
    while (previousIndex >= 0 && !isFinitePoint(segment,previousIndex)) {
        previousIndex--;
    }
    while (nextIndex < segment.x.length && !isFinitePoint(segment,nextIndex)) {
        nextIndex++;
    }
    if (previousIndex >= 0 && nextIndex < segment.x.length) {
        return normalizeVector({
            x: segment.x[nextIndex] - segment.x[previousIndex],
            y: segment.y[nextIndex] - segment.y[previousIndex],
            z: segment.z[nextIndex] - segment.z[previousIndex]
        });
    }
    if (previousIndex >= 0) {
        return normalizeVector({
            x: segment.x[currentIndex] - segment.x[previousIndex],
            y: segment.y[currentIndex] - segment.y[previousIndex],
            z: segment.z[currentIndex] - segment.z[previousIndex]
        });
    }
    if (nextIndex < segment.x.length) {
        return normalizeVector({
            x: segment.x[nextIndex] - segment.x[currentIndex],
            y: segment.y[nextIndex] - segment.y[currentIndex],
            z: segment.z[nextIndex] - segment.z[currentIndex]
        });
    }
    return normalizeVector({
        x: segment.x[currentIndex],
        y: segment.y[currentIndex],
        z: segment.z[currentIndex]
    });
}

function stepDisplayNumber(step) {
    return typeof formatStepNumber === "function" ? formatStepNumber(step) : String(step);
}

function offsetTipPoint(tip, direction) {
    const radial = normalizeVector({x: tip.x, y: tip.y, z: tip.z},direction);
    return {
        x: tip.x + radial.x * 0.08 + direction.x * 0.025,
        y: tip.y + radial.y * 0.08 + direction.y * 0.025,
        z: tip.z + radial.z * 0.08 + direction.z * 0.025
    };
}

function evolutionLineTrace(segment, entry, style) {
    return {
        name: "Step " + entry.step + " trajectory",
        x: segment.x,
        y: segment.y,
        z: segment.z,
        type: 'scatter3d',
        showscale: false,
        mode: 'lines',
        opacity: style.lineOpacity,
        line: {color: entry.color, width: style.lineWidth},
        hovertemplate: stepHoverTemplate(entry)
    };
}

function evolutionArrowTrace(segment, entry, style) {
    const tip = segmentTip(segment);
    const direction = segmentDirection(segment);
    if (!tip || !direction) {
        return null;
    }
    return {
        name: "Step " + entry.step + " arrow",
        x: [tip.x],
        y: [tip.y],
        z: [tip.z],
        u: [direction.x * 0.22],
        v: [direction.y * 0.22],
        w: [direction.z * 0.22],
        type: 'cone',
        anchor: 'tip',
        sizemode: 'absolute',
        sizeref: style.arrowSize,
        colorscale: [['0.0', entry.color], ['1.0', entry.color]],
        showscale: false,
        opacity: style.arrowOpacity,
        hovertemplate: stepHoverTemplate(entry,"Step arrow")
    };
}

function directionalArrowTrace(segment, entry, style, prefix="Path direction") {
    if (!style.directionalArrows || !segment || !segment.x || segment.x.length <= 2) {
        return null;
    }
    const x = [];
    const y = [];
    const z = [];
    const u = [];
    const v = [];
    const w = [];
    const spacing = Math.max(1,style.arrowSpacing);
    for (let i = spacing; i < segment.x.length - 1; i += spacing) {
        if (!isFinitePoint(segment,i)) {
            continue;
        }
        const tangent = segmentTangentAt(segment,i);
        if (!tangent) {
            continue;
        }
        x.push(segment.x[i]);
        y.push(segment.y[i]);
        z.push(segment.z[i]);
        u.push(tangent.x * style.arrowScale);
        v.push(tangent.y * style.arrowScale);
        w.push(tangent.z * style.arrowScale);
    }
    if (x.length === 0) {
        return null;
    }
    return {
        name: "Step " + entry.step + " direction",
        x: x,
        y: y,
        z: z,
        u: u,
        v: v,
        w: w,
        type: 'cone',
        anchor: 'tip',
        sizemode: 'absolute',
        sizeref: style.arrowSize,
        colorscale: [['0.0', entry.color], ['1.0', entry.color]],
        showscale: false,
        opacity: style.arrowOpacity,
        hovertemplate: stepHoverTemplate(entry,prefix)
    };
}

function evolutionMarkerTrace(segment, entry, style) {
    const tip = segmentTip(segment);
    const direction = segmentDirection(segment);
    if (!tip || !direction) {
        return null;
    }
    const markerPoint = offsetTipPoint(tip,direction);
    return {
        name: "Step " + entry.step + " marker",
        x: [markerPoint.x],
        y: [markerPoint.y],
        z: [markerPoint.z],
        type: 'scatter3d',
        showscale: false,
        mode: 'markers+text',
        opacity: style.markerOpacity,
        marker: {
            color: entry.color,
            size: style.markerSize,
            line: {color: '#ffffff', width: 1}
        },
        text: [stepDisplayNumber(entry.step)],
        textfont: {color: '#ffffff', size: style.textSize},
        textposition: 'middle center',
        hovertemplate: stepHoverTemplate(entry,"Step marker")
    };
}

function buildEvolutionTrailTraces(startidx, stopidx) {
    const traces = [];
    for (let segmentIndex = startidx; segmentIndex < stopidx; segmentIndex++) {
        const segment = PHOSPHOR[segmentIndex];
        if (!segment) {
            continue;
        }
        const entry = resolveSegmentEntry(segmentIndex,segment);
        const style = trailStyleForRole(queueRoleForSegment(segmentIndex,stopidx));
        traces.push(evolutionLineTrace(segment,entry,style));
        const directionTrace = directionalArrowTrace(segment,entry,style);
        if (directionTrace) {
            traces.push(directionTrace);
        }
        if (style.endpointArrow && stopidx - segmentIndex <= TRAIL_MAX_VISIBLE_ARROWS) {
            const arrowTrace = evolutionArrowTrace(segment,entry,style);
            if (arrowTrace) {
                traces.push(arrowTrace);
            }
        }
        if (style.numberedMarker) {
            const markerTrace = evolutionMarkerTrace(segment,entry,style);
            if (markerTrace) {
                traces.push(markerTrace);
            }
        }
    }
    return traces;
}

function dashedTrajectory(segment, dashPoints=2, gapPoints=2) {
    const x = [];
    const y = [];
    const z = [];
    const cycle = dashPoints + gapPoints;
    for (let i = 0; i < segment.x.length - 1; i++) {
        if (!isFinitePoint(segment,i) || !isFinitePoint(segment,i + 1)) {
            continue;
        }
        if (i % cycle < dashPoints) {
            x.push(segment.x[i],segment.x[i + 1],null);
            y.push(segment.y[i],segment.y[i + 1],null);
            z.push(segment.z[i],segment.z[i + 1],null);
        }
    }
    return {x: x, y: y, z: z};
}

function futurePreviewTrace(segment, entry) {
    const dashed = dashedTrajectory(segment);
    const style = futureTrailStyle();
    return {
        name: "Step " + entry.step + " future preview",
        x: dashed.x,
        y: dashed.y,
        z: dashed.z,
        type: 'scatter3d',
        showscale: false,
        mode: 'lines',
        opacity: style.lineOpacity,
        line: {color: entry.color, width: style.lineWidth},
        hovertemplate: stepHoverTemplate(entry,"Future preview")
    };
}

function buildFuturePreviewTraces(startidx, maxSegments) {
    const traces = [];
    const stopidx = Math.min(PHOSPHOR.length,startidx + maxSegments);
    for (let segmentIndex = startidx; segmentIndex < stopidx; segmentIndex++) {
        const segment = PHOSPHOR[segmentIndex];
        if (!segment) {
            continue;
        }
        const entry = resolveSegmentEntry(segmentIndex,segment);
        const style = futureTrailStyle();
        traces.push(futurePreviewTrace(segment,entry));
        const directionTrace = directionalArrowTrace(segment,entry,style,"Future direction");
        if (directionTrace) {
            traces.push(directionTrace);
        }
        const markerTrace = evolutionMarkerTrace(segment,entry,style);
        if (markerTrace) {
            traces.push(markerTrace);
        }
    }
    return traces;
}

function playbackDotTraces(playback) {
    if (!playback || !playback.point || !playback.entry) {
        return [];
    }
    const point = playback.point;
    const color = playback.entry.color || "#1a237e";
    const hovertemplate = stepHoverTemplate(playback.entry,"Playback position");
    return [
        {
            name: "Playback glow",
            x: [point.x],
            y: [point.y],
            z: [point.z],
            type: 'scatter3d',
            mode: 'markers',
            marker: {color: color, size: 18, opacity: 0.22},
            opacity: 0.35,
            hovertemplate: hovertemplate
        },
        {
            name: "Playback position",
            x: [point.x],
            y: [point.y],
            z: [point.z],
            type: 'scatter3d',
            mode: 'markers',
            marker: {
                color: '#ffffff',
                size: 6,
                line: {color: color, width: 3}
            },
            opacity: 1,
            hovertemplate: hovertemplate
        }
    ];
}

function playbackEndpointArrowTrace(playback) {
    if (!playback || !playback.point || !playback.entry) {
        return null;
    }
    const segment = PHOSPHOR[playback.segmentIndex];
    if (!segment) {
        return null;
    }
    const sampleIndex = Math.max(0,Math.min(Math.round(playback.sample),segment.x.length - 1));
    const tangent = segmentTangentAt(segment,sampleIndex);
    if (!tangent) {
        return null;
    }
    return {
        name: "Playback endpoint",
        x: [playback.point.x],
        y: [playback.point.y],
        z: [playback.point.z],
        u: [tangent.x * 0.22],
        v: [tangent.y * 0.22],
        w: [tangent.z * 0.22],
        type: 'cone',
        anchor: 'tip',
        sizemode: 'absolute',
        sizeref: 0.17,
        colorscale: [['0.0', playback.entry.color], ['1.0', playback.entry.color]],
        showscale: false,
        opacity: 0.95,
        hovertemplate: stepHoverTemplate(playback.entry,"Playback direction")
    };
}

function update_state_plot(full_update=false) {
    const playback = typeof getPlaybackRenderState === "function" ? getPlaybackRenderState() : null;
    const point_vector = playback ? playback.vector : state2vector(getCurrentState());
    const new_data = gen_vector_plot(point_vector);
    let phosphor_data;
    let preview_data = [];
    let playback_data = [];
    if (PHOSPHOR_ENABLED === true) {
        const phosphor_length = historyTraceLength();
        const stopidx = playback ? Math.max(HISTORY_CURSOR,playback.segmentIndex + 1) : HISTORY_CURSOR;
        let startidx = stopidx-phosphor_length;
        if (startidx < 0) {
            startidx = 0;
        }
        phosphor_data = buildEvolutionTrailTraces(startidx,stopidx);
        const playerStop = typeof getPlayerStopIndex === "function" ? getPlayerStopIndex() : PHOSPHOR.length;
        if (phosphor_length > 0 && stopidx < PHOSPHOR.length && stopidx < playerStop) {
            preview_data = buildFuturePreviewTraces(
                stopidx,
                Math.min(phosphor_length,TRAIL_PREVIEW_SEGMENT_LIMIT,playerStop - stopidx)
            );
        }
        playback_data = playbackDotTraces(playback);
        const endpointTrace = playbackEndpointArrowTrace(playback);
        if (endpointTrace) {
            playback_data.push(endpointTrace);
        }
        //console.log("Phosphor set to");
        //console.log(phosphor_data);
    }
    else {
        phosphor_data = []
    }
    /*Plotly.animate('myDiv', {
        group: 'state',
        data: Array(BLOCHSPHERE.length).fill(null).concat(new_data).concat(phosphor_data)
      }, {
        transition: {
          duration: 0,
        },
        frame: {
          duration: 0,
          redraw: true,
        }
      });
      */
    
      init_plotting(BLOCHSPHERE.concat(new_data).concat(phosphor_data).concat(preview_data).concat(playback_data));

}


