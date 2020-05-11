import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import * as fs from 'fs';
var OBJ = require('webgl-obj-loader');

// edited mesh class; we only need positions, no normals or
class Mesh extends Drawable {
  // index, position, normals array for VBOs
  indices: number[] = [];
  positions: number[] = [];

  // initial values for indices, positions, and normals
  initIdx : number[];
  initPos : vec4[];
  idxCount : number;

  center: vec4;
  dim : number = 0.1;

  constructor() {
    super(); // Call the constructor of the super class. This is required.
    this.initIdx = [];
    this.initPos = [];
  }

  // load buffers from string
  loadBuffers(str : string)
  {

    var objStr = document.getElementById(str).innerHTML;
    var opt = { encoding: 'utf8' };

    var currMesh = new OBJ.Mesh(objStr);
    //OBJ.initMeshBuffers(gl, mesh);
    
    // add position vectors to initial pos array
    var posSize = (currMesh.vertices.length / 3) * 4;
    var id = 0;
    for(var i = 0; i < currMesh.vertices.length; i += 3 ){
      this.initPos[id] = vec4.fromValues(currMesh.vertices[i], 
                                        currMesh.vertices[i + 1], 
                                        currMesh.vertices[i + 2], 
                                        1.0);
      id++;
    }
    
    // get indices
    this.initIdx = currMesh.indices;

    var max = 0;
    for (let i = 0; i < currMesh.indices.length; ++i) {
        if (currMesh.indices[i] > 0) {
            max = currMesh.indices[i];
        }
    }

    this.idxCount = this.initPos.length;
    
    console.log(currMesh.indices.length);
  }

  // takes in n (number of current cubes/objects drawn) and generates an index array
  setIdx(n : number) {
    let count = 0;
    for (let i = 0; i < n; ++i) {
      // the indexing is slightly off, likely because the mesh itself is badly
      // had to resolve to hard coding index incrementation as a result (couldn't find a better mesh?)
      var startId = i * 465; 
      for (let j = 0; j < this.initIdx.length; ++j) {
        this.indices.push(startId + this.initIdx[j]);
        count++;
      }
    }
  }

  // add positions to the list of positions given a "center"
  // n represents rescaling!
  addPositions(pos : vec3, n : number) {
    // turn into a vec4
    var c = vec4.fromValues(pos[0], pos[1], pos[2], 1);

    // push cube positions
    for (let i = 0; i < this.initPos.length; ++i) {
      var p = vec4.fromValues(0, 0, 0, 0);
      var s = vec4.fromValues(0, 0, 0, 0);
      vec4.scale(s, this.initPos[i], n);
      vec4.add(p, c, s);

      // push new positions 
      this.positions.push(p[0] * 300.0);
      this.positions.push(p[1] * 300.0);
      this.positions.push(p[2] * 300.0);
      this.positions.push(1);
    } 
  }


  create() {
    var f32idx = new Uint32Array(this.indices);
    var f32pos = new Float32Array(this.positions);

    this.generateIdx();
    this.generatePos();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, f32idx, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, f32pos, gl.STATIC_DRAW);

    console.log(`Created new mesh`);
  }
};

export default Mesh;