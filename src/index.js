import * as THREE from 'three';


let radius = 35;
let distance=100;
let theta=0, onMouseDownTheta=0, phi=30, onMouseDownPhi=30;
let onMouseDownPosition = new THREE.Vector2();

let isMouseDown=false;
let currentIntersectedObj=null;
let currentIntersectedObjBar=null;

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 );
camera.position.x = distance * Math.sin( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
camera.position.y = distance * Math.sin( phi * Math.PI / 180 );
camera.position.z = distance * Math.cos( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
camera.lookAt(scene.position);

let sun = new THREE.DirectionalLight( 0xffffff );
sun.position.set( 0, 1, 1 ).normalize();
scene.add(sun);

var geometry = new THREE.SphereGeometry( radius-0.2, 50, 50 );
var material = new THREE.MeshPhongMaterial( { color: 0x0000ff, specular: 0x111111, shininess: 30 } );

var earth = new THREE.Mesh( geometry, material );
scene.add( earth );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
var raycaster = new THREE.Raycaster();
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

  } else {

      // update the picking ray with the camera and mouse position
  	raycaster.setFromCamera( new THREE.Vector2(( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1), camera );

  	// calculate objects intersecting the picking ray
  	var intersects = raycaster.intersectObjects( scene.children );

    if(intersects.length>0) {

      if(currentIntersectedObj != intersects[ 0 ].object &&
        currentIntersectedObjBar != intersects[ 0 ].object &&
        earth != intersects[ 0 ].object) {

        //replace latest if exists
        if(currentIntersectedObjBar) {
          scene.remove(currentIntersectedObjBar);
        }

        currentIntersectedObj = intersects[ 0 ].object;

        //extrude country
        let geometry = new THREE.Geometry();

        for(let vert of currentIntersectedObj.geometry.vertices) {
          geometry.vertices.push(
            vert.clone()
          );
        }
        for(let vert of currentIntersectedObj.geometry.vertices) {
          geometry.vertices.push(
            vert.clone().multiplyScalar(1.1)
          );
        }

        let nv = currentIntersectedObj.geometry.vertices.length;

        for(let face of currentIntersectedObj.geometry.faces) {
          geometry.faces.push( new THREE.Face3(nv+face.a,nv+face.b,nv+face.c) );
        }
        for(let ivert =0; ivert<nv; ivert++) {
          let ivert2 = (ivert+1)%nv;
          geometry.faces.push( new THREE.Face3(ivert,ivert2,ivert2+nv) );
          geometry.faces.push( new THREE.Face3(ivert,ivert2+nv,ivert+nv) );
        }

        let material = new THREE.MeshBasicMaterial( { color: currentIntersectedObj.material.color, opacity:0.5, transparent:true } );
        currentIntersectedObjBar = new THREE.Mesh( geometry, material ) ;

        scene.add( currentIntersectedObjBar );

        console.log("SELECTED", currentIntersectedObj);
      }
    } else {
      if(currentIntersectedObjBar) {
        scene.remove(currentIntersectedObjBar);
      }

      currentIntersectedObj = null;
    }



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

function animate() {
  requestAnimationFrame( animate );

  renderer.render(scene, camera);
};


function loadEarth(file) {
  return fetch(file)
  .then(function(res) {return res.json();})
  .then(function(mesh) {

    for(let country of mesh.countries) {

      let material = new THREE.MeshBasicMaterial( { color: '#'+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16) } );

      for(let poly of country.polygons) {
        let geometry = new THREE.Geometry();

        for(let vert of poly.vertices) {
          geometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius)
          );
        }

        for(let face of poly.faces) {
          geometry.faces.push( new THREE.Face3( face[0], face[1], face[2] ) );
        }
        let mesh = new THREE.Mesh( geometry, material ) ;
        scene.add( mesh );
      }

    }
  });
}

loadEarth("countries-world.json").then(function() {
  animate();
})
