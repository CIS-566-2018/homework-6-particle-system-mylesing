import {vec3, vec4} from 'gl-matrix';
import Square from './geometry/Square';

class Particle {

    // particle's attribues
    start_pos : vec3;
    curr_pos : vec3;
    velocity : vec3;
    acceleration : vec3;
    color : vec3 = vec3.fromValues(255, 0, 0);

    // if it is on a mesh and it's position on mesh
    has_mesh : boolean;
    mesh_pos : vec3;

    // mouse values
    static attract : boolean = false;
    static repel : boolean = false;
    static mouse_pos : vec3 = vec3.fromValues(0, 0, 0);
    static mouse_dir : vec3 = vec3.fromValues(0, 0, 0);
    static return_pos : vec3;
    clicked : boolean = false;

    constructor(pos : vec3) {
        this.start_pos = pos;
        this.curr_pos = pos;
        // random velocity & acceleration -1 < |v| < 1
        this.velocity = vec3.fromValues(Math.random() * 2 - 1, 
                                        Math.random() * 2 - 1,
                                        Math.random() * 2 - 1);
        this.acceleration = vec3.fromValues(Math.random() * 2 - 1, 
                                            Math.random() * 2 - 1,
                                            Math.random() * 2 - 1);                                 
    }

    // update the particle movement
    updateEuler(time : number) {
        // time shifttttttt
        // sin 
        let t = 0.01 *  Math.sin(0.01 * time);
        
         // make sure it doesn't keep expanding
        let a = this.acceleration;
        let v = this.velocity;
        // if (vec3.dist(this.curr_pos, vec3.fromValues(0, 0, 0)) < 60.0)  {
        //     v = vec3.fromValues(v[0] * -1, v[1] * -1, v[2] * -1);
        // }
        
        // euler integration
        let shift = vec3.fromValues(t * v[0] + 0.5 * t * t * a[0],
                                    t * v[1] + 0.5 * t * t * a[1],
                                    t * v[2] + 0.5 * t * t * a[2]);

        let s = 1.0; //0.05;
        shift = vec3.scale(shift, shift, s);

        // particle target                           
        let target = vec3.fromValues(this.start_pos[0], this.start_pos[1], this.start_pos[2]); 
        
        // attract particles to point of click
        if (Particle.attract) {
            if (vec3.dist(this.curr_pos, Particle.mouse_pos) < 20.0) {
                vec3.subtract(target, Particle.mouse_pos, this.curr_pos);
                vec3.normalize(target, target);
                vec3.add(target, this.curr_pos, target);
                this.clicked = true;
            }
        }
        
        this.curr_pos = vec3.add(this.curr_pos, target, shift);

        // funky shifty time
        // this.color[0] = Math.abs(100 * Math.cos(t));
        // this.color[1] = Math.abs(125 * Math.sin(t * t));
        // this.color[2] = Math.abs(255 * Math.sin(t));

        // rainbow lerpy! :)
        this.happy_pride_month(time);
    }

    lerp(i : number, c1 : vec3, c2 : vec3) {
        //console.log(i);
        let color : vec3 = vec3.fromValues(0, 0, 0);
        let col1 : vec3 = vec3.fromValues(c2[0] * i, c2[1] * i, c2[2] * i);
        let col2 : vec3 = vec3.fromValues(c1[0] * (1 - i), c1[1] * (1 - i), c1[2] * (1 - i));
        vec3.add(color, col1, col2);
        let d = 255.0 - 255.0 * (vec3.dist(this.curr_pos, vec3.fromValues(0, 0, 0)) / 40.0);
        this.color = vec3.fromValues(color[0] + d, color[1] + d, color[2] + d);
        //vec3.add(this.color, color, vec3.fromValues(d, d, d));
    }

    // rainbow shifter function!
    happy_pride_month(t : number) {
        let n = 700;
        if (t % n < 100) {
            //this.color = vec3.fromValues(255, 0, 0);
            this.lerp((t % n) / 100.0, vec3.fromValues(255, 0, 0), vec3.fromValues(255, 125, 0));
        } else if (t % n >= 100 && t % n < 200) {
            //this.color = vec3.fromValues(255, 125, 0);
            this.lerp((t % n - 100) / 100.0, vec3.fromValues(255, 125, 0), vec3.fromValues(255, 255, 0));
        } else if (t % n >= 200 && t % n < 300) {
            //this.color = vec3.fromValues(255, 255, 0);
            this.lerp((t % n - 200) / 100.0, vec3.fromValues(255, 255, 0), vec3.fromValues(0, 255, 0));
        } else if (t % n >= 300 && t % n < 400) {
            //this.color = vec3.fromValues(0, 255, 0);
            this.lerp((t % n - 300) / 100.0, vec3.fromValues(0, 255, 0), vec3.fromValues(0, 255, 255));
        } else if (t % n >= 400 && t % n < 500) {
            //this.color = vec3.fromValues(0, 255, 255);
            this.lerp((t % n - 400) / 100.0, vec3.fromValues(0, 255, 255), vec3.fromValues(0, 0, 255));
        } else if (t % n >= 500 && t % n < 600) {
            //this.color = vec3.fromValues(0, 0, 255);
            this.lerp((t % n - 500) / 100.0, vec3.fromValues(0, 0, 255), vec3.fromValues(255, 0, 255));
        } else {
            //this.color = vec3.fromValues(255, 0, 255);
            this.lerp((t % n - 600) / 100.0, vec3.fromValues(255, 0, 255), vec3.fromValues(255, 0, 0));
        }
    }

}

export default Particle;