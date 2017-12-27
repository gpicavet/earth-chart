var fs = require('fs');
var xml2js = require('xml2js');

var earcut = require('earcut');

const {bbox, cutPolyLine2D}=require('./utils.js');

var parser = new xml2js.Parser();
fs.readFile(__dirname + '/countries-world.kml', function(err, data) {
    if(err)
      throw err;

    parser.parseString(data, function (err, result) {
        if(err)
          throw err;
        kml2mesh(result,__dirname + "/../public/data/countries-world.json");
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

            let splitpolys = [geocoords];
            let splitlen=5;
            //cut with vertical line
            for(let xsplit=-360; xsplit<360; xsplit+=splitlen) {
              let newsplitpolys=[];
              //console.log("x-split "+xsplit);
              for(let p of splitpolys) {
                //check if this poly intersects with line
                var bb2 = bbox(p);
                if(bb2.min[0]<xsplit && bb2.max[0]>xsplit) {
                  try {
                    let newsplitpolysTmp = cutPolyLine2D(p, [xsplit+1e-3, 0], [0, 1]);
                    for(let sp of newsplitpolysTmp) {
                      newsplitpolys.push(sp);
                    }
                  } catch (err) {
                    newsplitpolys.push(p);
                  }
                } else {
                  newsplitpolys.push(p);
                }
              }
              splitpolys = newsplitpolys;
              //console.log("after split "+splitpolys.length);
            }
            //cut with horizontal line
            for(let ysplit=-90; ysplit<90; ysplit+=splitlen) {
              let newsplitpolys=[];
              //console.log("y-split "+ysplit);
              for(let p of splitpolys) {
                //check if this poly intersects with line
                var bb2 = bbox(p);
                if(bb2.min[1]<ysplit && bb2.max[1]>ysplit) {
                  try {
                    let newsplitpolysTmp = cutPolyLine2D(p, [0, ysplit+1e-3], [1, 0]);
                    for(let sp of newsplitpolysTmp) {
                      newsplitpolys.push(sp);
                    }
                  } catch (err) {
                    newsplitpolys.push(p);
                  }
                } else {
                  newsplitpolys.push(p);
                }
              }
              splitpolys = newsplitpolys;
              //console.log("after split "+splitpolys.length);
            }

            //triangulate and convert to x,y,z
            let faceOffset=0;
            let mesh={contour:[], vertices:[], faces:[]};
            out.polygons.push(mesh);
            for(let splitpoly of splitpolys) {
              if(splitpoly.length>0) {

                //triangulate this polygon in order to facilitate GPU rendering
                let polyflat = [];
                for(let v of splitpoly) {
                  polyflat.push(v[0], v[1]);
                }
                var trianglesIndices = earcut(polyflat);

                //convert spherical geo coordinates to X,Y,Z space

                for(let v of splitpoly) {
                  let lon=v[0];
                  let lat=v[1];
                  //opengl x,y,z coordinate system
                  let x = Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180);
                  let y = Math.sin(lat*Math.PI/180);
                  let z = Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180);

                  mesh.vertices.push([x,y,z]);

                }

                for(var itri=0; itri<trianglesIndices.length; itri+=3) {
                  mesh.faces.push( [faceOffset+trianglesIndices[itri], faceOffset+trianglesIndices[itri+1], faceOffset+trianglesIndices[itri+2]] );
                }


                faceOffset+=splitpoly.length;
              }
            }
            //initial contour
            for(let v of geocoords) {
              let lon=v[0];
              let lat=v[1];
              //opengl x,y,z coordinate system
              let x = Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180);
              let y = Math.sin(lat*Math.PI/180);
              let z = Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180);
              mesh.contour.push([x,y,z]);
            }
          }
        }
      }
    }
  }
}
