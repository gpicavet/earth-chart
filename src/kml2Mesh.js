const fs = require('fs');
const xml2js = require('xml2js');

const {splitPolygon} = require('split-poly');
const earcut = require('earcut');

const {bbox}=require('./utils.js');

if(process.argv.length != 4) {
    console.error("node src/kml2mesh.js inputKml outputJson");
    process.exit(1);
}

let parser = new xml2js.Parser();

fs.readFile(process.argv[2], function(err, data) {
    if(err)
      throw err;

    parser.parseString(data, function (err, result) {
        if(err)
          throw err;
        kml2mesh(result,process.argv[3]);
    });
});

function kml2mesh(doc, outputFileName) {

  let output = {countries:[]};

  for(let d of doc.kml.Document) {
    for(let f of d.Folder) {
      for(let pm of f.Placemark) {

        let iso2=null;
        for(let sd of pm.ExtendedData[0].SchemaData[0].SimpleData) {
            if(sd.$.name=='ISO2') {
                iso2=sd._;
                break;
            }
        }

        let country = {iso2:iso2, polygons:[]};
        output.countries.push(country);

      //if(pm.name.indexOf("pole")>=0) {
        console.info("converting placemark "+pm.name);
        if(pm.MultiGeometry) {
          for(let mg of pm.MultiGeometry) {
            kml2Poly(mg.Polygon, country);
          }
        } else {
          kml2Poly(pm.Polygon, country);
        }
      }
      //}
    }
  }

  let json = JSON.stringify( output,
    function(key, val) {//reduce float precision
        return val.toFixed ? Number(val.toFixed(3)) : val;
    });
  fs.writeFile(outputFileName, json, (err) => {
    if(err)
      throw err;
    console.log("mesh file created");
  });

}

function kml2Poly(doc, out) {
  for(let p of doc) {
    for(let lr of p.outerBoundaryIs) {
      for(let cdl of lr.LinearRing) {
        for(let cd of cdl.coordinates) {

          let hasUnderMinus160=false,hasOver160=false;
          let geocoords=[];
          for(let gc of cd.split(" ")) {

            let geocoord = gc.split(",");
            let lon=parseFloat(geocoord[0])
            let lat=parseFloat(geocoord[1]);
            if(lon<-160)
              hasUnderMinus160=true;
            else if(lon>160)
              hasOver160=true;
            geocoords.push([lon,lat]);
          }
          //fix coordinates
          if(hasUnderMinus160 && hasOver160) {
              for(let v of geocoords) {
                if(v[0]<0)
                  v[0]+=360;
              }
          }

          //console.log(JSON.stringify(geocoords,null,2));

          if(geocoords.length>0) {

            //we have to "spherify" large countries. For that we split them into smaller parts along meridians and parallels
            let splitpolys = [geocoords];
            //split polygon with meridians (vertical lines)
            splitpolys = splitPolygonsLines(splitpolys, -360, 360, 5, 0);
            //split polygon with parallels (horizontal lines)
            splitpolys = splitPolygonsLines(splitpolys, -90, 90, 5, 1);

            //triangulate and convert to x,y,z
            let faceOffset=0;
            let mesh={contour:[], vertices:[], faces:[]};
            out.polygons.push(mesh);

            for(let poly of splitpolys) {
              if(poly.length>0) {

                //triangulate this polygon in order to facilitate GPU rendering
                let polyflat = [];
                for(let v of poly) {
                  polyflat.push(v[0], v[1]);
                }
                let trianglesIndices = earcut(polyflat);

                //convert spherical geo coordinates to X,Y,Z space

                for(let v of poly) {
                  mesh.vertices.push(geoToXYZ(v));
                }

                for(let itri=0; itri<trianglesIndices.length; itri+=3) {
                  mesh.faces.push( [faceOffset+trianglesIndices[itri], faceOffset+trianglesIndices[itri+1], faceOffset+trianglesIndices[itri+2]] );
                }

                faceOffset+=poly.length;
              }
            }

            //build the contour. We keep edges that doesn't share same vertices with any other edge
            let removed=0;
            let edges=[];
            for(let poly of splitpolys) {
                let prec = poly[poly.length-1];
                for(let cur of poly) {
                    if(Math.abs(prec[0]-cur[0])>1e-6 || Math.abs(prec[1]-cur[1])>1e-6) {
                        let found=false;
                        for(let poly2 of splitpolys) {
                            if(poly!=poly2) {
                                let prec2 = poly2[poly2.length-1];
                                for(let cur2 of poly2) {

                                    if( (Math.abs(prec2[0]-cur[0])<1e-6 && Math.abs(prec2[1]-cur[1])<1e-6 && Math.abs(cur2[0]-prec[0])<1e-6 && Math.abs(cur2[1]-prec[1]) < 1e-6)) {
                                        found=true;
                                        break;
                                    }
                                    prec2=cur2;
                                }
                                if(found)
                                    break;
                            }
                        }

                        if(!found) {
                            edges.push([prec,cur]);
                        } else {
                            removed++;
                        }
                    }
                    prec = cur;
                }
            }
            //console.log(removed);
            //console.log(edges);
            let edge = edges[0];
            mesh.contour.push(geoToXYZ(edge[0]));
            let next=edge[1];
            edges.splice(0,1);
            while(edges.length>0) {
                let i=0;
                let found=false;
                for(let edge of edges) {
                    if(next == edge[0]) {
                        mesh.contour.push(geoToXYZ(edge[0]));
                        next = edge[1];
                        edges.splice(i,1);
                        //console.log(edges.length, next);
                        found=true;
                        break;
                    }
                    i++;
                }
                if(!found) {
                    let edge = edges[0];
                    mesh.contour.push(geoToXYZ(edge[0]));
                    let next=edge[1];
                    edges.splice(0,1);
                }
            }
          }
        }
      }
    }
  }
}

function geoToXYZ(geo) {
  const lon=geo[0];
  const lat=geo[1];
  //opengl x,y,z coordinate system
  return [
    Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180),
    Math.sin(lat*Math.PI/180),
    Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180),
   ];
}

//split an array of polygons with regularly spaced lines
function splitPolygonsLines(polygons, start, end, splitlen, axis) {

    let rayOrigin=[0,0];

    let rayDir=[0,0];
    rayDir[1-axis]=1;

    let splitpolys = polygons.slice();

    for(let xsplit=start; xsplit<=end; xsplit+=splitlen) {
      let newsplitpolys=[];
      //console.log("x-split "+xsplit);
      for(let p of splitpolys) {
        //check if this poly intersects with line
        let bb2 = bbox(p);
        if(bb2.min[axis]<xsplit && bb2.max[axis]>xsplit) {
          try {
            rayOrigin[axis]=xsplit+1e-3;
            let newsplitpolysTmp = splitPolygon(p, rayOrigin, rayDir);
            for(let sp of newsplitpolysTmp) {
              newsplitpolys.push(sp);
            }
          } catch (err) {
            console.warn("could not split poly", err);
            newsplitpolys.push(p);
          }
        } else {
          newsplitpolys.push(p);
        }
      }
      splitpolys = newsplitpolys;
      //console.log("after split "+splitpolys.length);
    }

    return splitpolys;
}