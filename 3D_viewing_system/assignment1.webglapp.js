
import { hex2rgb, deg2rad, loadExternalFile } from './js/utils/utils.js'
import Input from './js/input/input.js'
import * as mat4 from './js/lib/glmatrix/mat4.js'
import * as vec3 from './js/lib/glmatrix/vec3.js'
import * as quat4 from './js/lib/glmatrix/quat.js'
import { Box } from './js/app/object3d.js'

import { Scene, SceneNode } from './assignment1.scene.js'

/**
 * @Class
 * WebGlApp that will call basic GL functions, manage camera settings, transformations and scenes, and take care of rendering them
 * 
 */
class WebGlApp 
{
    /**
     * Initializes the app with a box, and a scene, view, and projection matrices
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     * @param {AppState} app_state The state of the UI
     */
    constructor( gl, shader, app_state )
    {
        // Set GL flags
        this.setGlFlags( gl )

        // Store the shader
        this.shader = shader
        
        // Create a box instance
        this.box = new Box( gl, shader )

        // Declare a variable to hold a Scene
        // Scene files can be loaded through the UI (see below)
        this.scene = null

        // Bind a callback to the file dialog in the UI that loads a scene file
        app_state.onOpen3DScene((filename) => {
            let scene_config = JSON.parse(loadExternalFile(`./scenes/${filename}`))
            this.scene = new Scene(scene_config, gl, shader)
            return this.scene
        })

        // Create the view matrix
        this.eye     =   [2.0, 0.5, -2.0]
        this.center  =   [0, 0, 0]
       
        this.forward =   null
        this.right   =   null
        this.up      =   null

        // Forward, Right, and Up are initialized based on Eye and Center
        this.updateViewSpaceVectors()
        this.view = mat4.lookAt(mat4.create(), this.eye, this.center, [0, 1, 0])
        this.projection = mat4.perspective(mat4.create(), deg2rad(60), 16/9, 0.1, 100.0)
        

        // Use the shader's setUniform4x4f function to pass the matrices
        this.shader.use()
        this.shader.setUniform4x4f('u_v', this.view)
        this.shader.setUniform4x4f('u_p', this.projection)
        this.shader.unuse()

    }  

    /**
     * Sets up GL flags
     * In this assignment we are drawing 3D data, so we need to enable the flag 
     * for depth testing. This will prevent from geometry that is occluded by other 
     * geometry from 'shining through' (i.e. being wrongly drawn on top of closer geomentry)
     * 
     * Look into gl.enable() and gl.DEPTH_TEST to learn about this topic
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    setGlFlags( gl ) {

        // Enable depth test
        gl.enable(gl.DEPTH_TEST)

    }

    /**
     * Sets the viewport of the canvas to fill the whole available space so we draw to the whole canvas
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} width 
     * @param {Number} height 
     */
    setViewport( gl, width, height )
    {
        gl.viewport( 0, 0, width, height )
    }

    /**
     * Clears the canvas color
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     */
    clearCanvas( gl )
    {
        gl.clearColor(...hex2rgb('#000000'), 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    }
    
    /**
     * Updates components of this app
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {AppState} app_state The state of the UI
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    update( gl, app_state, delta_time ) 
    {
        let drawMode = app_state.getState('Draw Mode') === 'Points' ? gl.POINTS : gl.TRIANGLES

        if (this.scene != null) {
            let nodes = this.scene.getNodes() // Get all nodes from the scene
            for (let node of nodes) {
            if (node.setDrawMode) {
                node.setDrawMode(drawMode) // Set draw mode on model nodes only
                }
            }
        }

        // Control
        switch(app_state.getState('Control')) {
            case 'Camera':
                this.updateCamera( delta_time )
                break
            case 'Scene Node':
                // Only do this if a scene is loaded
                if (this.scene == null)
                    break
                
                // Get the currently selected scene node from the UI
                let scene_node = this.scene.getNode( app_state.getState('Select Scene Node') )
                this.updateSceneNode( scene_node, delta_time )
                break
        }
    }

    /**
     * Update the Forward, Right, and Up vector according to changes in the 
     * camera position (Eye) or the center of focus (Center)
     */
    updateViewSpaceVectors( ) {
        this.forward = vec3.normalize(vec3.create(), vec3.sub(vec3.create(), this.eye, this.center))
        this.right = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), [0,1,0], this.forward))
        this.up = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), this.forward, this.right))
    }

    /**
     * Update the camera view based on user input and the arcball viewing model
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the view's center
     * 2) Middle Mouse Button or Space+Left Mouse Button - Pan the view relative view-space
     * 3) Right Mouse Button - Zoom towards or away from the view's center
     * 
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateCamera( delta_time ) {
        let view_dirty = false

        // Control - Zoom
        if (Input.isMouseDown(2)) {
            let zoomAmount = Input.getMouseDy() * delta_time * 2 // Adjust the multiplier for sensitivity
            let forwardDir = vec3.scale(vec3.create(), this.forward, zoomAmount)
            this.eye = vec3.add(vec3.create(), this.eye, forwardDir)
            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            let angleX = -Input.getMouseDx() * delta_time * 2
            let angleY = -Input.getMouseDy() * delta_time * 2
        
            // Rotate eye position around the center
            let rotationAroundUp = mat4.create()
            mat4.rotate(rotationAroundUp, rotationAroundUp, angleX, [0, 1, 0])
            vec3.transformMat4(this.eye, this.eye, rotationAroundUp)
        
            let rotationAroundRight = mat4.create()
            mat4.rotate(rotationAroundRight, rotationAroundRight, angleY, this.right)
            vec3.transformMat4(this.eye, this.eye, rotationAroundRight)

            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Control - Pan
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            let moveX = -Input.getMouseDx() * delta_time * 2
            let moveY = Input.getMouseDy() * delta_time * 2
        
            // Calculate pan movement along the right and up vectors
            let rightMovement = vec3.scale(vec3.create(), this.right, moveX)
            let upMovement = vec3.scale(vec3.create(), this.up, moveY)
        
            // Combine the movement vectors
            let panMovement = vec3.add(vec3.create(), rightMovement, upMovement)
        
            // Update eye and center positions by adding the pan movement
            this.eye = vec3.add(vec3.create(), this.eye, panMovement)
            this.center = vec3.add(vec3.create(), this.center, panMovement)
        
            // Set dirty flag to trigger view matrix updates
            view_dirty = true
        }

        // Update view matrix if needed
        if (view_dirty) {
            

            // Update Forward, Right, and Up vectors
            this.updateViewSpaceVectors()
            this.view = mat4.lookAt(mat4.create(), this.eye, this.center, [0, 1, 0])
            
            

            this.shader.use()
            this.shader.setUniform4x4f('u_v', this.view)
            this.shader.unuse()
        }
    }

    /**
     * Update a SceneNode's local transformation
     * 
     * Supports the following interactions:
     * 1) Left Mouse Button - Rotate the node relative to the view along the Up and Right axes
     * 2) Middle Mouse Button or Space+Left Mouse Button - Translate the node relative to the view along the Up and Right axes
     * 3) Right Mouse Button - Scales the node around it's local center
     * 
     * @param {SceneNode} node The SceneNode to manipulate
     * @param {Number} delta_time The time in seconds since the last frame (floating point number)
     */
    updateSceneNode(node, delta_time) {
        let node_dirty = false
    
        let translation = mat4.create()
        let rotation = mat4.create()
        let scale = mat4.create()
    
        // Control - Scale
        if (Input.isMouseDown(2)) {
            // Create a scaling matrix to scale the node
            let scaleAmount = 1.0 + Input.getMouseDy() * delta_time * 2 // Adjust scaling speed
            mat4.fromScaling(scale, [scaleAmount, scaleAmount, scaleAmount])
    
            // Set dirty flag to trigger model matrix updates
            node_dirty = true
        }
    
        // Control - Rotate
        if (Input.isMouseDown(0) && !Input.isKeyDown(' ')) {
            // Create a rotation matrix that rotates the node around the view-aligned axes
            let dx = Input.getMouseDx() * delta_time * 2
            let dy = Input.getMouseDy() * delta_time * 2

            // Get the midpoint of the node for rotation
            let midpoint = this.getMidpoint(node)

            // Step 1: Translate to the origin relative to the midpoint
            let translateToOrigin = mat4.create()
            mat4.fromTranslation(translateToOrigin, [-midpoint[0], -midpoint[1], -midpoint[2]])

            // Step 2: Apply rotation around the view-aligned axes
            mat4.fromRotation(rotation, dx, this.up)
            mat4.rotate(rotation, rotation, dy, this.right)

            // Step 3: Translate back to the original position
            let translateBack = mat4.create()
            mat4.fromTranslation(translateBack, [midpoint[0], midpoint[1], midpoint[2]])

            // Combine the transformations: translate to origin -> rotate -> translate back
            mat4.multiply(rotation, translateToOrigin, rotation)
            mat4.multiply(rotation, rotation, translateBack)

            node_dirty = true
        }
    
        // Control - Translate
        if (Input.isMouseDown(1) || (Input.isMouseDown(0) && Input.isKeyDown(' '))) {
            // Create a translation matrix that translates the node along the view-aligned axes
            let dx = -Input.getMouseDx() * delta_time * 2 // Adjust translation speed
            let dy = Input.getMouseDy() * delta_time * 2
    
            let rightTranslation = vec3.scale(vec3.create(), this.right, dx)
            let upTranslation = vec3.scale(vec3.create(), this.up, dy)
            let totalTranslation = vec3.add(vec3.create(), rightTranslation, upTranslation)
    
            mat4.fromTranslation(translation, totalTranslation)
    
            // Set dirty flag to trigger model matrix updates
            node_dirty = true
        }
    
        // Update node transformation if needed
        if (node_dirty) {
            // Apply the transformations (rotate, scale, translate) to the node's local transformation
            let transformation = node.getTransformation()
    
            // Order of transformations: translate -> rotate -> scale
            mat4.multiply(transformation, scale, transformation)
            mat4.multiply(transformation, rotation, transformation)
            mat4.multiply(transformation, translation, transformation)
    
            // Update the node's transformation
            node.setTransformation(transformation)
        }
    }

    /**
     * Main render loop which sets up the active viewport (i.e. the area of the canvas we draw to)
     * clears the canvas with a background color and draws the scene
     * 
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Number} canvas_width The canvas width. Needed to set the viewport
     * @param {Number} canvas_height The canvas height. Needed to set the viewport
     */
    render( gl, canvas_width, canvas_height )
    {
        // Set viewport and clear canvas
        this.setViewport( gl, canvas_width, canvas_height )
        this.clearCanvas( gl )

        // Render the box
        // This will use the MVP that was passed to the shader
        this.box.render( gl )

        // Render the scene
        if (this.scene) this.scene.render( gl )
    }

    getMidpoint(node) {
        // Ensure the node has associated geometry and valid vertex data
        if (!node.obj3d || !node.obj3d.vertices || node.obj3d.vertices.length === 0) {
            console.warn(`Node ${node.name} does not have associated geometry for calculating midpoint.`)
            return [0, 0, 0] // Default midpoint if no geometry is available
        }
    
        // Calculate the bounding box in the node's local coordinate system
        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    
        // Iterate through the node's vertices to calculate the bounding box
        for (let i = 0; i < node.obj3d.vertices.length; i += 3) {
            let x = node.obj3d.vertices[i]
            let y = node.obj3d.vertices[i + 1]
            let z = node.obj3d.vertices[i + 2]
    
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            minZ = Math.min(minZ, z)
    
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            maxZ = Math.max(maxZ, z)
        }
    
        // Compute the midpoint of the bounding box
        let midpoint = [
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
        ]
    
        return midpoint
    }
    

}

export {
    WebGlApp
}
