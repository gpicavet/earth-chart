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

function cutPolyLine(poly, linePoint, lineDir) {
	if(!poly || poly.length<3)
		throw "poly must have at least 3 vertices";

	var res = [];
	var interPoints = [];
	var crossbacks = [];

	var start=poly[poly.length-1];
	for(var ivert=0; ivert<poly.length; ivert++) {
		var end=poly[ivert];

		var edgeDir = [end[0]-start[0], end[1]-start[1]];
		var det = lineDir[0] * edgeDir[1] - lineDir[1] * edgeDir[0];
		if(det!=0) {

			var s = (lineDir[1] * (linePoint[0] - start[0]) - lineDir[0] * (linePoint[1] - start[1])) / det;

			if(s>=0 && s<=1) {
				var p = [
					start[0] + s * edgeDir[0],
					start[1] + s * edgeDir[1]
				];
				var t = (edgeDir[1] * (linePoint[0] - start[0]) - edgeDir[0] * (linePoint[1] - start[1])) / det;
				interPoints.push({p:p,t:t});
				console.log(t);
			}

		}
		start = end;
	}

	interPoints.sort(function(a,b) {
		if(a.t<b.t)
			return -1;
		if(a.t>b.t)
			return 1;
		return 0;
	});

	var start=poly[poly.length-1];
	for(var ivert=0; ivert<poly.length; ivert++) {
		var end=poly[ivert];
		start = end;
	}

	return res;
}

module.exports = {
	bbox,
	cutPolyLine
}
