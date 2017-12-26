import * as THREE from 'three';

let countryISO2 = require('../node_modules/country-json/src/country-by-abbreviation.json');
let countryPopulation = require('../node_modules/country-json/src/country-by-population.json');

let radius = 35;
let distance=100;
let theta=0, onMouseDownTheta=0, phi=30, onMouseDownPhi=30;
let onMouseDownPosition = new THREE.Vector2();

let isMouseDown=false;
let currentIntersectedObj=null;
let currentIntersectedObjBar=null;


let scene;
let camera;
let earthSphere;

let raycaster = new THREE.Raycaster();

let renderer;

function renderEarth(geoDataUri, container, width, height) {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( width, height );
    container.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, width/height, 1, 1000 );
    updateCamera();
    camera.lookAt(scene.position);

    let sun = new THREE.DirectionalLight( 0xffffff );
    sun.position.set( 0, 1, 1 ).normalize();
    scene.add(sun);

    let geometry = new THREE.SphereGeometry( radius-0.2, 50, 50 );
    let material = new THREE.MeshPhongMaterial( { color: 0x0000ff, specular: 0x111111, shininess: 30 } );

    earthSphere = new THREE.Mesh( geometry, material );
    scene.add( earthSphere );

    container.addEventListener( 'mousemove', onMouseMove, false );
    container.addEventListener( 'mousedown', onMouseDown, false );
    container.addEventListener( 'mouseup', onMouseUp, false );
    container.addEventListener( 'wheel', onMouseWheel, false);

    loadGeoData(geoDataUri).then(function() {
      animate();
    })
}

function updateCamera() {
    camera.position.x = distance * Math.sin( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.position.y = distance * Math.sin( phi * Math.PI / 180 );
    camera.position.z = distance * Math.cos( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.updateMatrix();

}

function onMouseMove(event) {
  event.preventDefault();
  if(isMouseDown) {
    theta = - ( ( event.clientX - onMouseDownPosition.x ) * 0.5 ) + onMouseDownTheta;
    phi = ( ( event.clientY - onMouseDownPosition.y ) * 0.5 ) + onMouseDownPhi;

    updateCamera();
    camera.lookAt(scene.position);

  } else {

      // update the picking ray with the camera and mouse position
  	raycaster.setFromCamera( new THREE.Vector2(( event.clientX / renderer.getSize().width ) * 2 - 1, - ( event.clientY / renderer.getSize().height ) * 2 + 1), camera );

  	// calculate objects intersecting the picking ray
  	var intersects = raycaster.intersectObjects( scene.children );

    if(intersects.length>0) {

      if(currentIntersectedObj != intersects[ 0 ].object &&
        currentIntersectedObjBar != intersects[ 0 ].object &&
        earthSphere != intersects[ 0 ].object) {

        //replace latest if exists
        if(currentIntersectedObjBar) {
          scene.remove(currentIntersectedObjBar);
        }

        currentIntersectedObj = intersects[ 0 ].object;

        console.log("SELECTED country ", currentIntersectedObj.name);
/*
        //extrude country
        let geometry = new THREE.Geometry();

        for(let vert=currentIntersectedObj.geometry.vertices.length/2; vert<currentIntersectedObj.geometry.vertices.length; vert++) {
          geometry.vertices.push(
            currentIntersectedObj.geometry.vertices[vert].clone()
          );
        }

        let material = new THREE.LineBasicMaterial( { color: currentIntersectedObj.material.color, linewidth:2 } );
        currentIntersectedObjBar = new THREE.LineLoop( geometry, material ) ;

        scene.add( currentIntersectedObjBar );*/
      }
    } else {
      if(currentIntersectedObjBar) {
        scene.remove(currentIntersectedObjBar);
      }

      currentIntersectedObj = null;
    }



  }



}

function onMouseDown(event) {
  event.preventDefault();
  isMouseDown=true;
  onMouseDownTheta = theta;
  onMouseDownPhi = phi;
  onMouseDownPosition.x = event.clientX;
  onMouseDownPosition.y = event.clientY;
}

function onMouseUp(event) {
  event.preventDefault();
  isMouseDown=false;
  onMouseDownPosition.x = event.clientX - onMouseDownPosition.x;
  onMouseDownPosition.y = event.clientY - onMouseDownPosition.y;
}

function onMouseWheel(event) {
  event.preventDefault();
  distance += event.deltaY/20;
  updateCamera();
}

function animate() {
  requestAnimationFrame( animate );

  renderer.render(scene, camera);
};


function loadGeoData(file) {
  return fetch(file)
  .then(function(res) {return res.json();})
  .then(function(mesh) {

    for(let country of mesh.countries) {

      console.log("loading country "+country.iso2);

      let data = loadCountryData(country.iso2);
      let extent = data / 1000000000;

      let material = new THREE.MeshBasicMaterial( { color: '#'+Math.floor(6+Math.random()*10).toString(16)+Math.floor(6+Math.random()*10).toString(16)+Math.floor(6+Math.random()*10).toString(16),
       opacity:0.5, transparent:true} );

      for(let poly of country.polygons) {


        let geometry = new THREE.Geometry();

        for(let vert of poly.vertices) {
          geometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius)
          );
        }
        for(let vert of poly.vertices) {
          geometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius*(1+extent))
          );
        }

        let nv = poly.vertices.length;

        for(let face of poly.faces) {
          geometry.faces.push( new THREE.Face3( nv+face[0], nv+face[1], nv+face[2] ) );
        }
        for(let ivert =0; ivert<nv; ivert++) {
          let ivert2 = (ivert+1)%nv;
          geometry.faces.push( new THREE.Face3(ivert,ivert2+nv,ivert2) );
          geometry.faces.push( new THREE.Face3(ivert,ivert+nv,ivert2+nv) );
        }

        let mesh = new THREE.Mesh( geometry, material ) ;
        mesh.name = country.iso2;
        scene.add( mesh );




      }

    }
  });
}

function loadCountryData(iso2) {

    let res = 0;
    let c = countryISO2.filter(e => e.abbreviation == iso2);
    if(c.length>0) {
        let cp = countryPopulation.filter(e => e.country == c[0].country);
        if(cp.length>0) {
            res = cp[0].population;
        }
    }
    return res;
}

module.exports = {
    renderEarth
}