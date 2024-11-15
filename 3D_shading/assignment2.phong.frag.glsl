#version 300 es

#define MAX_LIGHTS 16

// Fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision".
precision mediump float;

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

// lights and materials
uniform AmbientLight u_lights_ambient[MAX_LIGHTS];
uniform DirectionalLight u_lights_directional[MAX_LIGHTS];
uniform PointLight u_lights_point[MAX_LIGHTS];

uniform Material u_material;

// camera position
uniform vec3 u_eye;

// received from vertex stage
// TODO: Create any needed `in` variables here
// TODO: These variables correspond to the `out` variables from the vertex stage
in vec3 v_normal;      // Interpolated normal for this fragment
in vec3 v_position;    // Interpolated position for this fragment

// with webgl 2, we now have to define an out that will be the color of the fragment
out vec4 o_fragColor;

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
    
    // Calculate diffuse component
    float diff = max(dot(L, N), 0.0);
    vec3 diffuse = material.kD * light.color * diff;
    
    // Calculate specular component
    float spec = pow(max(dot(R, V), 0.0), material.shininess);
    vec3 specular = material.kS * light.color * spec;
    
    // Combine and apply light intensity
    return (diffuse + specular) * light.intensity;
}

// Shades a point light and returns its contribution
vec3 shadePointLight(Material material, PointLight light, vec3 normal, vec3 eye, vec3 vertex_position) {

    // TODO: Implement this method

    vec3 L = normalize(light.position - vertex_position);
    vec3 N = normalize(normal);
    vec3 V = normalize(eye - vertex_position);
    vec3 R = reflect(-L, N);
    
    // Calculate light attenuation based on distance
    float distance = length(light.position - vertex_position);
    float attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);
    
    // Calculate diffuse component
    float diff = max(dot(L, N), 0.0);
    vec3 diffuse = material.kD * light.color * diff;
    
    // Calculate specular component
    float spec = pow(max(dot(R, V), 0.0), material.shininess);
    vec3 specular = material.kS * light.color * spec;
    
    // Combine and apply light intensity and attenuation
    return (diffuse + specular) * light.intensity * attenuation;
}

void main() {

    // TODO: PHONG SHADING
    // TODO: Implement the fragment stage
    // TODO: Use the above methods to shade every light in the light arrays
    // TODO: Accumulate their contribution and use this total light contribution to pass to o_fragColor

    // TODO: Pass the shaded vertex color to the output
    // Initialize total light contribution
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
            v_normal, 
            u_eye, 
            v_position
        );
    }
    
    // Add point light contributions
    for(int i = 0; i < MAX_LIGHTS; i++) {
        total_light += shadePointLight(
            u_material, 
            u_lights_point[i], 
            v_normal, 
            u_eye, 
            v_position
        );
    }
    
    // Output final color
    o_fragColor = vec4(total_light, 1.0);
}
