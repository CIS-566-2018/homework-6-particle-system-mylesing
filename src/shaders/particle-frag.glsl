#version 300 es
precision highp float;

in vec4 fs_Col;
in vec4 fs_Pos;

out vec4 out_Col;

void main()
{

    float z = fs_Pos.z * (2.0 - fs_Pos.y / 15.0);
    float y = 1.3 * fs_Pos.y - abs(fs_Pos.x) * sqrt(1.0 - abs(fs_Pos.x));
    vec3 p2 = vec3(fs_Pos.x, y, fs_Pos.z);
    float dist = 1.0 - length(p2.xyz) - 0.5;
    out_Col = vec4(dist) * fs_Col;
}
