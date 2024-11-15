'use strict'

import { loadExternalFile } from './js/utils/utils.js'
import Material from './js/app/material.js'

/**
 * A class to load OBJ files from disk
 */
class OBJLoader {

    /**
     * Constructs the loader
     * 
     * @param {String} filename The full path to the model OBJ file on disk
     */
    constructor(filename) {
        this.filename = filename
    }

    /**
     * Loads the file from disk and parses the geometry
     * 
     * @returns {[Array<Number>, Array<Number>, Material]} A triple / list containing 1) the list of vertices and 2) the list of triangle indices and 3) a material
     */
    load() {

        // Load the file's contents
        let contents = loadExternalFile(this.filename)

        // Create lists for vertex positions, vertex normals, and indices
        let vertex_positions = []
        let vertex_normals = []
        let position_indices = []
        let normal_indices = []

        // Parse the file line-by-line
        for (let line of contents.split('\n')){
            let token = line.split(' ')[0]
            switch(token) {
                case 'v':
                    vertex_positions.push(...this.parseVertex(line))
                    break
                case 'vn':
                    vertex_normals.push(...this.parseNormal(line))
                    break
                case 'f':
                    position_indices.push(...this.parseFace(line, 0))
                    normal_indices.push(...this.parseFace(line, 2))
                    break
            }
        }

        // Find min and max extents and normalize the vertex positions
        let max_extent = -Infinity
        let min_extent = Infinity
        for (let v of vertex_positions) {
            if (v > max_extent) max_extent = v
            if (v < min_extent) min_extent = v
        }

        let total_extent = max_extent - min_extent
        for (let i = 0; i < vertex_positions.length; i++) {
            vertex_positions[i] = 2 * ( (vertex_positions[i] - min_extent) / total_extent ) - 1.0
        }

        // Duplicate entries to account for heterogenous index pairs
        [vertex_positions, vertex_normals, position_indices] = this.resolveIndexPairs(vertex_positions, vertex_normals, position_indices, normal_indices)

        // Merge both vertex positions and normals into a single list
        // TODO: Combine vertex positions and normals into a single array vertex_data
        // TODO: Choose a memory layout (i.e., how you want to arrange positions and normals within the array)
        // TODO: You will be setting up the VAO in Object3D to match your layout
        let vertex_data = [];
        for (let i = 0; i < vertex_positions.length / 3; i++) {
            // Position (x, y, z)
            vertex_data.push(vertex_positions[i * 3]);
            vertex_data.push(vertex_positions[i * 3 + 1]);
            vertex_data.push(vertex_positions[i * 3 + 2]);
            
            // Normal (nx, ny, nz)
            vertex_data.push(vertex_normals[i * 3]);
            vertex_data.push(vertex_normals[i * 3 + 1]);
            vertex_data.push(vertex_normals[i * 3 + 2]);
        }

        // Create a new placeholder material
        let material = new Material([0.2,0.2,0.2], [0.5,0.5,0.5], [0.3,0.3,0.3], 20.0)

        return [ vertex_data, position_indices, material ]
    }

    /**
     * Reorders, rearranges, and duplicates the given list of positions, normals and indices to account for heterogenous index pairs
     * The goal is to form a list of positions and normals so that entries in both lists correspond to each other
     * 
     * Since a vertex position index can pair with different normal indices, we need to duplicate some entries to account for this ambiguity 
     * 
     * @param {Array<Number>} vertex_positions List of vertex positions
     * @param {Array<Number>} vertex_normals List of vertex normals
     * @param {Array<Number>} position_indices List of position indices
     * @param {Array<Number>} normal_indices List of normal indices
     * @returns {[Array<Number>, Array<Number>, Array<Number>]} Triplet containing the new list of positions, normals, and indices
     */
    resolveIndexPairs(vertex_positions, vertex_normals, position_indices, normal_indices) 
    {
        // TODO: EXTRA CREDIT
        // TODO: Can you optimize this method to only output unique pairs of values?
        // TODO: See canvas for details

        if (position_indices.length != normal_indices.length)
            throw 'Index count mismatch. Number of indices must be equal for all vertex data'

        let num_entries = position_indices.length

        let out_vertex_positions = []
        let out_vertex_normals = []

        let out_indices = []

        for (let i = 0; i < num_entries; i++) {
            let position_idx = position_indices[i] * 3
            let normal_idx = normal_indices[i] * 3

            for (let j = 0; j < 3; j++) {
                out_vertex_positions.push(vertex_positions[position_idx + j])
                out_vertex_normals.push(vertex_normals[normal_idx + j])
            }

            out_indices.push(i)
        }

        if (out_vertex_positions.length != out_vertex_normals.length)
            throw 'Both vertex data lists need to be the same length after processing'

        return [out_vertex_positions, out_vertex_normals, out_indices]
    }

    /**
     * Parses a single OBJ vertex position (v) entry given as a string
     * 
     * @param {String} vertex_string String containing the vertex position entry 'v {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex position
     */
    parseVertex(vertex_string)
    {
        return this.parseVec3(vertex_string)
    }

    /**
     * Parses a single OBJ vertex normal (vn) entry given as a string
     * 
     * @param {String} vertex_string String containing the vertex normal entry 'vn {x} {y} {z}'
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the vertex normal
     */
    parseNormal(normal_string) {
        return this.parseVec3(normal_string)
    }

    /**
     * Parse generic 3-float entry from OBJ files (v, vn, vt)
     * 
     * @param {String} vec_string 
     * @returns {Array<Number>} A list containing the x, y, z coordinates of the entry
     */
    parseVec3(vec_string) {
        // Split the string by whitespace and remove empty entries
        const components = vec_string.trim().split(/\s+/);
        
        // Convert the last three components to floats (skip the first token which is 'v', 'vn', etc)
        return [
            parseFloat(components[1]),
            parseFloat(components[2]),
            parseFloat(components[3])
        ];
        // NOTE: You can re-use A4's code here
    }

    /**
     * Parses a single OBJ face entry given as a string
     * 
     * @param {String} face_string String containing the face entry 'f {v0}/{vt0}/{vn0} {v1}/{vt1}/{vn1} {v2}/{vt2}/{vn2} ({v3}/{vt3}/{vn3})'
     * @param {Number} entry_index The index of the entry to parse (v = 0, vt = 1, vn = 2)
     * @returns {Array<Number>} A list containing 3 (or 6) indices
     */
    parseFace(face_string, entry_index)
    {
        // Split the face string into vertex entries
        const vertices = face_string.trim().split(/\s+/).slice(1); // Remove the 'f' token
        let indices = [];
        
        // Process each vertex entry
        for (let vertex of vertices) {
            // Split vertex into its components (pos/tex/normal)
            const components = vertex.split('/');
            // Get the requested index (pos=0, tex=1, normal=2)
            let index = parseInt(components[entry_index]) - 1; // Convert to 0-based index
            indices.push(index);
        }
        
        // Handle quads (triangulate if necessary)
        if (indices.length === 4) {
            indices = this.triangulateFace(indices);
        }
        
        return indices;
        // NOTE: You can re-use A4's code here
    }

    /**
     * Triangulates a face entry given as a list of 4 indices
     * Return a new index list containing the triangulated indices
     * 
     * @param {Array<Number>} face The quad indices with 4 entries
     * @returns {Array<Number>} The newly created list containing triangulated indices
     */
    triangulateFace(face)
    {
        return [
            face[0], face[1], face[3],
            face[1], face[2], face[3]
        ]
    }
}



// JS Module Export -- No need to modify this
export
{
    OBJLoader
}