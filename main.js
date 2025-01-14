'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightVis;
let relativeVis;
let textureRelative = [0.5, 0.5]
let camera;
let ui;
const { tan, PI } = Math;

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        this.count = vertices.length / 3;
    }

    this.NormalBufferData = function (normals) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);
    }

    this.TextureBufferData = function (textures) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

// Constructor
function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV * PI / 180.0;
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;

    this.ApplyLeftFrustum = function () {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -b * this.mNearClippingDistance / this.mConvergence;
        right = c * this.mNearClippingDistance / this.mConvergence;

        // Set the Projection Matrix
        // glMatrixMode(GL_PROJECTION)
        // glLoadIdentity();
        // glFrustum(left, right, bottom, top,
        //     mNearClippingDistance, mFarClippingDistance);
        this.projection = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance);

        // Displace the world to right
        // glMatrixMode(GL_MODELVIEW);
        // glLoadIdentity();
        // glTranslatef(mEyeSeparation / 2, 0.0, 0.0);
        this.view = m4.translation(this.mEyeSeparation / 2, 0.0, 0.0);
    }

    this.ApplyRightFrustum = function () {
        let top, bottom, left, right;

        top = this.mNearClippingDistance * tan(this.mFOV / 2);
        bottom = -top;

        const a = this.mAspectRatio * tan(this.mFOV / 2) * this.mConvergence;

        const b = a - this.mEyeSeparation / 2;
        const c = a + this.mEyeSeparation / 2;

        left = -c * this.mNearClippingDistance / this.mConvergence;
        right = b * this.mNearClippingDistance / this.mConvergence;

        // Set the Projection Matrix
        // glMatrixMode(GL_PROJECTION);
        // glLoadIdentity();
        // glFrustum(left, right, bottom, top,
        //     mNearClippingDistance, mFarClippingDistance);
        this.projection = m4.frustum(left, right, bottom, top,
            this.mNearClippingDistance, this.mFarClippingDistance);

        // Displace the world to left
        // glMatrixMode(GL_MODELVIEW);
        // glLoadIdentity();
        // glTranslatef(-mEyeSeparation / 2, 0.0, 0.0);
        this.view = m4.translation(-this.mEyeSeparation / 2, 0.0, 0.0);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.orthographic(-1, 1, -1, 1, -1, 1);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -3);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

    let a = hexToRgb(document.getElementById('ambient').value)
    gl.uniform3fv(shProgram.iAmbientColor, [a.r, a.g, a.b]);
    let d = hexToRgb(document.getElementById('diffuse').value)
    gl.uniform3fv(shProgram.iDiffuseColor, [d.r, d.g, d.b]);
    let s = hexToRgb(document.getElementById('specular').value)
    gl.uniform3fv(shProgram.iSpecularColor, [s.r, s.g, s.b]);

    gl.uniform3fv(shProgram.iLightPosition, [0.75 * Math.sin(Date.now() * 0.001), 0.25 * Math.cos(Date.now() * 0.001), 0.5]);
    gl.uniform3fv(shProgram.iRelativePosition, parabolicHummingTop(textureRelative[0], textureRelative[1]));
    gl.uniform2fv(shProgram.iTextureRelative, [map(textureRelative[0], -h, h, 0, 1), map(textureRelative[1], 0, 2 * Math.PI, 0, 1)]);
    gl.uniform1f(shProgram.iAngleOfRotation, parseFloat(document.getElementById('angleOfRotation').value));
    camera.ApplyLeftFrustum();
    modelViewProjection = m4.multiply(camera.projection, m4.multiply(camera.view, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(true, false, false, false);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    camera.ApplyRightFrustum();
    modelViewProjection = m4.multiply(camera.projection, m4.multiply(camera.view, matAccum1));
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.colorMask(false, true, true, false);
    surface.Draw();
    gl.colorMask(true, true, true, true);


    // gl.uniform1i(shProgram.iTranslateLight, true);
    // lightVis.Draw();
    // gl.uniform1i(shProgram.iTranslateLight, false);
    // gl.uniform1i(shProgram.iTranslateRelative, true);
    // relativeVis.Draw();
    // gl.uniform1i(shProgram.iTranslateRelative, false);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255.0,
        g: parseInt(result[2], 16) / 255.0,
        b: parseInt(result[3], 16) / 255.0
    } : null;
}

function draw2() {
    draw()
    window.requestAnimationFrame(draw2)
}

const h = 1;
const p = 1;
function CreateSurfaceData() {
    let vertexList = [];
    let z = -h;
    let i = 0;
    const step = 0.1

    while (z < h) {
        while (i < 2 * Math.PI) {
            vertexList.push(...parabolicHummingTop(z, i))
            vertexList.push(...parabolicHummingTop(z + step, i))
            vertexList.push(...parabolicHummingTop(z, i + step))
            vertexList.push(...parabolicHummingTop(z, i + step))
            vertexList.push(...parabolicHummingTop(z + step, i))
            vertexList.push(...parabolicHummingTop(z + step, i + step))
            i += step
        }
        i = 0;
        z += step
    }

    return vertexList;
}

function CalculateNormals() {
    let vertexList = [];
    let z = -h;
    let i = 0;
    const step = 0.1

    while (z < h) {
        while (i < 2 * Math.PI) {
            vertexList.push(...calcNormal(z, i, step))
            vertexList.push(...calcNormal(z + step, i, step))
            vertexList.push(...calcNormal(z, i + step, step))
            vertexList.push(...calcNormal(z, i + step, step))
            vertexList.push(...calcNormal(z + step, i, step))
            vertexList.push(...calcNormal(z + step, i + step, step))
            i += step
        }
        i = 0;
        z += step
    }

    return vertexList;
}

function parabolicHummingTop(z, i) {
    let x = (Math.pow(Math.abs(z) - h, 2) / (2 * p)) * Math.cos(i)
    let y = (Math.pow(Math.abs(z) - h, 2) / (2 * p)) * Math.sin(i)
    let parabolicZ = z
    return [x, y, parabolicZ]
}

function calcNormal(z, i, step) {
    let v0 = parabolicHummingTop(z, i);
    let v1 = parabolicHummingTop(z + step, i);
    let v2 = parabolicHummingTop(z, i + step);
    let v3 = parabolicHummingTop(z - step, i + step);
    let v4 = parabolicHummingTop(z - step, i);
    let v5 = parabolicHummingTop(z - step, i - step);
    let v6 = parabolicHummingTop(z, i - step);
    let v01 = m4.subtractVectors(v1, v0)
    let v02 = m4.subtractVectors(v2, v0)
    let v03 = m4.subtractVectors(v3, v0)
    let v04 = m4.subtractVectors(v4, v0)
    let v05 = m4.subtractVectors(v5, v0)
    let v06 = m4.subtractVectors(v6, v0)
    let n1 = m4.normalize(m4.cross(v01, v02))
    let n2 = m4.normalize(m4.cross(v02, v03))
    let n3 = m4.normalize(m4.cross(v03, v04))
    let n4 = m4.normalize(m4.cross(v04, v05))
    let n5 = m4.normalize(m4.cross(v05, v06))
    let n6 = m4.normalize(m4.cross(v06, v01))
    let n = [(n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
    (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
    (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0]
    n = m4.normalize(n);
    return n;
}

function CreateLightVisData() {
    let vertexList = [];
    let normalList = [];

    let u = 0;
    let t = 0;
    while (u < Math.PI * 2) {
        while (t < Math.PI) {
            let v1 = getSphereVertex(u, t);
            let v2 = getSphereVertex(u + 0.1, t);
            let v3 = getSphereVertex(u, t + 0.1);
            let v4 = getSphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v1.x, v1.y, v1.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v3.x, v3.y, v3.z);
            vertexList.push(v2.x, v2.y, v2.z);
            vertexList.push(v4.x, v4.y, v4.z);
            t += 0.1;
        }
        t = 0;
        u += 0.1;
    }
    return vertexList;
}
let r = 0.05;
function getSphereVertex(long, lat) {
    return {
        x: r * Math.cos(long) * Math.sin(lat),
        y: r * Math.sin(long) * Math.sin(lat),
        z: r * Math.cos(lat)
    }
}

function map(value, a, b, c, d) {
    value = (value - a) / (b - a);
    return c + value * (d - c);
}

function CreateTextureData() {
    let vertexList = [];
    let z = -h;
    let i = 0;
    const step = 0.1

    while (z < h) {
        while (i < 2 * Math.PI) {
            vertexList.push(map(z, -h, h, 0, 1), map(i, 0, 2 * Math.PI, 0, 1))
            vertexList.push(map(z + step, -h, h, 0, 1), map(i, 0, 2 * Math.PI, 0, 1))
            vertexList.push(map(z, -h, h, 0, 1), map(i + step, 0, 2 * Math.PI, 0, 1))
            vertexList.push(map(z, -h, h, 0, 1), map(i + step, 0, 2 * Math.PI, 0, 1))
            vertexList.push(map(z + step, -h, h, 0, 1), map(i, 0, 2 * Math.PI, 0, 1))
            vertexList.push(map(z + step, -h, h, 0, 1), map(i + step, 0, 2 * Math.PI, 0, 1))
            i += step
        }
        i = 0
        z += step
    }
    console.log(vertexList)
    return vertexList;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientComponent");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseComponent");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularComponent");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iTranslateLight = gl.getUniformLocation(prog, "translateLight");
    shProgram.iRelativePosition = gl.getUniformLocation(prog, "relativePosition");
    shProgram.iTranslateRelative = gl.getUniformLocation(prog, "translateRelative");
    shProgram.iTextureRelative = gl.getUniformLocation(prog, "textureRelative");
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');
    shProgram.iAngleOfRotation = gl.getUniformLocation(prog, 'angleOfRotation');

    LoadTexture()

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    surface.NormalBufferData(CalculateNormals());
    console.log(CalculateNormals())
    surface.TextureBufferData(CreateTextureData());
    lightVis = new Model('Light Visualisation')
    let lightVisData = CreateLightVisData()
    lightVis.BufferData(lightVisData)
    lightVis.NormalBufferData(lightVisData)
    lightVis.TextureBufferData(lightVisData)
    relativeVis = new Model('Light Visualisation')
    let relativeVisData = CreateLightVisData()
    relativeVis.BufferData(relativeVisData)
    relativeVis.NormalBufferData(relativeVisData)
    relativeVis.TextureBufferData(relativeVisData)

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    ui = new dat.GUI()
    console.log(ui)
    camera = new StereoCamera(10, 0.1, 1, 90, 0.1, 100);
    ui.add(camera, 'mConvergence', 10, 1000)
    ui.add(camera, 'mEyeSeparation', 0, 10)
    ui.add(camera, 'mFOV', 0, 3.14)
    ui.add(camera, 'mNearClippingDistance', 0.1, 20)
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw2();
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://raw.githubusercontent.com/Vsev1/visualization/CGW/source/repos/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        console.log("imageLoaded")
        draw()
    }
}

window.onkeydown = (e) => {
    // console.log(e.keyCode)
    const step = 0.1;
    if (e.keyCode == 87) { //w
        textureRelative[0] = Math.min(textureRelative[0] + step, h);
    }
    else if (e.keyCode == 65) { //a
        textureRelative[1] = Math.max(textureRelative[1] - step, 0);
    }
    else if (e.keyCode == 83) { //s
        textureRelative[0] = Math.max(textureRelative[0] - step, -h);
    }
    else if (e.keyCode == 68) { //d
        textureRelative[1] = Math.min(textureRelative[1] + step, 2 * Math.PI);
    }
}
