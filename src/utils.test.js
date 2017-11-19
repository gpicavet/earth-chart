const test=require('tape');
const {cutPolyLine2D}=require('./utils.js');

var poly=[[1,1],[2,5],[3,3],[4,5],[5,2],[4,6],[2,6]];


test('1', function (t) {
	//vertical line cutting 2 edges
	cutPolyLine2D(poly, [3.5,0], [0,1]);
	t.end();
});

test('2', function (t) {
	//horizontal line cutting 6 edges
	cutPolyLine2D(poly, [0,4], [1,0]);
	t.end();
});

test('3', function (t) {
	//spliting line containing one vertex
	cutPolyLine2D(poly, [0,3], [1,0]);
	t.end();
});

test('4', function (t) {
	//spliting line containing two vertices
	cutPolyLine2D(poly, [0,5], [1,0]);
	t.end();
});

test('5', function (t) {
	//spliting line containing one edge
	cutPolyLine2D(poly, [0,6], [1,0]);
	t.end();
});
