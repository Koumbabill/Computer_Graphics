'use strict'

import { Object3D } from '../../assignment2.object3d.js'

class Box extends Object3D {

    /**
     * Creates a 3D box from 8 vertices and draws it as a line mesh
     * @param {WebGL2RenderingContext} gl The webgl2 rendering context
     * @param {Shader} shader The shader to be used to draw the object
     */
    constructor( gl, shader, box_scale = [1,1,1] ) 
    {
        let vertices = [
            1.000000, 1.000000, -1.000000,
            1.000000, -1.000000, -1.000000,
            1.000000, 1.000000, 1.000000,
            1.000000, -1.000000, 1.000000,
            -1.000000, 1.000000, -1.000000,
            -1.000000, -1.000000, -1.000000,
            -1.000000, 1.000000, 1.000000,
            -1.000000, -1.000000, 1.000000
        ]

        for (let i = 0; i < vertices.length; i++) {
            vertices[i] = vertices[i] * box_scale[i%3]
        }

        let indices = [
            0, 1,
            1, 3,
            3, 2,
            2, 0,

            0, 4,
            1, 5,
            2, 6,
            3, 7,

            4, 5,
            5, 7,
            7, 6,
            6, 4
        ]
        
        super( gl, shader, vertices, indices, gl.LINES )
    }

    /**
     * Sets up a vertex attribute object that is used during rendering to automatically tell WebGL how to access our buffers
     * @param { WebGL2RenderingContext } gl The webgl2 rendering context
     * @param { Shader } shader The shader that will be used to render the light gizmo in the scene
     */
    createVAO( gl, shader ) {
        this.vertex_array_object = gl.createVertexArray();
        gl.bindVertexArray(this.vertex_array_object);
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vertices_buffer )
        gl.enableVertexAttribArray( shader.getAttributeLocation( "a_position" ) )

        let stride = 0, offset = 0
        gl.vertexAttribPointer( shader.getAttributeLocation( "a_position" ), this.num_components, gl.FLOAT, false, stride, offset )

        gl.bindVertexArray( null )
        gl.bindBuffer( gl.ARRAY_BUFFER, null )
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
}

export default Box
