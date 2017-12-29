'use strict';

function bbox(vertcoords) {
	var res ={
		min: [1E99,1E99],
		max: [-1E99,-1E99]
	};
	for(let v of vertcoords) {
		for(var idim=0; idim<v.length; idim++) {
			var c = v[idim];
			if(c < res.min[idim])
				res.min[idim] = c;
			if(c > res.max[idim])
				res.max[idim] = c;
		}
	}
	return res;
}

module.exports = {
	bbox
}
