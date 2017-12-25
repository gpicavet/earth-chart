import * as THREE from 'three';


let distance=100;
let theta=45, onMouseDownTheta=45, phi=60, onMouseDownPhi=60;
let onMouseDownPosition = new THREE.Vector2();

let isMouseDown=false;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 1, 1000 );
camera.position.x = distance * Math.sin( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
camera.position.y = distance * Math.sin( phi * Math.PI / 180 );
camera.position.z = distance * Math.cos( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
camera.lookAt(scene.position);

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


document.addEventListener( 'mousemove', onDocumentMouseMove, false );
document.addEventListener( 'mousedown', onDocumentMouseDown, false );
document.addEventListener( 'mouseup', onDocumentMouseUp, false );


function onDocumentMouseMove(event) {
  event.preventDefault();
  if(isMouseDown) {
    theta = - ( ( event.clientX - onMouseDownPosition.x ) * 0.5 ) + onMouseDownTheta;
    phi = ( ( event.clientY - onMouseDownPosition.y ) * 0.5 ) + onMouseDownPhi;

    camera.position.x = distance * Math.sin( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.position.y = distance * Math.sin( phi * Math.PI / 180 );
    camera.position.z = distance * Math.cos( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.updateMatrix();
    camera.lookAt(scene.position);

  }
}

function onDocumentMouseDown(event) {
  event.preventDefault();
  isMouseDown=true;
  onMouseDownTheta = theta;
  onMouseDownPhi = phi;
  onMouseDownPosition.x = event.clientX;
  onMouseDownPosition.y = event.clientY;
}

function onDocumentMouseUp(event) {
  event.preventDefault();
  isMouseDown=false;
  onMouseDownPosition.x = event.clientX - onMouseDownPosition.x;
  onMouseDownPosition.y = event.clientY - onMouseDownPosition.y;
}

var animate = function () {
  requestAnimationFrame( animate );

  renderer.render(scene, camera);
};


function loadMesh(file) {
  return fetch(file)
  .then(function(res) {return res.json();})
  .then(function(mesh) {


    for(let country of mesh.countries) {

      var material = new THREE.MeshBasicMaterial( { color: '#'+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16) } );

      for(let poly of country.polygons) {

        var geometry = new THREE.Geometry();

        for(let vert of poly.vertices) {
          geometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] )
          );
        }

        for(let face of poly.faces) {
          geometry.faces.push( new THREE.Face3( face[0], face[1], face[2] ) );
        }

        var mesh = new THREE.Mesh( geometry, material ) ;

        scene.add( mesh );
      }
    }
  });
}

loadMesh("countries-world.json").then(function() {
  var light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 0, 1, 1 ).normalize();
  scene.add(light);

  var geometry = new THREE.SphereGeometry( 49.9, 32, 32 );
  var material = new THREE.MeshPhongMaterial( { color: 0x0000ff, specular: 0x111111, shininess: 30 } );

  var sphere = new THREE.Mesh( geometry, material );
  scene.add( sphere );

  animate();
})
