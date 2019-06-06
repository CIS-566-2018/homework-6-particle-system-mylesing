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
  'mouse controls' : 'camera',
  'Load Scene': loadScene, // A function pointer, essentially
};

let square: Square;
let particles : Particle[] = [];
let time: number = 0.0;
let offsetsArray : number[] = [];
let colorsArray : number[] = [];

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
  
  let n: number = 20.0;
  for (let i = -2 * n; i < 2 * n; i += 4) {
    for (let j = -2 * n; j < 2 * n; j += 4) {
      for (let k = -2 * n; k < 2 * n; k += 4) {
        let x = i + (3 * Math.random() - 1.5);
        let y = j + (3 * Math.random() - 1.5);
        let z = k + (3 * Math.random() - 1.5);
        let p = new Particle(vec3.fromValues(x, y, z));

        offsetsArray.push(x);
        offsetsArray.push(y);
        offsetsArray.push(z);

        colorsArray.push(p.color[0] / 255);
        colorsArray.push(p.color[1] / 255);
        colorsArray.push(p.color[2] / 255);
        colorsArray.push(1.0);

        particles.push(p);
      }
    }
  }

  let offsets : Float32Array = new Float32Array(offsetsArray);
  let colors : Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);
  square.setNumInstances(n * n * n);
  
}

let mouse_x : number;
let mouse_y : number;

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
  let mouse_controls = gui.add(controls, 'mouse controls', ['camera', 'particle motion']);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, -50), vec3.fromValues(-5, -5, -1));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.1, 0.1, 0.1, 1);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  let time : number = 0;
  let mouse_click : boolean = false;
  let x : number;
  let y : number;
  let mouse_pos = vec3;
  
  function get_worldspace(mouse_x : number, mouse_y : number) {

  }

  // This function will be called every frame
  function tick() {
    mouse_controls.onChange( function(value : any) {
      if (value == 'camera') {
        mouse_click = false;
        camera.controls.view.setUse(true);
      } else {
        mouse_click = true;
        //camera.controls.view.setUse(false);
      }
    })

    camera.update();
    
    if (mouse_click) {
      canvas.onmousedown = function(event) {
        // convert to world space
        get_worldspace(event.clientX, event.clientY);
        let x = event.clientX - window.innerWidth / 2;
        x /= window.innerHeight;
        x *= vec3.dist(camera.position, camera.target);

        let y = -1 * (event.clientY - window.innerHeight / 2);
        y /= window.innerHeight;
        y *= vec3.dist(camera.position, camera.target);

        let mouse_pos = vec3.fromValues(x * camera.right[0] + y * camera.up[0], 
                                       x * camera.right[1] + y * camera.up[1],
                                       x * camera.right[2] + y * camera.up[2]);
        // left click
        if (event.button == 0) {
          vec3.add(Particle.mouse_pos, camera.target, mouse_pos);
          Particle.attract = true;
          Particle.repel = false;
        // right click
        } else if (event.button == 2) {
          vec3.add(Particle.mouse_pos, camera.target, mouse_pos);
          vec3.add(Particle.mouse_dir, Particle.mouse_pos, camera.position);
          Particle.attract = true;
          Particle.repel = false;
        }
      }

      canvas.onmousemove = function( event ) {
        if (Particle.attract || Particle.repel) {
          // convert to world space
          let x = event.clientX - window.innerWidth / 2;
          x /= window.innerHeight;
          x *= vec3.dist(camera.position, camera.target);

          let y = -1 * (event.clientY - window.innerHeight / 2);
          y /= window.innerHeight;
          y *= vec3.dist(camera.position, camera.target);

          let mouse_pos = vec3.fromValues(x * camera.right[0] + y * camera.up[0], 
                                          x * camera.right[1] + y * camera.up[1],
                                          x * camera.right[2] + y * camera.up[2]);

          vec3.add(Particle.mouse_pos, camera.target, mouse_pos);
          if (Particle.repel) {
            vec3.add(Particle.mouse_dir, Particle.mouse_pos, camera.position);
          }
        }
      }

      canvas.onmouseup = function( event ) {
        for (let i = 0; i < particles.length; i++) {
          particles[i].curr_pos = particles[i].start_pos;
        }

        if (event.button == 0) {
          Particle.attract = false;
        } 
        if (event.button == 2) {
          Particle.repel = false;
        }
    
      }
    }

    stats.begin();
    lambert.setTime(time);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    renderer.clear();
    renderer.render(camera, lambert, [square,]);
    stats.end();

    for (let i = 0; i < particles.length; i++) {
      particles[i].updateEuler(time);
    }

    //update vbos
    offsetsArray = [];
    colorsArray = [];
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
    
      offsetsArray.push(p.curr_pos[0]);
      offsetsArray.push(p.curr_pos[1]);
      offsetsArray.push(p.curr_pos[2]);

      colorsArray.push(p.color[0] / 255);
      colorsArray.push(p.color[1] / 255);
      colorsArray.push(p.color[2] / 255);
      colorsArray.push(1.0); 
    }

  let offsets : Float32Array = new Float32Array(offsetsArray);
  let colors : Float32Array = new Float32Array(colorsArray);
  square.setInstanceVBOs(offsets, colors);


    // update time
    time++;

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
