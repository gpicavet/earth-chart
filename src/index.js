import earcut from 'earcut';
import * as THREE from 'three';


function start() {
fetch("countries-world.kml")
.then(function(res) {return res.text();})
.then(function(restext) {
  var oParser = new DOMParser();
  var oDOM = oParser.parseFromString(restext, "text/xml");

  if(oDOM.documentElement.nodeName == "parsererror") {
    console.error("error while parsing");
    return;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

  var renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  var xmlplacemarks = oDOM.documentElement.querySelectorAll("Placemark");
  for(var xmlplacemark of xmlplacemarks) {
    console.info(xmlplacemark.querySelector("name").textContent);
    var xmlPolyCoords = xmlplacemark.querySelectorAll("Polygon outerBoundaryIs LinearRing coordinates");
    for(var xmlcoords of xmlPolyCoords) {
      var xmlverts = xmlcoords.textContent.split(" ");


      var vertcoords=[];
      for(let xmlvert of xmlverts) {
        let xmlvertcoords = xmlvert.split(",");
        let lon=parseFloat(xmlvertcoords[0])
        let lat=parseFloat(xmlvertcoords[1]);
        vertcoords.push(lon,lat);
      }

      //var bbox = bbox(vertcoords);

      var trianglesIndices = earcut(vertcoords);

      var geometry = new THREE.Geometry();

      for(var ivert=0; ivert<vertcoords.length; ivert+=2) {
        let lon=vertcoords[ivert];
        let lat=vertcoords[ivert+1];
        let x = 50*Math.cos(lat*3.14/180)*Math.cos(lon*3.14/180);
        let y = 50*Math.cos(lat*3.14/180)*Math.sin(lon*3.14/180);
        let z = 50*Math.sin(lat*3.14/180);
        geometry.vertices.push(
          new THREE.Vector3( x,y,z )
        );
      }

      for(var itri=0; itri<trianglesIndices.length; itri+=3) {
        geometry.faces.push( new THREE.Face3( trianglesIndices[itri], trianglesIndices[itri+1], trianglesIndices[itri+2] ) );
      }

      var material = new THREE.MeshBasicMaterial( { color: '#'+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16)+Math.floor(2+Math.random()*14).toString(16) } );
      var mesh = new THREE.Mesh( geometry, material ) ;

      scene.add( mesh );
    }
  }


  var frame=0;

  var animate = function () {
    frame++;
    requestAnimationFrame( animate );

    camera.position.z = 100*Math.cos(frame*3.14/180*0.1);
    camera.position.x = 100*Math.sin(frame*3.14/180*0.1);
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  };

  animate();
});
}

start();
