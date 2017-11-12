const test=require('tape');
const {cutPolyLine}=require('./utils.js');

var poly=[[1,1],[2,5],[3,3],[4,5],[5,2],[4,6],[2,6]];


test('1', function (t) {

	cutPolyLine(poly, [3.5,0], [0,1]);
	t.end();
});

test('2', function (t) {
	cutPolyLine(poly, [0,4], [1,0]);
	t.end();
});

test('3', function (t) {
	//spliting line containing one vertex
	cutPolyLine(poly, [0,3], [1,0]);
	t.end();
});

test('4', function (t) {
	//spliting line containing two vertices
	cutPolyLine(poly, [0,5], [1,0]);
	t.end();
});

test('5', function (t) {
	//spliting line containing one edge
	cutPolyLine(poly, [0,6], [1,0]);
	t.end();
});
