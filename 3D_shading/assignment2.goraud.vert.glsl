#version 300 es

#define MAX_LIGHTS 16

// struct definitions
struct AmbientLight {
    vec3 color;
    float intensity;
};

struct DirectionalLight {
    vec3 direction;
    vec3 color;
    float intensity;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float intensity;
};

struct Material {
    vec3 kA;
    vec3 kD;
    vec3 kS;
    float shininess;
};


// an attribute will receive data from a buffer
in vec3 a_position;
in vec3 a_normal;

// camera position
uniform vec3 u_eye;

// transformation matrices
uniform mat4x4 u_m;
uniform mat4x4 u_v;
uniform mat4x4 u_p;

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// shading output
out vec4 o_color;

// Shades an ambient light and returns this light's contribution
vec3 shadeAmbientLight(Material material, AmbientLight light) {
    
    // TODO: Implement this method
    return material.kA * light.color * light.intensity;
}

// Shades a directional light and returns its contribution
vec3 shadeDirectionalLight(Material material, DirectionalLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // TODO: Implement this method
    vec3 L = normalize(-light.direction);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);
    
    vec3 diffuse = material.kD * light.color * max(dot(L, N), 0.0);
    vec3 specular = material.kS * light.color * pow(max(dot(R, V), 0.0), material.shininess);
    
    return (diffuse + specular) * light.intensity;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // TODO: Implement this method
    vec3 L = normalize(light.position - vertex_position);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);
    
    float distance = length(light.position - vertex_position);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);
    
    vec3 diffuse = material.kD * light.color * max(dot(L, N), 0.0);
    vec3 specular = material.kS * light.color * pow(max(dot(R, V), 0.0), material.shininess);
    
    return (diffuse + specular) * light.intensity * attenuation;
}

void main() {

    // TODO: GORAUD SHADING
    // TODO: Implement the vertex stage
    // TODO: Transform positions and normals
    // NOTE: Normals are transformed differently from positions. Check the book and resources.
    // TODO: Use the above methods to shade every light in the light arrays
    // TODO: Accumulate their contribution and use this total light contribution to pass to o_color

    // TODO: Pass the shaded vertex color to the fragment stage
    vec4 position_world = u_m * vec4(a_position, 1.0);
    
    // Transform normal to world space using normal matrix
    mat3 normal_matrix = transpose(inverse(mat3(u_m)));
    vec3 normal_world = normalize(normal_matrix * a_normal);
    
    // Initialize total light
    vec3 total_light = vec3(0.0);
    
    // Add ambient light contributions
    for(int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeAmbientLight(u_material, u_lights_ambient[i]);
    }
    
    // Add directional light contributions
    for(int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadeDirectionalLight(
            u_material, 
            u_lights_directional[i], 
            normal_world, 
            u_eye, 
            position_world.xyz
        );
    }
    
    // Add point light contributions
    for(int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadePointLight(
            u_material, 
            u_lights_point[i], 
            normal_world, 
            u_eye, 
            position_world.xyz
        );
    }

    // Set final vertex position 
    gl_Position = u_p * u_v * position_world;
    
    // Pass calculated color to fragment shader
    o_color = vec4(total_light, 1.0);
}