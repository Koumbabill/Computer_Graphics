#version 300 es

// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// output to fragment stage
// TODO: Create any needed `out` variables here
out vec3 v_normal;    // Pass the transformed normal to fragment shader
out vec3 v_position;  // Pass the world space position to fragment shader

void main() {

    // TODO: PHONG SHADING
    // TODO: Implement the vertex stage
    // TODO: Transform positions and normals
    // NOTE: Normals are transformed differently from positions. Check the book and resources.
    // TODO: Create new `out` variables above outside of main() to store any results
    // Transform vertex position to world space
    vec4 world_pos = u_m * vec4(a_position, 1.0);
    v_position = world_pos.xyz;

    // Transform normal using the normal matrix (transpose of inverse of model matrix)
    // This preserves correct normal orientation when the model is scaled non-uniformly
    mat3 normal_matrix = transpose(inverse(mat3(u_m)));
    v_normal = normalize(normal_matrix * a_normal);

    // Set final clip space position
    gl_Position = u_p * u_v * world_pos;

}
