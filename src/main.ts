import {vec3, vec4, mat4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Particle from './Particle';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import Mesh from './geometry/Mesh';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  particles3 : 25,
  mouseCtrls : 'camera',
  'Load Scene': loadScene, // A function pointer, essentially
};

let square: Square;
let particles : Particle;
let time: number = 0.0;
let offsetsArray : Array<number>;
let colorsArray : Array<number>;

// OBJ loader
// let OBJ = require('webgl-obj-loader');
let mesh: Mesh;

function loadScene() {
  // mesh = new Mesh(vec3.fromValues(0, 0, 0));
  // mesh.loadBuffers('square.obj');
  // mesh.create();

  square = new Square();
  square.create();

  // get offsets and colors from particles class
  offsetsArray = particles.expPos;
  colorsArray = particles.expCol;
  
}

/// MOUSE CONTROLS

// camera for mouse controls
let mouseCam : Camera;
let ctrlPoint : vec3; // conversgence/divergence point

// why isn't there a gosh darn MULTIPLICATION FUNCTION FOR MAT4S AND VEC4S KILL ME
function multiply(m : mat4, v : vec4) {
  let product = vec4.fromValues(v[0] * m[0] + v[1] * m[4] + v[2] * m[8] + v[3] * m[12],
                                v[0] * m[1] + v[1] * m[5] + v[2] * m[9] + v[3] * m[13],
                                v[0] * m[2] + v[1] * m[6] + v[2] * m[10] + v[3] * m[14],
                                v[0] * m[3] + v[1] * m[7] + v[2] * m[11] + v[3] * m[15]);

  return product;
}

// converts 2d mouse pos to 3d world space pos
function getPoint(mouseX : number, mouseY : number) {  

  
  let currPos = mouseCam.position;

  // convert to NDC space
  let x = 2.0 * (mouseX / window.innerWidth) - 1.0;
  let y = 1.0 - 2.0 * (mouseY / window.innerHeight);
  let z = 0.0;

  // NDC space
  let pNDC = vec3.fromValues(x, y, z);

  // unhomogenized screen space
  let pSS = vec4.fromValues(pNDC[0], pNDC[1], -1.0, 1.0);

  // projection matrix
  let invProjMat = mat4.create();
  mat4.invert(invProjMat, mouseCam.projectionMatrix);

  // convert to camera space
  let pCam = multiply(invProjMat, pSS);
  pCam = vec4.fromValues(pCam[0], pCam[1], -1.0, 1.0);

  // v
  let invViewMat = mat4.create();
  mat4.invert(invViewMat, mouseCam.viewMatrix);
  let pWorld = multiply(invViewMat, pCam);
  
  // convert to vec3....
  let p = vec3.fromValues(pWorld[0], pWorld[1], pWorld[2]);
  vec3.normalize(p, p);

  // Need distance from camera to origin (the camera position)
  // Project this value along the ray by length of position vector (?)
  vec3.scale(p, p, mouseCam.position.length);

  p[2] = mouseCam.target[2];

  return p;
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'particles3', 10, 50).step(1);
  gui.add(controls, 'mouseCtrls', ['camera', 'particle motion']);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // initialize particles
  particles = new Particle(controls.particles3);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, -50), vec3.fromValues(-5, -5, -1));
  mouseCam = camera;
  ctrlPoint = vec3.create();

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.1, 0.1, 0.1, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {

    // set mouse event
    if (controls.mouseCtrls == "particle motion") {
      canvas.onmousedown = function(event) {
        var mouseX = event.clientX;
        var mouseY = event.clientY;

        // mouseX -= canvas.offsetLeft;
        // mouseY -= canvas.offsetTop;

        // let angle = Math.tan(Math.PI * 0.5 * camera.fovy / 180.);
        // let dist = vec3.dist(camera.position, camera.target);
        // let xx = vec3.scale(vec3.create(), camera.right, dist * (2 * (mouseX * 1 / canvas.width) - 1) * angle * camera.aspectRatio);
        // let yy = vec3.scale(vec3.create(), camera.up, dist * (1 - 2 * (mouseY * 1 / canvas.height)) * angle);
        // let point = vec3.add(vec3.create(), xx, yy);
        // vec3.add(point, point, camera.target);
          
        // set convergence point
        ctrlPoint = getPoint(mouseX, mouseY);
        console.log(ctrlPoint);
  
        // left click == 0, right click == 2
        if (event.button == 0) {
          particles.attract = true;
          particles.repel = false;
        } else if (event.button == 2) {
          particles.attract = false;
          particles.repel = true;
        }
        // set control point
        particles.ctrlPoint = ctrlPoint;
      }
  
      canvas.onmouseup = function(event) {
        particles.attract = false;
        particles.repel = false;
      }
    } else {
      particles.attract = false;
      particles.repel = false;
      camera.update();
    }

    // update particles
    particles.updateEuler(time * 0.1);

    // reset positions
    offsetsArray = particles.expPos;

    // draw particles
    square.setInstanceVBOs(new Float32Array(offsetsArray), new Float32Array(colorsArray));
    square.setNumInstances(particles.count);
    
    
    
    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);


    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);

   
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
