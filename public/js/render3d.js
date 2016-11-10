var model = {};
model.coords = [];
model.coordNames = [];
model.vecs = [];
model.scene = {};
model.camera = {};
model.renderer = {};
model.controls = {};
model.pointObjects = [];
model.vectorObjects = [];
model.setCoords = function(coords) {
    model.coords = coords;
    for (var i = 0; i < coords.length; i++) {
        model.coordNames.push(String.fromCharCode('A'.charCodeAt(0) + i));
    }
}

//
// Client side routing
//
// plot?coord=x1,y1,z1&coord=x2,y2,z2&...&vec=ic1,ic2&vec=ic1,ic2&...
//
crossroads.addRoute('/plot{?query}', function(_query) {
    if (_query.coord == null) {
        return;
    }
    if (!Array.isArray(_query.coord)) {
        _query.coord = [_query.coord];
    }
    model.setCoords(_query.coord.map(textCoordToVector3));
    if (_query.vec) {
        if (!Array.isArray(_query.vec)) {
            _query.vec = [_query.vec];
        }
        model.vecs = _query.vec.map(function(pair) {
            var coordIndexes = pair.split(',');
            if (coordIndexes.length == 2) {
                return [Number(coordIndexes[0]), Number(coordIndexes[1])];
            }
        });
    }
});
crossroads.addRoute('/', function() {
    console.log('/');
});
crossroads.bypassed.add(console.log, console);

function updatePage() {
    crossroads.parse(document.location.pathname + document.location.search);
    renderPoints(model);
    renderVectors(model);
}

window.onpopstate = function(event) {
    updatePage();
};

initViewport(model);
updatePage();
animate();

function initViewport(model) {
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    var viewAngle = 45;
    var aspect = screenWidth / screenHeight;
    var near = 0.1;
    var far = 20000;
    model.camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);

    model.scene = new THREE.Scene();
    model.scene.add(model.camera);

    model.camera.position.set(0, 50, 100);
    model.camera.lookAt(model.scene.position);

    if (Detector.webgl) {
        model.renderer = new THREE.WebGLRenderer( { antialias: true });
    }
    else {
        model.renderer = new THREE.CanvasRenderer();
    }

    model.renderer.setSize(screenWidth, screenHeight);

    var container = document.getElementById('viewport');
    container.appendChild(model.renderer.domElement);

    // EVENTS

    THREEx.WindowResize(model.renderer, model.camera);
    //THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

    // CONTROLS

    model.controls = new THREE.OrbitControls(model.camera, model.renderer.domElement);

    // LIGHT

    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, 250, 0);
    model.scene.add(light);
    var ambientLight = new THREE.AmbientLight(0x111111);
    //scene.add(ambientLight);

    // AXES

    var axes = new THREE.AxisHelper(100);
    model.scene.add(axes);

    // GRID

    var xyGrid = new THREE.GridHelper(100, 50);
    model.scene.add(xyGrid);
    //var xzGridObj = new THREE.Object3D();
    //var xzGrid = new THREE.GridHelper(100, 50);
    //xzGridObj.add(xzGrid);
    //xzGridObj.rotateX(Math.PI / 2);
    //scene.add(xzGridObj);

	// make sure the camera's "far" value is large enough so that it will render the skyBox!
	var skyBoxGeometry = new THREE.CubeGeometry( 10000, 10000, 10000 );
	// BackSide: render faces from inside of the cube, instead of from outside (default).
	var skyBoxMaterial = new THREE.MeshBasicMaterial( { color: 0x9999ff, side: THREE.BackSide } );
	var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
	model.scene.add(skyBox);

    //scene.fog = new THREE.FogExp2(0x1111ff, 0.00025);
}

function renderPoints(model) {
    updatePointsList(model);
    plotPoints(model);
}

function renderVectors(model) {
    updateVectorList(model)
    if (model.vecs) {
        for (var i = 0; i < model.vecs.length; i++) {
            var vectorObject = createVector(model.coords[model.vecs[i][0]], model.coords[model.vecs[i][1]]);
            vectorObject.traverse(function(obj) { obj.visible = false; });
            model.vectorObjects.push(vectorObject);
            model.scene.add(vectorObject);
        }
    }
}

function updatePointsList(model) {
    var pointsList = $('#pointsList');
    var pointProto = pointsList.find("div[name='point']").first();
    pointsList.empty();
    for (var i = 0; i < model.coords.length; i++) {
        var pointDiv = pointProto.clone();
        pointDiv.find("label[name='nameLabel']").text(model.coordNames[i]);
        pointDiv.find("label[name='pointLabel']").text(vector3ToString(model.coords[i]));
        pointsList.append(pointDiv);
    }
}

function updateVectorList(model) {
    var vectorList = $('#vectorList');
    var vectorProto = vectorList.find("div[name='vector']").first();
    vectorList.empty();
    for (var i = 0; i < model.coords.length; i++) {
        for (var j = 0; j < model.coords.length; j++) {
            if (j != i) {
                var vectorDiv = vectorProto.clone();
                var btn = vectorDiv.find("label[name='vectorBtn']");
                btn.text(model.coordNames[i] + ">>" + model.coordNames[j]);
                btn.click({"model": model, "vec": [i, j]}, toggleVector);
                vectorList.append(vectorDiv);
            }
        }
    }
}

function parseAndPlot() {
    var inputElement = document.getElementById('textInput');
    var parsedCoords = parseInput(inputElement.value);
    inputElement.value = "";
    // merge with existing model coords
    parsedCoords = parsedCoords.filter(function(item) {
        return model.coords.indexOf(item) < 0;
    });
    var newCoordList = model.coords.concat(parsedCoords);
    // create the list of coord params for the url
    var coordParams = newCoordList.map(function(vec) {
        return "coord=" + vector3ToString(vec);
    });
    var coordParamList = coordParams.join('&');
    // create the list of coord index pairs for the url
    var vecParams = model.vecs.map(function(coordPair) { 
        return "vec=" + coordPair.join(',') 
    });
    var vecParamList = vecParams.join('&');
    // create the new url
    if (coordParamList.length > 0) {
        var newUrl = "plot?" + coordParamList;
        if (vecParamList.length > 0) {
            newUrl += "&" + vecParamList;
        }
        history.pushState(null, null, newUrl);
        updatePage();
    }
}

function toggleVector(event) {
    var coords = event.data.model.coords;
    drawVector(coords[event.data.vec[0]], coords[event.data.vec[1]]);
}

function textCoordToVector3(textCoord) {
    var coordParts = textCoord.split(',');
    return new THREE.Vector3(
        Number(coordParts[0]), 
        Number(coordParts[1]), 
        Number(coordParts[2]));
}

function coordPairToString(coordPair, delim = ',') {
    return coordPair.join(delim);
}

function vector3ToString(vector, delim = ',') {
    return vector.x + delim + vector.y + delim + vector.z; 
}

function plotPoints(model) {
    if (model.coords) {
        for (var i = 0; i < model.pointObjects.length; i++) {
            model.scene.remove(model.pointObjects[i]);
        }
        for (var i = 0; i < model.coords.length; i++) {
            var sphere = new THREE.SphereGeometry(.5, 32, 32);
            var sphereMat = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
            var mesh = new THREE.Mesh(sphere, sphereMat);
            mesh.position.copy(model.coords[i]);
            var pointObject = new THREE.Object3D();
            pointObject.add(mesh);
            model.pointObjects.push(pointObject);
            model.scene.add(pointObject);
            console.log("added sphere at" + model.coords[i]);
        }
    }
}

function createVector(start, end) {
    console.log("drawing vector from", start, " to ", end);
    var vectorObject = new THREE.Object();
    var geom = new THREE.Geometry();
    geom.vertices.push(start, end);
    var line = new THREE.Line(geom, new THREE.LineBasicMaterial({
        color: 0xffff00
    }));
    vectorObject.add(line);

    geom = new THREE.ConeGeometry(.5, 1, 32);
    // rotate from point up to pointing along z
    geom.rotateX(Math.PI / 2);
    var cone = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({
        color: 0xffff00
    }));
    
    cone.lookAt(new THREE.Vector3().subVectors(end, start));
    var vec = new THREE.Vector3()
        .subVectors(end, start)
        .setLength(start.distanceTo(end) - 1);
    var conePos = new THREE.Vector3().addVectors(start, vec);
    cone.position.copy(conePos);
    vectorObject.add(cone);

    return vectorObject;
}

function parseInput(text) {
    var lines = text.replace(/\r\n/g, "\n").split("\n");
    return lines.map(textCoordToVector3);
}

function update(model) {
    model.controls.update();
}

function render(model) {
    model.renderer.render(model.scene, model.camera);
}

function animate() {
    requestAnimationFrame(animate);
    render(model);
    update(model);
}