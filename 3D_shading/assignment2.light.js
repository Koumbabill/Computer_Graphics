'use strict'

import * as mat4 from './js/lib/glmatrix/mat4.js'
import * as vec3 from './js/lib/glmatrix/vec3.js'
import * as quat4 from './js/lib/glmatrix/quat.js'

import Box from './js/app/box3d.js'

/**
 * The Light base class. Stores common properties of all lights like color and intensity
 * It derives from the Box class (which is an Object3D in turn). This is done to visually
 * represent lights in the scene a differently shaped boxes.
 */
class Light extends Box {

    /**
     * Constructs a new light instance
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader, box_scale = [1,1,1]) {
        super( gl, shader, box_scale )

        this.id = id
        this.color = color
        this.intensity = intensity

        this.target_shader = target_shader
    }

    /**
     * Setter for this light's target shader
     * The target shader is the shader in which the light information will be used (i.e., Goraud, Phong, etc)
     * 
     */
    setTargetShader( shader ) {
        this.target_shader = shader
    }

    /**
     * Perform any necessary updates.
     * Children can override this.
     *
     */
    udpate( )
    {
        return
    }

    /**
     * Render the light gizmo to the scene
     * Note that this has nothing to do with Goraud or Phong shading
     * We just want to visually represent the light as a box and therefore need to render that box
     * 
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context 
     */
    render( gl ) {
        this.shader.use( )
        this.shader.setUniform3f('u_color', this.color)
        this.shader.unuse( )

        super.render( gl )
    }
}

/**
 * Ambient lights have color and intensity but no direction or position
 */
class AmbientLight extends Light {

    /**
     * Constructs the ambient light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [10000.0, 10000.0, 10000.0])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     * 
     * To set variables in a shader struct use the following syntax.
     * 
     * Example 1:
     * Say you want to set a vec3 called `myvec` in a struct uniform called `u_myuniform`
     * Call Shader.setUniform3f('u_myuniform.myvec', new Float32Array([0,0,0]))
     * 
     * To set a variable in a uniform array / list use the following syntax.
     * 
     * Example 2:
     * Say you want to set the third (index 2) element of a float array uniform called `u_myarray`
     * Call Shader.setUniform1f('u_myarray[2]', 3.0)
     */
    update( ) {
        // TODO: Pass the light properties to the shader
        if (!this.target_shader) return;
        
        this.target_shader.use();
        // Make sure color is properly converted to Float32Array
        const colorArray = new Float32Array(3);
        colorArray[0] = this.color[0];
        colorArray[1] = this.color[1];
        colorArray[2] = this.color[2];
        
        this.target_shader.setUniform3f(`u_lights_ambient[${this.id}].color`, colorArray);
        this.target_shader.setUniform1f(`u_lights_ambient[${this.id}].intensity`, this.intensity);
        this.target_shader.unuse();
    }
    
}

/**
 * Directional light have color, intensity and a direction that they cast light in
 * Light rays cast by directional lights all run in parallel, so their direction is all we need to describe them.
 */
class DirectionalLight extends Light {

    /**
     * Constructs the directional light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [0.025, 0.25, 0.025])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     * 
     * To set variables in a shader struct use the following syntax.
     * 
     * Example 1:
     * Say you want to set a vec3 called `myvec` in a struct uniform called `u_myuniform`
     * Call Shader.setUniform3f('u_myuniform.myvec', new Float32Array([0,0,0]))
     * 
     * To set a variable in a uniform array / list use the following syntax.
     * 
     * Example 2:
     * Say you want to set the third (index 2) element of a float array uniform called `u_myarray`
     * Call Shader.setUniform1f('u_myarray[2]', 3.0)
     *
     * 
     * Use the light's this.model_matrix to find the direction
     */
    update( ) {
        // TODO: Pass the light properties to the shader
        if (!this.target_shader) return;
        
        // Calculate direction from model matrix
        const direction = vec3.create();
        const baseDirection = vec3.fromValues(0, 0, -1);
        
        // Extract rotation from model matrix
        const rotation = mat4.clone(this.model_matrix);
        rotation[12] = 0;
        rotation[13] = 0;
        rotation[14] = 0;
        
        // Transform and normalize direction
        vec3.transformMat4(direction, baseDirection, rotation);
        vec3.normalize(direction, direction);
        
        this.target_shader.use();
        
        // Ensure we're passing proper Float32Arrays
        const directionArray = new Float32Array([direction[0], direction[1], direction[2]]);
        const colorArray = new Float32Array([this.color[0], this.color[1], this.color[2]]);
        
        this.target_shader.setUniform3f(`u_lights_directional[${this.id}].direction`, directionArray);
        this.target_shader.setUniform3f(`u_lights_directional[${this.id}].color`, colorArray);
        this.target_shader.setUniform1f(`u_lights_directional[${this.id}].intensity`, this.intensity);
        this.target_shader.unuse();
    }
}

/**
 * Point lights have color, intensity and a position
 * Their light rays all originate from that position which means they have many different directions. In fact, all directions.
 */
class PointLight extends Light {

    /**
     * Constructs the point light
     * 
     * @param {Number} id Light id derived from the scene config
     * @param {vec3} color Color of the light as 3-component vector
     * @param {Number} intensity Intensity of the light source
     * @param {Shader} target_shader The shader in which the light is to be used for shading
     * @param {WebGL2RenderingContext} gl The WebGl2 rendering context
     * @param {Shader} shader The shader that will be used to render the light gizmo in the scene
     * @param {vec3} box_scale A scale to skew the vertices in the Box class to generate differently shaped lights
     */
    constructor(id, color, intensity, target_shader, gl, shader) {
        super(id, color, intensity, target_shader, gl, shader, [0.1, 0.1, 0.1])
    }

    /**
     * Updates the shader uniforms for this light
     * Access the correct light in the shader's light array by using this.id
     * 
     * To set variables in a shader struct use the following syntax.
     * 
     * Example 1:
     * Say you want to set a vec3 called `myvec` in a struct uniform called `u_myuniform`
     * Call Shader.setUniform3f('u_myuniform.myvec', new Float32Array([0,0,0]))
     * 
     * To set a variable in a uniform array / list use the following syntax.
     * 
     * Example 2:
     * Say you want to set the third (index 2) element of a float array uniform called `u_myarray`
     * Call Shader.setUniform1f('u_myarray[2]', 3.0)
     *
     * 
     * Use this light's this.model_matrix to find its position
     */
    update( ) {
        // TODO: Pass the light properties to the shader
        if (!this.target_shader) return;
        
        // Calculate position from model matrix
        const position = vec3.create();
        const origin = vec3.fromValues(0, 0, 0);
        vec3.transformMat4(position, origin, this.model_matrix);
        
        this.target_shader.use();
        
        // Ensure we're passing proper Float32Arrays
        const positionArray = new Float32Array([position[0], position[1], position[2]]);
        const colorArray = new Float32Array([this.color[0], this.color[1], this.color[2]]);
        
        this.target_shader.setUniform3f(`u_lights_point[${this.id}].position`, positionArray);
        this.target_shader.setUniform3f(`u_lights_point[${this.id}].color`, colorArray);
        this.target_shader.setUniform1f(`u_lights_point[${this.id}].intensity`, this.intensity);
        this.target_shader.unuse();
    }
}

export {
    Light,
    AmbientLight,
    DirectionalLight,
    PointLight
}
