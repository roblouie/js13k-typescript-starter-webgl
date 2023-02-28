import { mat4 } from 'gl-matrix';

const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec4 aColor;

uniform mat4 modelViewProjection;
uniform mat4 depthBiasMvp;

out vec4 vColor;
out vec4 shadowCoord;

void main()
{
    vColor = aColor;
    gl_Position = modelViewProjection * aPosition;
    shadowCoord = depthBiasMvp * aPosition;
}`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec4 vColor;
in vec4 ShadowCoord;

uniform sampler2D shadowMap;

out vec4 fragColor;

void main()
{
    fragColor = vColor;
}`;

const depthVertexShader = `#version 300 es
layout(location=0) in vec4 aPosition;
uniform mat4 depthMvp;

void main(){
  gl_Position = depthMvp * aPosition;
}
`;

const depthFragmentShader = `#version 300 es
precision mediump float;

out float fragmentdepth;

void main(){
 fragmentdepth = gl_FragCoord.z;
}
`;

const gl = c3d.getContext('webgl2');


function createProgram(vertexShaderText: string, fragmentShaderText: string) {
  const program = gl.createProgram();

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderText);
  gl.compileShader(vertexShader);
  gl.attachShader(program, vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderText);
  gl.compileShader(fragmentShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  return program;
}

const program = createProgram(vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(depthVertexShader, depthFragmentShader);

gl.useProgram(program);

gl.enable(gl.DEPTH_TEST);

const cubes = new Float32Array([
  ...createCube(1, 1, 1, 0, -1, 0),
  ...createCube(0.3, 0.5, 0.1, 0, 0, 0)
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubes, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

// Depth Framebuffer
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, 512, 512, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const depthFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);


// Set Camera MVP Matrix
const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');

const model = mat4.create();
const view = mat4.lookAt(mat4.create(), [.6,.6,.6], [0,0,0], [0,1,0]);
const projection = mat4.perspective(mat4.create(), Math.PI / 3, 16 / 9, .1, 10);
const viewProjection = mat4.multiply(mat4.create(), projection, view);
const modelViewProjection = mat4.multiply(mat4.create(), model, viewProjection);
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection);


// Set Light MVP Matrix
const depthMvpLocation = gl.getUniformLocation(depthProgram, 'depthMvp');
const inverseLightDirection = new DOMPoint(0.5, 2, 2);
const depthProjectionMatrix = mat4.ortho(mat4.create(), -10,10,-10,10,-10,20);
const depthViewMatrix = mat4.lookAt(mat4.create(), [inverseLightDirection.x, inverseLightDirection.y, inverseLightDirection.z], [0,0,0], [0,1,0]);
const depthMvp = mat4.multiply(mat4.create(), depthProjectionMatrix, depthViewMatrix);
gl.useProgram(depthProgram);
gl.uniformMatrix4fv(depthMvpLocation, false, depthMvp);

export const draw = () => {
  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.viewport(0, 0, 512, 512);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 72);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);
  gl.drawArrays(gl.TRIANGLES, 0, 72);
};


function createCube(width: number, height: number, depth: number, x: number, y: number, z: number) {
  return new Float32Array([
    -width + x,-height + y,-depth + z,   0,1,1,
    -width + x, height + y, depth + z,   0,1,1,
    -width + x, height + y,-depth + z,   0,1,1,
    -width + x, -height + y, depth + z,   0,1,1,
    -width + x, height + y, depth + z,   0,1,1,
    -width + x,-height + y,-depth + z,   0,1,1,

    width + x ,-height + y,-depth + z,   1,0,1,
    width + x , height + y,-depth + z,   1,0,1,
    width + x , height + y, depth + z,   1,0,1,
    width + x , height + y, depth + z,   1,0,1,
    width + x ,-height + y, depth + z,   1,0,1,
    width + x ,-height + y,-depth + z,   1,0,1,

    -width + x,-height + y,-depth + z,   0,1,0,
    width + x,-height + y,-depth + z,   0,1,0,
    width + x,-height + y, depth + z,   0,1,0,
    width + x,-height + y, depth + z,   0,1,0,
    -width + x,-height + y, depth + z,   0,1,0,
    -width + x,-height + y,-depth + z,   0,1,0,

    -width + x, height + y,-depth + z,   1,1,0,
    width + x, height + y, depth + z,   1,1,0,
    width + x, height + y,-depth + z,   1,1,0,
    -width + x, height + y, depth + z,   1,1,0,
    width + x, height + y, depth + z,   1,1,0,
    -width + x, height + y,-depth + z,   1,1,0,

    width + x,-height + y,-depth + z,   0,0,1,
    -width + x,-height + y,-depth + z,   0,0,1,
    width + x, height + y,-depth + z,   0,0,1,
    -width + x, height + y,-depth + z,   0,0,1,
    width + x, height + y,-depth + z,   0,0,1,
    -width + x,-height + y,-depth + z,   0,0,1,

    -width + x,-height + y, depth + z,   1,0,0,
    width + x,-height + y, depth + z,   1,0,0,
    width + x, height + y, depth + z,   1,0,0,
    width + x, height + y, depth + z,   1,0,0,
    -width + x, height + y, depth + z,   1,0,0,
    -width + x,-height + y, depth + z,   1,0,0,
  ]);
}
