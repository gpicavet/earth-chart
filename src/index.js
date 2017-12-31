import * as THREE from 'three';

let radius = 35;
let distance=100;
let theta=0, onMouseDownTheta=0, nextTheta=0, phi=30, onMouseDownPhi=30, nextPhi=0;
let onMouseDownPosition = new THREE.Vector2();
let startMouseMove=null;

let isMouseDown=false;
let currentIntersectedObj=null;

let scene;
let sun;
let camera;
let earthSphere;

let raycaster = new THREE.Raycaster();

let renderer;

function renderEarth(geoDataUri, countryData, container, width, height) {
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize( width, height );
    container.appendChild( renderer.domElement );


    scene = new THREE.Scene();

    sun = new THREE.DirectionalLight( 0xffffff );
    scene.add(sun);

    camera = new THREE.PerspectiveCamera( 45, width/height, 1, 1000 );
    updateCamera();
    camera.lookAt(scene.position);


    let geometry = new THREE.SphereGeometry( radius-0.2, 50, 50 );
    let material = new THREE.MeshPhongMaterial( { color: 0x0000ff, specular: 0x111111, shininess: 30 } );

    earthSphere = new THREE.Mesh( geometry, material );
    scene.add( earthSphere );

    container.addEventListener( 'mousemove', onMouseMove, false );
    container.addEventListener( 'mousedown', onMouseDown, false );
    container.addEventListener( 'mouseup', onMouseUp, false );
    container.addEventListener( 'wheel', onMouseWheel, false);

    loadGeoData(geoDataUri,countryData).then(function() {
      animate();
    })
}

function updateCamera() {
    camera.position.x = distance * Math.sin( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.position.y = distance * Math.sin( phi * Math.PI / 180 );
    camera.position.z = distance * Math.cos( theta * Math.PI / 180 ) * Math.cos( phi * Math.PI / 180 );
    camera.updateMatrix();
    camera.lookAt(scene.position);

    sun.position.set( 0,1,1).normalize();

}

function onMouseMove(event) {
  event.preventDefault();
  if(isMouseDown) {
    // move less if we are close
    nextTheta = - ( ( event.clientX - onMouseDownPosition.x ) * 0.5 )*distance/100 + onMouseDownTheta;
    nextPhi = ( ( event.clientY - onMouseDownPosition.y ) * 0.5 )*distance/100 + onMouseDownPhi;
    startMouseMove=Date.now();

  } else {
    startMouseMove=null;

      // update the picking ray with the camera and mouse position
  	raycaster.setFromCamera( new THREE.Vector2(( event.clientX / renderer.getSize().width ) * 2 - 1, - ( event.clientY / renderer.getSize().height ) * 2 + 1), camera );

  	// calculate objects intersecting the picking ray
  	var intersects = raycaster.intersectObjects( scene.children );

    if(intersects.length>0) {

      if(currentIntersectedObj != intersects[ 0 ].object &&
        earthSphere != intersects[ 0 ].object &&
        intersects[ 0 ].object.name.indexOf("contour")<0) {

        //replace latest if exists
        if(currentIntersectedObj) {
          scene.getObjectByName(currentIntersectedObj.name+"-contour").visible=false;
        }

        currentIntersectedObj = intersects[ 0 ].object;

        console.log("SELECTED country ", currentIntersectedObj.name);

        scene.getObjectByName(currentIntersectedObj.name+"-contour").visible=true;
      }
    } else {
      if(currentIntersectedObj) {
        scene.getObjectByName(currentIntersectedObj.name+"-contour").visible=false;
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
  if(distance < radius*1.2 )
    distance=radius*1.2;
}

function animate() {
  requestAnimationFrame( animate );
  theta+=0.1;

  if(startMouseMove!=null) {//smoothly move to next position
    theta+=(nextTheta-theta)/3;
    phi+=(nextPhi-phi)/3;
  }

  updateCamera();
  renderer.render(scene, camera);
};


function loadGeoData(file, countryData) {
  return fetch(file)
  .then(function(res) {return res.json();})
  .then(function(mesh) {

    let stats={vertices:0,triangles:0};

    for(let country of mesh.countries) {

      console.log("loading country "+country.iso2);

      let extent = countryData[country.iso2] || 0;

      let extColor = new THREE.Color(
                        0.2+Math.random()*0.6,
                        0.2+Math.random()*0.6,
                        0.2+Math.random()*0.6);
      let extColor2 = new THREE.Color(extColor.r/5,extColor.g/5,extColor.b/5);
      let extMaterialFront = new THREE.MeshPhongMaterial( {
        color: extColor,
        side: THREE.FrontSide,
        opacity:0.9,
        transparent:true,
        shininess:50,
        specular: 0x111111} );
      let extMaterialSide = new THREE.MeshPhongMaterial( {
        color: extColor2,
        side: THREE.FrontSide});
      let contMaterial = new THREE.LineBasicMaterial( { color: extColor, linewidth:2 } );

      for(let poly of country.polygons) {

        //1) create an extruded country
        let extGeometry = new THREE.Geometry();

        //country inside polygons
        for(let vert of poly.vertices) {
          extGeometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius*(1+extent))
          );
        }
        for(let face of poly.faces) {
          let normals =[
            extGeometry.vertices[face[0]].clone().normalize(),
            extGeometry.vertices[face[1]].clone().normalize(),
            extGeometry.vertices[face[2]].clone().normalize()];
          extGeometry.faces.push( new THREE.Face3( face[0], face[1], face[2], normals) );
        }

        //country contour
        for(let vert of poly.contour) {
          extGeometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius)
          );
        }
        for(let vert of poly.contour) {
          extGeometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius*(1+extent))
          );
        }
        let startOffs=poly.vertices.length;
        let offs2=poly.contour.length;
        for(let ivert =0; ivert<offs2; ivert++) {
          let ivert2 = (ivert+1)%offs2;
          extGeometry.faces.push( new THREE.Face3(startOffs+ivert,startOffs+ivert2+offs2,startOffs+ivert2, null, null, 1) );
          extGeometry.faces.push( new THREE.Face3(startOffs+ivert,startOffs+ivert+offs2,startOffs+ivert2+offs2, null, null, 1) );
        }

        extGeometry.computeFaceNormals();

        let extMeshFront = new THREE.Mesh( extGeometry, [extMaterialFront, extMaterialSide] ) ;
        extMeshFront.name = country.iso2;
        scene.add( extMeshFront );

        stats.vertices+=extGeometry.vertices.length;
        stats.triangles+=extGeometry.faces.length;

        //2) create a contour line
        let contGeometry = new THREE.Geometry();

        for(let vert of poly.contour) {
          contGeometry.vertices.push(
            new THREE.Vector3( vert[0], vert[1], vert[2] ).multiplyScalar(radius*(1+extent))
          );
        }

        let contour = new THREE.LineLoop( contGeometry, contMaterial ) ;
        contour.name = country.iso2+"-contour";
        contour.visible=false;
        scene.add( contour );
      }

    }
    console.info(stats);
  });
}

module.exports = {
    renderEarth
}