var container, scene, camera, renderer, controls;
var model = {};
model.coords = [];
model.coordNames = [];
model.vecs = [];
model.setCoords = function(coords) {
    model.coords = coords;
    for (var i = 0; i < coords.length; i++) {
        model.coordNames.push(String.fromCharCode('A'.charCodeAt(0) + i));
    }
}

crossroads.addRoute('/plot{?query}', function(_query) {
    model.setCoords(_query.coord.map(textCoordToVector3));
    if (_query.vec) {
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
})
crossroads.parse(document.location.pathname + document.location.search);
crossroads.bypassed.add(console.log, console);
console.log(document.location.pathname + document.location.search);

document.getElementById('plotButton')

initViewport();
animate();

renderPoints(model.coords, model.coordNames);
drawVectors(model.coords, model.vecs);

function initViewport() {
    var screenWidth = window.innerWidth;
    var screenHeight = window.innerHeight;
    var viewAngle = 45;
    var aspect = screenWidth / screenHeight;
    var near = 0.1;
    var far = 20000;
    camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);

    scene = new THREE.Scene();
    scene.add(camera);

    camera.position.set(0, 50, 100);
    camera.lookAt(scene.position);

    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer( { antialias: true });
    }
    else {
        renderer = new THREE.CanvasRenderer();
    }

    renderer.setSize(screenWidth, screenHeight);

    container = document.getElementById('viewport');
    container.appendChild(renderer.domElement);

    // EVENTS

    THREEx.WindowResize(renderer, camera);
    //THREEx.FullScreen.bindKey({ charCode : 'm'.charCodeAt(0) });

    // CONTROLS

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // LIGHT

    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, 250, 0);
    scene.add(light);
    var ambientLight = new THREE.AmbientLight(0x111111);
    //scene.add(ambientLight);

    // AXES

    var axes = new THREE.AxisHelper(100);
    scene.add(axes);

    // GRID

    var xyGrid = new THREE.GridHelper(100, 50);
    scene.add(xyGrid);
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
	scene.add(skyBox);

    //scene.fog = new THREE.FogExp2(0x1111ff, 0.00025);
}

function renderPoints(coords, labels) {
    updatePointsList(coords, labels);
    plotPoints(coords);
}

function updatePointsList(coords, labels) {
    var pointsList = $('#pointsList');
    var pointProto = pointsList.find("div");
    pointsList.empty();
    for (var i = 0; i < coords.length; i++) {
        var pointDiv = pointProto.clone();
        pointDiv.find("label[name='nameLabel']").text(labels[i]);
        pointDiv.find("label[name='pointLabel']").text(vector3ToString(coords[i]));
        pointsList.append(pointDiv);
    }
}

function parseAndPlot() {
    var textInput = document.getElementById('textInput').value;
    model.coords = model.coords.concat(parseInput(textInput));
    renderPoints(model.coords, model.coordNames);
}

function textCoordToVector3(textCoord) {
    var coordParts = textCoord.split(',');
    return new THREE.Vector3(
        Number(coordParts[0]), 
        Number(coordParts[1]), 
        Number(coordParts[2]));
}

function vector3ToString(vector, delim = ',') {
    return vector.x + delim + vector.y + delim + vector.z; 
}

function plotPoints(coords) {
    if (coords) {
        for (var i = 0; i < coords.length; i++) {
            var sphere = new THREE.SphereGeometry(.5, 32, 32);
            var sphereMat = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
            var mesh = new THREE.Mesh(sphere, sphereMat);
            mesh.position.copy(coords[i]);
            scene.add(mesh);
            console.log("added sphere at" + coords[i]);
        }
    }
}

function drawVectors(coords, vecs) {
    if (vecs) {
        for (var i = 0; i < vecs.length; i++) {
            drawVector(coords[vecs[i][0]], coords[vecs[i][1]]);
        }
    }
}

function drawVector(start, end) {
    console.log("drawing vector from", start, " to ", end);
    var geom = new THREE.Geometry();
    geom.vertices.push(start, end);
    var line = new THREE.Line(geom, new THREE.LineBasicMaterial({
        color: 0xffff00
    }));
    scene.add(line);

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
    scene.add(cone);
}

function parseInput(text) {
    var lines = text.replace(/\r\n/g, "\n").split("\n");
    return lines.map(textCoordToVector3);
}

function animate() {
    requestAnimationFrame(animate);
    render();
    update();
}

function update() {
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}