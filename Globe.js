var VSHADER_SOURCE =
	'attribute vec4 a_Position;' +
	'attribute vec2 a_TexCoord;' +
	'attribute vec4 a_Color;' +
	'varying vec4 v_Color;' +
	'uniform mat4 u_mvpMatrix;' +
	'uniform mat4 u_viewMatrix;' +
	'varying vec2 v_TexCoord;' +
	'void main(){' +
	'  gl_Position = u_viewMatrix * u_mvpMatrix * a_Position;' +
	'  v_TexCoord = a_TexCoord;' +
	'  v_Color = a_Color;' +
	'}';

var FSHADER_SOURCE =
	'#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	'#endif\n' +
	'varying vec4 v_Color;' +
	'uniform sampler2D u_Sampler;' +
	'varying vec2 v_TexCoord;' +
	'void main(){' +
	'  gl_FragColor =  v_Color;' + //texture2D(u_Sampler,v_TexCoord);'+
	// 'vec4 textureColor = texture2D(u_Sampler, vec2(v_TexCoord.s, v_TexCoord.t));'+
	// 'gl_FragColor = vec4(textureColor.rgb, textureColor.a);'+
	'}';

var globe = {
	latBands: 50,
	lonBands: 50,
	positions: [],
	indices: [],
	textureCoord: []
};

var eyePoint = [0.0, 0.0, 5.0]; //视点
var angle_step = 30.0; //旋转速度
var currentAngle = 0.0; //当前角度
var g_last = Date.now();

(function() {
	var $ = function(id) {
		return "string" == typeof id ? document.getElementById(id) : id;
	};

	var gl = $("myCanvas").getContext("webgl");
	if (!gl) {
		alert("webGL加载错误！");
		return;
	}

	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		alert("着色器初始化失败！");
		return;
	}

	if (!coordinate()) {
		alert("三角形和纹理坐标创建失败！");
		return;
	}

	if (!vertexIndex()) {
		alert("三角形索引创建失败！");
		return;
	}

	var n = initVertexBuffers(gl);
	if (n < 0) {
		alert("顶点初始化失败！");
		return;
	}

	var u_mvpMatrix = gl.getUniformLocation(gl.program, 'u_mvpMatrix');
	var u_viewMatrix = gl.getUniformLocation(gl.program, 'u_viewMatrix');

	var mvpMatrix = new Matrix4();
	var viewMatrix = new Matrix4();

	viewMatrix.setPerspective(60, 1, 0.1, 100);
	viewMatrix.lookAt(0, 0, 1, 0, 0, 0, 0, 1, 0);
	gl.uniformMatrix4fv(u_viewMatrix, false, viewMatrix.elements);

	//document.onkeydown = function(ev){keydown(ev,gl,n,u_mvpMatrix,mvpMatrix);};

	//if(!initTextures(gl, n)){alert("纹理初始化失败！");return;}

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	//开始绘制
	var tick = function() {
		currentAngle = animate(currentAngle);
		drawBall(gl, n, currentAngle, u_mvpMatrix, mvpMatrix);
		requestAnimationFrame(tick);
	};

	tick();

})();

function animate(angle) {
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;

	var newAngle = angle + (angle_step * elapsed) / 1000.0;
	return newAngle %= 360; //旋转角度<360
}

function drawBall(gl, n, currentAngle, u_mvpMatrix, mvpMatrix) {

	mvpMatrix.setRotate(currentAngle, 0, 1, 0);
	gl.uniformMatrix4fv(u_mvpMatrix, false, mvpMatrix.elements);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0); //gl.TRIANGLES,gl.TRIANGLE_STRIP

}

//顶点及纹理坐标
function coordinate() {
	for (var i = 0; i <= globe.latBands; i++) {
		var lat = i * Math.PI / globe.latBands, //纬度范围
			sinLat = Math.sin(lat),
			cosLat = Math.cos(lat);

		for (var j = 0; j <= globe.lonBands; j++) {
			var lon = j * 2 * Math.PI / globe.lonBands, //经度范围
				sinLon = Math.sin(lon),
				cosLon = Math.cos(lon);

			var x = cosLon * sinLat * 0.5, //r=0.5
				y = cosLat * 0.5,
				z = sinLon * sinLat * 0.5,
				u = 1 - (j / globe.lonBands),
				v = 1 - (i / globe.latBands);

			//VertexCoordinate
			globe.positions.push(x);
			globe.positions.push(y);
			globe.positions.push(z);

			//VertexColor
			globe.positions.push(Math.random());
			globe.positions.push(Math.random());
			globe.positions.push(Math.random());

			//textureCoordCoordinate
			globe.textureCoord.push(u);
			globe.textureCoord.push(v);
		}
	}
	return true;
};

//三角形顶点索引
function vertexIndex() {
	for (var k = 0; k < globe.latBands; k++) {
		for (var n = 0; n < globe.lonBands; n++) {
			var v1 = k * (globe.lonBands + 1) + n,
				v2 = v1 + globe.lonBands + 1;

			globe.indices.push(v1);
			globe.indices.push(v2);
			globe.indices.push(v1 + 1);

			globe.indices.push(v2);
			globe.indices.push(v2 + 1);
			globe.indices.push(v1 + 1);
		}
	}
	return true;
};

//初始化顶点和索引
function initVertexBuffers(gl) {

	var verticesColor = new Float32Array(globe.positions);
	var indices = new Uint16Array(globe.indices);

	var vertexColorBuffer = gl.createBuffer();
	var vertexIndex = gl.createBuffer();

	var FSIZE = verticesColor.BYTES_PER_ELEMENT;

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, verticesColor, gl.STATIC_DRAW);

	var a_Position = gl.getAttribLocation(gl.program, "a_Position");
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
	gl.enableVertexAttribArray(a_Position);

	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
	gl.enableVertexAttribArray(a_Color);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndex);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	initTexCoordBuffer(gl);

	return indices.length;
}

//初始化纹理坐标
function initTexCoordBuffer(gl) {
	var texCoord = new Float32Array(globe.textureCoord);
	var texCoordBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, texCoord, gl.STATIC_DRAW);

	var a_TexCoord = gl.getAttribLocation(gl.program, "a_TexCoord");

	gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray("a_TexCoord");
}

//初始化纹理
function initTextures(gl, n) {
	var texture = gl.createTexture();
	if (!texture) {
		alert("纹理对象创建失败！");
		return;
	}

	var u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
	if (!u_Sampler) {
		alert("获取u_Sampler的存储位置失败！");
		return false;
	}

	var image = new Image();
	if (!image) {
		alert("图片对象创建失败！");
		return false;
	}

	image.src = "./resource/globe.jpg";

	image.onload = function() {
		loadTexture(gl, n, texture, u_Sampler, image);
	}

	return true;
}

//加载纹理
function loadTexture(gl, n, texture, u_Sampler, image) {
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.activeTexture(gl.TEXTURE0);

	gl.bindTexture(gl.TEXTURE_2D, texture);

	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

	gl.uniform1i(u_Sampler, 0);
}