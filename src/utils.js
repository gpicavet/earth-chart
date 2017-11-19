'use strict';

function bbox(vertcoords, dim=2) {
	var res ={
		min: [],
		max: []
	};
	res.min.length=dim;
	res.max.length=dim;
	for(var ivert=0; ivert<vertcoords.length; ivert+=dim) {
		for(var idim=0; idim<dim; idim++) {
			var axisc=vertcoords[ivert+idim];
			if(axisc<min[idim])
				min[idim]=axisc;
			if(axisc>max[idim])
				max[idim]=axisc;
		}
	}
	return res;
}

function cutPolyLine2D(poly, rayOrig, rayDir) {
	if(!poly || poly.length<3)
		throw "poly must have at least 3 vertices";

	var res = [];
	var interPoints = [];
	var crossbacks = [];

	var start=poly[poly.length-1];
	for(var ivert=0; ivert<poly.length; ivert++) {
		var end=poly[ivert];

		//inter = start + s * (end-start)
		//s = (rayOrig-start) dot (-rayDir.y, rayDir.x) / (end-start) dot (-rayDir.y, rayDir.x)
		//inter in edge if s>=0 && s<=1
		var edgeDir = [end[0]-start[0], end[1]-start[1]];
		var den = rayDir[0] * edgeDir[1] - rayDir[1] * edgeDir[0];
		if(den!=0) {
			var num = rayDir[0] * (rayOrig[1] - start[1]) - rayDir[1] * (rayOrig[0] - start[0]);
			var s = num / den;

			if(s>=0 && s<=1) {
				var p = [
					start[0] + s * edgeDir[0],
					start[1] + s * edgeDir[1]
				];
				//inter = rayOrig + t * rayDir
				//t = det((end-start),(rayOrig-start)) / (end-start) dot (-rayDir.y, rayDir.x)
				num = edgeDir[0] * (rayOrig[1] - start[1]) - edgeDir[1] * (rayOrig[0] - start[0]);
				var t = num / den;
				interPoints.push({p:p,t:t});
			}

		}
		start = end;
	}

	//sort inter points by distance to the ray origin
	interPoints.sort(function(a,b) {
		if(a.t<b.t)
			return -1;
		if(a.t>b.t)
			return 1;
		return 0;
	});
	console.log(interPoints);

	var start=poly[poly.length-1];
	for(var ivert=0; ivert<poly.length; ivert++) {
		var end=poly[ivert];
		start = end;
	}

	return res;
}

module.exports = {
	bbox,
	cutPolyLine2D
}
