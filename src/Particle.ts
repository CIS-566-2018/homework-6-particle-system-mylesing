import {vec3, vec4} from 'gl-matrix';
import Square from './geometry/Square';

class Particle {

    // basic info per particle for verlet integration
    prevPos : Array<vec3>;
    currPos : Array<vec3>;
    nextPos : Array<vec3>;
    velocity : Array<vec3>;
    acceleration : Array<vec3>;

    // for use in main
    expPos : Array<number>;
    expCol : Array<number>;

    // bounding box perimeter value
    boundingBox : number;

    // number of particles in scene
    count : number;
    prevT : number;

    // attraction / repulsion
    attract : boolean;
    repel : boolean;
    ctrlPoint : vec3;

    // constructor
    constructor(c : number) {
        this.prevPos = new Array<vec3>();
        this.currPos = new Array<vec3>();
        this.nextPos = new Array<vec3>();
        this.velocity = new Array<vec3>();
        this.acceleration = new Array<vec3>();

        this.expPos = new Array<number>();
        this.expCol = new Array<number>();

        this.boundingBox = 15.0;

        this.attract = false;
        this.repel = false;
        this.ctrlPoint = vec3.create();

        this.prevT = 0;
        
        this.count = c * c * c;

        var c2 = c / 2;

        for (let i = -1 * c2; i < c2; ++i) {
            for (let j = -1 * c2; j < c2; ++j) {
                for (let k = -1 * c2; k < c2; ++k) {
                    this.prevPos.push(vec3.fromValues(i - 10, j - 10, k - 10));
                    this.currPos.push(vec3.fromValues(i, j, k));
                    this.nextPos.push(vec3.fromValues(i + 10, j + 10, k + 10));

                    // add positions for exporting
                    this.expPos.push(i);
                    this.expPos.push(j);
                    this.expPos.push(k);
                    this.expPos.push(1.0);
                }
            }
        }

        for (let i = 0; i < this.count; ++i) {
                // initialize velocity
                this.velocity.push(vec3.fromValues(0, 0, 0));

                // initialize acceleration for use in update function
                let ax = Math.random() * 2 - 1;
                let ay = Math.random() * 2 - 1;
                let az = Math.random() * 2 - 1;
                this.acceleration.push(vec3.fromValues(ax, ay, az));

                // initialize colors
                let r = 1.0;
                let g = 0.5 + Math.random();
                let b = 0.0;
                this.expCol.push(r);
                this.expCol.push(g);
                this.expCol.push(b);
                this.expCol.push(1.0);
        }
        console.log(this.velocity.length);
        console.log(this.acceleration.length);

        console.log(this.expCol.length);
    }
    

    // apply force to a particle based on f = ma
    applyForce(f : vec3) : vec3 {
        // some mass between 1 and 2...
        let m = 1 / (1.0 + Math.random());
        let a = vec3.create();
        vec3.scale(a, f, m);
        return a;
    }

    updateEuler(t : number) {
        var delT = t - this.prevT;

        // reset positions
        this.expPos = new Array<number>();

        // go through each particle and update position
        for (let i = 0; i < this.currPos.length; ++i) { 

            if (this.attract == true) {
                // mouse controls
                if (vec3.distance(this.ctrlPoint, this.currPos[i]) < 15) {
                    vec3.copy(this.currPos[i], this.ctrlPoint);
                }
            } else if (this.repel == true) {
                if (vec3.distance(this.ctrlPoint, this.currPos[i]) < 15) {
                    this.currPos[i] = this.ctrlPoint;
                }
            }

            // p' = p + v∂t
            var newPos = vec3.create();
            vec3.copy(newPos, this.currPos[i]);
            var vt = vec3.create();
            vec3.scale(vt, this.velocity[i], delT);
            vec3.add(newPos, newPos, vt);

            

            // reset position
            this.prevPos[i] = this.currPos[i];
            this.currPos[i] = newPos;

            // v' = v + a∂t
            var newVel = vec3.create();
            vec3.copy(newVel, this.velocity[i]);
            var at = vec3.create();
            vec3.scale(at, this.acceleration[i], delT);
            vec3.add(newVel, newVel, at);

            // reverse direction if position is out of bounds
            if (vec3.length(newPos) > 100) {
                vec3.scale(newVel, newVel, -1);
                vec3.scale(this.acceleration[i], this.acceleration[i], -0.5);
            }

            if (vec3.length(newPos) == 0) {
                vec3.scale(newVel, newVel, -2 * (Math.random() + 1));
                vec3.scale(this.acceleration[i], this.acceleration[i], -2 * (Math.random() + 1));
            }

            // reset velocity
            this.velocity[i] = newVel;

            // add values to export array
            this.expPos.push(newPos[0]);
            this.expPos.push(newPos[1]);
            this.expPos.push(newPos[2]);
            this.expPos.push(1.0);
        }
        // reset previous T
        this.prevT = t;
    }

    // update function which changes particle position given some force
    update(t : number) {
        // reset export arrays
        this.expPos = new Array<number>();

        // go through each particle and update position
        for (let i = 0; i < this.count; ++i) {
            // p' = p
            var newPos = this.currPos[i];
            
            // (p - p*)
            var dPos = vec3.create();
            vec3.subtract(dPos, this.currPos[i], this.prevPos[i]);

            // p' = p + (p - p*)
            vec3.add(newPos, newPos, dPos);

            // a * t^2
            // set up random velocity
            var v = vec3.fromValues(Math.random() * 0.001, Math.random() * 0.001, Math.random() * 0.001);

            var a = vec3.create();
            vec3.scale(a, this.acceleration[i], 10 * Math.sin(t) * Math.sin(t));


            // verlet integration: p' = p + (p - p*) + a*t^2
            vec3.add(newPos, newPos, a);

            // if the particle is out of bounds, reset it's position to the center and reset it's acceleration
            if (vec3.length(newPos) > 45.0) {
                let x = Math.random() * 15 - Math.random() * 15;
                let y = Math.random() * 15 - Math.random() * 15;
                let z = Math.random() * 15 - Math.random() * 15;
                newPos = vec3.fromValues(x, y, z);

                // let ax = Math.random() * 0.00001 * Math.floor(Math.random() * 2.5 - 1);
                // let ay = Math.random() * 0.00001 * Math.floor(Math.random() * 2.5 - 1);
                // let az = Math.random() * 0.00001 * Math.floor(Math.random() * 2.5 - 1);
                // this.acceleration[i] = vec3.fromValues(ax, ay, az);
            }

            // change position values
            this.prevPos[i] = this.currPos[i];
            this.currPos[i] = newPos;

            // add values to export array
            this.expPos.push(newPos[0]);
            this.expPos.push(newPos[1]);
            this.expPos.push(newPos[2]);
            this.expPos.push(1.0);

        }
    }

    // attract particles towards some position depending on user's mouse click
    attractTo(p : vec3, r : number, currPos : vec3, newPos : vec3) {
        let rad = r;
        let targetVec = vec3.create();
        let currDir = vec3.create();
        let dif = vec3.create();

        vec3.subtract(currDir, newPos, currPos);
        vec3.subtract(targetVec, p, newPos);
        
        // if already heading towards the center, don't apply acceleration again
        if(vec3.dot(currDir, targetVec) > 0) {
            return vec3.create();
        } else { // if heading away from target
            if(vec3.length(targetVec) > r) { // if outside maxRad change direction
                return this.applyForce(targetVec);
            } else { // if heading away but inside maxRadius
                let radius = Math.abs(Math.random() - Math.random()) * rad; // radius between 0 and maxRad
                 // switch direction if straying outside of this "spring" from target
                if(vec3.length(targetVec) > radius) {
                    return this.applyForce(targetVec);
                }
            }
        }
        return vec3.create();
    }
}

export default Particle;