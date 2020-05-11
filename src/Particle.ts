import {vec3, vec4} from 'gl-matrix';
import Square from './geometry/Square';

class Particle {

    // basic info per particle for verlet integration
    prevPos : vec3;
    currPos : vec3;
    attractionPos : vec3;
    color : vec3;

    mass : number;

    velocity : vec3;
    acceleration : vec3;

    attract : boolean;
    repel : boolean;
    attractOBJ : boolean;
    out : boolean;

    // constructor
    // mass, current position, attraction position, velocity
    constructor(m : number, p : vec3, p2 : vec3, v : vec3) {
        this.mass = m;
        this.prevPos = vec3.create();
        this.currPos = p;
        this.color = vec3.create();
        this.attractionPos = p2;
        this.velocity = v;
        this.acceleration = vec3.create();

        this.attract = false;
        this.repel = false;
        this.attractOBJ = false;
        this.out = false;
    }

    // function to update position to diven position vector
    updatePos(p : vec3) {
        this.currPos = vec3.fromValues(p[0], p[1], p[2]);
    }

    // function to update position to which the particle should attract to
    updateAttractionPos(p : vec3) {
        this.attractionPos = vec3.fromValues(p[0], p[1], p[2]);
    }

    // yayyy update
    update(time : number) {
        var delT = 0.1;
        var dir = vec3.fromValues(0, 0, 0);
        vec3.subtract(dir, this.attractionPos, this.currPos);
        var mass = 5.0;

        if (this.attract) {
            // accelerate towards point within range
            if (vec3.dist(this.currPos, this.attractionPos) < 40.0) {
                vec3.scale(this.acceleration, dir, 1.0 / mass);

                // slow velocity once attraction occurs so that particles remain at point
                if ((vec3.len(dir) > 5.0 && !this.attractOBJ) || (vec3.len(dir) > 0.5 && this.attractOBJ)) {
                    vec3.scale(this.velocity, this.velocity, 0.97);
                }
            }
        } else if (this.repel) {
            // repel away from point within range
            if (vec3.dist(this.currPos, this.attractionPos) < 80.0) {
                vec3.scale(this.acceleration, dir, -1.0 / mass);
            }

        } else {
            this.acceleration = vec3.fromValues(0.0, 0.0, 0.0);

            // sanity check...
            this.attract = false;
            this.repel = false;
            
        }

        // spherical bounding: if out of bounds, reverse acceleration 
        // to get back into bounds
        if (vec3.len(this.currPos) > 200) {
            vec3.scale(this.acceleration, this.currPos, -0.01);
            this.out = true;
        }

        // reset acceleration once back in bounds
        if (this.out && vec3.len(this.currPos) < (Math.random() * 200 - 100)) {
            console.log(this.out);
            vec3.scale(this.acceleration, this.acceleration, 0);
            var vx = Math.random() * 0.5 - ( 0.5 / 2);
            var vy = Math.random() * 0.5 - (0.5 / 2);
            var vz = Math.random() * 0.5 - (0.5 / 2);
            this.velocity = vec3.fromValues(vx, vy, vz);
            this.out = false;
        }

        //// EULER INTEGRATION
        // update acceleration
        var a = vec3.create();
        vec3.scale(a, this.acceleration, delT);
        this.velocity = vec3.add(this.velocity, this.velocity, a);

        // update velocity
        var v = vec3.create();
        vec3.scale(v, this.velocity, delT);
        this.currPos = vec3.add(this.currPos, this.currPos, v);

        //this.color = vec3.fromValues(255, 0, 0);

        this.happy_pride_month(time);
        
     }

     lerp(i : number, c1 : vec3, c2 : vec3) {
        //console.log(i);
        let color : vec3 = vec3.fromValues(0, 0, 0);
        let col1 : vec3 = vec3.fromValues(c2[0] * i, c2[1] * i, c2[2] * i);
        let col2 : vec3 = vec3.fromValues(c1[0] * (1 - i), c1[1] * (1 - i), c1[2] * (1 - i));
        vec3.add(color, col1, col2);
        let d = 255.0 - 255.0 * (vec3.dist(this.currPos, vec3.fromValues(0, 0, 0)) / 40.0);
        if (d < 0) d = 0;
        this.color = vec3.fromValues(color[0] + d, color[1] + d, color[2] + d);
        //vec3.add(this.color, color, vec3.fromValues(d, d, d));
    }

    // rainbow shifter function!
    happy_pride_month(t : number) {
        let n = 700;
        if (t % n < 100) {
            this.lerp((t % n) / 100.0, vec3.fromValues(255, 0, 0), vec3.fromValues(255, 125, 0));
        } else if (t % n >= 100 && t % n < 200) {
            this.lerp((t % n - 100) / 100.0, vec3.fromValues(255, 125, 0), vec3.fromValues(255, 255, 0));
        } else if (t % n >= 200 && t % n < 300) {
            this.lerp((t % n - 200) / 100.0, vec3.fromValues(255, 255, 0), vec3.fromValues(0, 255, 0));
        } else if (t % n >= 300 && t % n < 400) {
            this.lerp((t % n - 300) / 100.0, vec3.fromValues(0, 255, 0), vec3.fromValues(0, 255, 255));
        } else if (t % n >= 400 && t % n < 500) {
            this.lerp((t % n - 400) / 100.0, vec3.fromValues(0, 255, 255), vec3.fromValues(0, 0, 255));
        } else if (t % n >= 500 && t % n < 600) {
            this.lerp((t % n - 500) / 100.0, vec3.fromValues(0, 0, 255), vec3.fromValues(255, 0, 255));
        } else {
            this.lerp((t % n - 600) / 100.0, vec3.fromValues(255, 0, 255), vec3.fromValues(255, 0, 0));
        }
    }

}

export default Particle;