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
import Drawable from './rendering/gl/Drawable';

/////// MESH LOADING ///////

let mesh_id : number = 0;
let mesh: Mesh = new Mesh();
let heart: Mesh = new Mesh();
let cat: Mesh = new Mesh();
let surprise: Mesh = new Mesh();


let mesh_list: any = {
  'none': null,
  'heart' : heart,
  'cat' : cat,
  'surprise' : surprise
}

function readFile(file : string, mesh: Mesh) {
  let indices : Uint32Array = new Uint32Array(0);
  let positions : Float32Array = new Float32Array(0);
  let normals : Float32Array = new Float32Array(0);

  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", file, false);
  rawFile.onreadystatechange = function () {
        if(rawFile.readyState === 4) {
            if(rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                var verts : number[] = [];

                // break lines by new line 
                // we really only need vertices so that's all we're reading in
                var lines = allText.split('\n')
                for (var i = 0; i < lines.length; i++) {
                  // set vertices 
                  // convert to number...
                  if (lines[i].startsWith('v ')) {
                    var line = lines[i].split(/\s+/);
                    verts.push(+line[1]);
                    verts.push(+line[2]);
                    verts.push(+line[3]);
                  }
                }
                mesh.positions = Float32Array.from(verts);
            }
        }
    }
    rawFile.send(null);
}

function loadMesh() {
  for (var m in mesh_list) {
    if (mesh_list[m] != null) {
      let filename: string = "./" + m + ".obj";
      readFile(filename, mesh_list[m]);
    }
  }
}

///// PARTICLE INFORMATION ////

// initialize values
var numParticles : number = 10000;
var numTargets : number = 0;


// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'num. of particles' : numParticles,
  'scatter particles!' : scatterParticles, // calls the function!
  'mesh': 'none',
  'Load Scene': loadScene, // A function pointer, essentially
};

let square : Square;
let currMesh : Mesh = new Mesh();
let time : number = 0.0;

// mouse controls
let mousePressed : boolean = false;
let mouseX : number = null;
let mouseY : number = null;
let mouseClick : number = 0;

let particles : Particle[] = [];

// schooling stuff
var avg_heading : vec3;
var avg_pos : vec3;
var family : number;
var reverse : boolean;

let target : Particle = new Particle(vec3.fromValues(0, 0, 0), 
                                     vec3.fromValues(0, 0, 0), 
                                     vec3.fromValues(0, 0, 0));

// OBJ loader
var fs = require('fs');
var OBJ = require('webgl-obj-loader');

function loadScene() {
  square = new Square();
  square.create();

  // reset target number each time!
  numTargets = 0;
  particles = [];

  // push target onto the particle array
  particles.push(target);

  for (let i = 0; i < numParticles; ++i) {
    // get random position between -100 and 100
    let px = target.currPos[0] + 150 * Math.random() - 100;
    let py = target.currPos[0] + 150 * Math.random() - 100;
    let pz = target.currPos[0] + 150 * Math.random() - 100;

    // get random velocity between -1 and 1
    let vx = 2 * Math.random() - 1;
    let vy = 2 * Math.random() - 1;
    let vz = 2 * Math.random() - 1;

    // mass, currpos, nextpos, vel
    let p = new Particle(vec3.fromValues(px, py, pz), target.currPos, vec3.fromValues(vx, vy, vz));

    // push particle onto the array
    particles.push(p);
  }

  numTargets++;

  // UPDATE VBOS
  updateVBOs();
  
}

function attractMesh() {

  if (mesh == null) {
    // reset
    scatterParticles();
  } else {
    // assign attraction positions to mesh positions
    let verts : vec3[] = [];
    for (let i = 0; i < currMesh.positions.length; i  += 3) {
      let v : vec3 = vec3.fromValues(currMesh.positions[i],
                                     currMesh.positions[i + 1],
                                     currMesh.positions[i + 2]);

      if (mesh_id == 1) {
        vec3.scale(v, v, 7);
        vec3.rotateY(v, v, vec3.create(), 1.58);
        vec3.subtract(v, v, vec3.fromValues(0, 40, 0));
      }
      
      if (mesh_id == 2) {
        vec3.scale(v, v, 0.15);
        vec3.rotateY(v, v, vec3.create(), 2.0);
        vec3.subtract(v, v, vec3.fromValues(0, 30, 0));
      }  
      
      if (mesh_id == 3) {
        vec3.scale(v, v, 0.5);
        vec3.subtract(v, v, vec3.fromValues(0, 40, 0));
      }  
      
      verts.push(v);
    }

    for (let i = 0; i < particles.length; ++i) {
      let p : Particle = particles[i];
      p.updateAttractionPos(verts[i % verts.length]);
      p.attract = true;
      p.attractOBJ = true;
    }
  }
}

function updateVBOs() {
  let posArray : number[] = [];
  let colArray : number[] = [];

  for (let i = 0; i < numParticles; ++i) {
    let curr = particles[i];
    posArray.push(curr.currPos[0]);
    posArray.push(curr.currPos[1]);
    posArray.push(curr.currPos[2]);

    colArray.push(curr.color[0] / 255);
    colArray.push(curr.color[1] / 255);
    colArray.push(curr.color[2] / 255);
    colArray.push(1);
  }

  let pos32 : Float32Array = new Float32Array(posArray);
  let col32 : Float32Array = new Float32Array(colArray);
  square.setInstanceVBOs(pos32, col32);
  square.setNumInstances(numParticles);
}

// update particles caller function
function updateParticles(time : number) {
  for (let i = 0; i < numParticles; ++i) {
    particles[i].update(time);
  }
}

// scatter particles 
function scatterParticles() {
  for (let i = 0; i < numParticles; ++i) {
    let p = particles[i];
    var a = 0.5;
    var vx = Math.random() * a - (a / 2);
    var vy = Math.random() * a - (a / 2);
    var vz = Math.random() * a - (a / 2);
    p.velocity = vec3.fromValues(vx, vy, vz);
    p.attract = false;
    p.repel = false;
  }
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

  // change number of particles 
  var particleChange = gui.add(controls, 'num. of particles', 100, 10000).step(1);
  particleChange.onChange(function (num : number) {
    numParticles = num;
    loadScene();
  });

  // scatter!
  gui.add(controls, 'scatter particles!');

  // change mesh
  var meshChange = gui.add(controls, 'mesh', ['none', 'heart', 'cat', 'surprise']);
  meshChange.onChange(function (name : string) {
    if (name == 'none') {
      scatterParticles();
    } else {
      if (name == 'heart') mesh_id = 1;
      if (name == 'cat') mesh_id = 2;
      if (name == 'surprise') mesh_id = 3;
      currMesh = mesh_list[name];
      attractMesh();
    }
    
  });

  //gui.add(controls, 'go to mesh!');
  gui.add(controls, 'Load Scene');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  loadMesh();

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, -90), vec3.fromValues(-5, -5, -1));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0, 0, 0, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  // start repel/attract
  function mouseDown(event: any) {
    mousePressed = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
    mouseClick = event.which;

    // left click
    if (mouseClick == 1) {
      for (let i = 0; i < numParticles; ++i) {
        particles[i].attract = true;
        particles[i].repel = false;
      }
    } else if (mouseClick == 3) {
      for (let i = 0; i < numParticles; ++i) {
        particles[i].attract = false;
        particles[i].repel = true;
      }
    }
  }

  // remove repel/attract
  function mouseUp(event: any) {
    mousePressed = false;
    scatterParticles;
    for (let i = 0; i < numParticles; ++i) {
      let p = particles[i];
      p.attract = false;
      p.repel = false;
      p.acceleration = vec3.fromValues(0, 0, 0);
    }
    scatterParticles;
  }

  // updating mouse position!
  function mouseMove(event: any) {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }

  canvas.onmousedown = mouseDown;
  canvas.onmouseup = mouseUp;
  canvas.onmousemove = mouseMove;

  let time : number = 0;
  let mouse_click : boolean = false;
  let x : number;
  let y : number;
  let mouse_pos = vec3;

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    lambert.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();
    renderer.render(camera, lambert, [
      square,
    ]);

    if (mousePressed) {
      // get mouse click position
      let mousePos = vec4.fromValues(mouseX, mouseY, 1.0, 1.0);

      // convert to NDC
      mousePos[0] = (2 * mousePos[0] / window.innerWidth) - 1;  
      mousePos[1] = 1 - (2 * mousePos[1] / window.innerHeight);

      // multiply by fcp
      vec4.scale(mousePos, mousePos, camera.far);
      
      // multiply by inverse proj. matrix
      let invProjMat: mat4 = mat4.create();
      mat4.invert(invProjMat, camera.projectionMatrix);
      vec4.transformMat4(mousePos, mousePos, invProjMat);

      // multiply by inverse view matrix
      let invViewMat: mat4 = mat4.create();
      mat4.invert(invViewMat, camera.viewMatrix);
      vec4.transformMat4(mousePos, mousePos, invViewMat);

      // get camera eye
      let eye : vec4 = vec4.fromValues(camera.controls.eye[0], 
                                       camera.controls.eye[1],
                                       camera.controls.eye[2],
                                       1);

      // mouse position relative to eye
      vec4.subtract(mousePos, mousePos, eye);
      vec4.normalize(mousePos, mousePos);

      let convertedPos = vec4.create();
      vec4.add(convertedPos, eye, vec4.scale(mousePos, mousePos, 65.0));

      target.updatePos(vec3.fromValues(convertedPos[0], convertedPos[1], convertedPos[2]));

      for (let i = 0; i < numParticles; ++i) {
        particles[i].updateAttractionPos(vec3.fromValues(convertedPos[0], 
                                                             convertedPos[1], 
                                                             convertedPos[2]));
      }

    }

    updateParticles(time);

    updateVBOs();

    stats.begin();
    lambert.setTime(time);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();
    renderer.render(camera, lambert, [square,]);

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

  time++;

  // Start the render loop
  tick();
}

main();
