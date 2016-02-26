// TREE FUNCTIONS

/* function to get tree edges and nodes from user data
* @param {Object} vizObj
*/
function _getTreeInfo(vizObj) {

    // tree nodes
    var unique_nodes = _.uniq(
        _.pluck(vizObj.userConfig.tree_edges, "source").concat(
        _.pluck(vizObj.userConfig.tree_edges, "target")));
    vizObj.data.tree_nodes = unique_nodes.map(function(node, node_idx) {
        return {"name": node,
                "index": node_idx}
    });

    // tree edges (with source/target as indices in tree nodes array)
    vizObj.data.tree_edges = vizObj.userConfig.tree_edges.map(function(edge) {
        return {"source": unique_nodes.indexOf(edge.source),
                "target": unique_nodes.indexOf(edge.target)}
    });
}

/* function to get interval tree of segments for each chromosome
* @param {Object} vizObj
*/
function _getIntervalTree(vizObj) {

    var cnv_data = vizObj.userConfig.cnv_data, // cnv data from user
        chrom_bounds = vizObj.data.chrom_bounds;

    // interval tree object (first property level is the single cell id, next property level is the chromosome)
    var itrees = {};

    // for each cnv datum (chr, end, integer_copy_number, single_cell_id, start)
    for (var i = 0; i < cnv_data.length; i++) {
        var sc_id = cnv_data[i]["single_cell_id"];
        var chr = cnv_data[i]["chr"];

        // interval trees for this single cell id
        itrees[sc_id] = itrees[sc_id] || {};

        // interval trees for this single cell id and chromosome
        itrees[sc_id][chr] = itrees[sc_id][chr] || 
            new IntervalTree(Math.round((chrom_bounds[chr]["end"]-chrom_bounds[chr]["start"])/2));

        // add the current cnv datum to this interval tree
        itrees[sc_id][chr].add(
            cnv_data[i]["start"], 
            cnv_data[i]["end"], 
            i
        );
    }

    return itrees;
}

/* function to highlight a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} vizObj
*/
function _highlightNode(sc_id, vizObj) {
    d3.select("#node_" + sc_id)
        .style("fill", vizObj.generalConfig.highlightRed);
}

/* function to highlight indicator for a single cell
* @param {String} sc_id -- single cell id
*/
function _highlightIndicator(sc_id) {
    d3.select("#indic_" + sc_id)
        .style("fill-opacity", 1);
}

/* function to reset a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} vizObj
*/
function _resetNode(sc_id, vizObj) {
    d3.select("#node_" + sc_id)
        .style("fill", vizObj.generalConfig.defaultNodeColour);
}

/* function to reset indicator for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicator(sc_id) {
    d3.select("#indic_" + sc_id)
        .style("fill-opacity", 0);
}

/* function to reset all nodes in the tree
* @param {Object} vizObj
*/
function _resetNodes(vizObj) {
    d3.selectAll(".node")
        .style("fill", vizObj.generalConfig.defaultNodeColour);
}

/* function to reset all indicators for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicators() {
    d3.selectAll(".indicator")
        .style("fill-opacity", 0);
}

/* function to reset all links in the tree
* @param {Object} vizObj
*/
function _resetLinks(vizObj) {
    d3.selectAll(".link")
        .style("stroke", vizObj.generalConfig.defaultLinkColour);
}


// LINK FUNCTIONS

/* function to get the link id for a link data object
* @param {Object} d - link data object
*/
function _getLinkId(d) {
   return "link_" + d.source.name + "_" + d.target.name;
}

/* function for mouseover of link
* @param {Object} vizObj
* @param link_id -- id for the link that's currently highlighted
* @param link_ids -- ids for all links in tree
*/
function _linkMouseover(vizObj, link_id, link_ids) {

    // get downstream links, highlight heatmap
    _downstreamEffects(vizObj, link_id, link_ids); 
};

/* function for mouseout of link
* @param {Object} vizObj
*/
function _linkMouseout(vizObj) {
    // reset nodes
    d3.selectAll(".node")
        .style("fill", vizObj.generalConfig.defaultNodeColour);

    // reset indicators
    d3.selectAll(".indicator")
        .style("fill-opacity", 0);

    // reset links
    d3.selectAll(".link")
        .style("stroke", vizObj.generalConfig.defaultLinkColour);


};

/* recursive function to perform downstream effects upon tree link highlighting
* @param {Object} vizObj
* @param link_id -- id for the link that's currently highlighted
* @param link_ids -- ids for all links in tree
*/
function _downstreamEffects(vizObj, link_id, link_ids) {

    // get target id & single cell id
    var targetRX = new RegExp("link_.+_(.+)");  
    var target_id = targetRX.exec(link_id)[1];

    // highlight node
    d3.select("#node_" + target_id)
        .style("fill", vizObj.generalConfig.highlightRed);

    // highlight indicator for target
    d3.select("#indic_" + target_id)
        .style("fill-opacity", 1);

    // highlight link
    d3.select("#"+link_id)
        .style("stroke", vizObj.generalConfig.linkHighlightRed);

    // get the targets of this target
    var sourceRX = new RegExp("link_" + target_id + "_(.+)");
    var targetLinks_of_targetNode = [];
    link_ids.map(function(id) {
        if (id.match(sourceRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _downstreamEffects(vizObj, target_link_id, link_ids);
    });
};


// CNV FUNCTIONS

/* function to get chromosome min and max values
* @param {Object} vizObj
*/
function _getChromBounds(vizObj) {
    var chroms = vizObj.data.chroms;
    var chrom_bounds = {};

    // for each chromosome
    for (var i = 0; i < chroms.length; i++) {

        // get all the starts and ends of segments for this chromosome
        var cur_chrom_data = _.filter(vizObj.userConfig.cnv_data, function(cnv){ return cnv.chr == chroms[i]; });
        var cur_starts = _.pluck(cur_chrom_data, "start");
        var cur_ends = _.pluck(cur_chrom_data, "end");

        // find the min and max bounds of this chromosome
        chrom_bounds[chroms[i]] = {
            "start": Math.min(...cur_starts),
            "end": Math.max(...cur_ends)
        };
    }

    return chrom_bounds;
}

/* function to get the genome length
* @param {Object} chrom_bounds -- bounds of each chromosome (properties are chromosome names)
*/
function _getGenomeLength(chrom_bounds) {

    var chrom_ends = _.pluck(chrom_bounds, "end"); // end of each chromosome
    vizObj.data.genome_length = chrom_ends.reduce(function(a, b) {
        return a + b;
    });
}

/* function to create a 2D array to hold values for each grid cell
* @param {Object} vizObj
*/
function _getEmptyGrid(vizObj) {
    var pixels = [];
    var sc_ids = vizObj.data.sc_ids; // single cell ids

    for (var row = 0; row < sc_ids.length; row++) {
        for (var col = 0; col < vizObj.view.cnv.ncols; col++) {
            pixels.push({
                "row": row,
                "col": col,
                "sc_id": sc_ids[row]
            })
        }
    }

    return pixels;
};

/* function to fill the pixel grid with chromosome info (chr, start, end, mode_cnv)
* @param {Object} vizObj
*/
function _fillPixelWithChromInfo(vizObj) {
    var cnv_data = vizObj.userConfig.cnv_data, // cnv data from user
        nCols = vizObj.view.cnv.ncols,
        pixels = vizObj.view.cnv.pixels, // empty grid of pixels
        sc_ids = vizObj.data.sc_ids; // single cell ids

    // number of pixels filled with data 
    // (subtract number chromosome separators:
    // - 1 for each separator
    // - 1 for the end of each chromosome (we don't want chromosomes to share pixels))
    var n_data_pixels = vizObj.view.cnv.ncols - 2*(vizObj.data.chroms.length + 1), 
        n_bp_per_pixel = Math.ceil(vizObj.data.genome_length/n_data_pixels), // number of base pairs per pixel
        chr_index = 0, // index of current chromosome
        cur_chr = vizObj.data.chroms[chr_index], // current chromosome
        start_bp = vizObj.data.chrom_bounds[cur_chr]["start"], // start bp of the current pixel
        cur_sc_id = pixels[0]["sc_id"];

    // for each pixel
    for (var i = 0; i < pixels.length; i++) {
        var pixel = pixels[i];

        // if we're at the end of the single cell's genome, but excess pixels are on this row 
        if (!cur_chr && (pixel["sc_id"] == cur_sc_id)) {
            pixel["start"] = NaN;
            pixel["end"] = NaN;
            pixel["chr"] = "NA";
            pixel["mode_cnv"] = NaN;
            continue;                
        }

        // we're onto a new single cell
        if (pixel["sc_id"] != cur_sc_id) {
            cur_sc_id = pixel["sc_id"];
            chr_index = 0;
            cur_chr = vizObj.data.chroms[chr_index];
            start_bp = vizObj.data.chrom_bounds[cur_chr]["start"]; // start bp of the current pixel             
        } 

        // get genomic region in this bin
        var end_bp = start_bp + n_bp_per_pixel;
        pixel["start"] = start_bp;
        pixel["end"] = end_bp;
        pixel["chr"] = cur_chr;
        
        // get segments for this bin
        var segments = vizObj.data.itrees[pixel["sc_id"]][cur_chr].search(start_bp, end_bp);

        // copy numbers for each segment in this bin
        var integer_copy_numbers = [];
        _.pluck(segments, "id").forEach(function(segment_id) {
            integer_copy_numbers.push(cnv_data[segment_id]["integer_copy_number"]);
        });
        pixel["mode_cnv"] = _arrayMode(integer_copy_numbers);

        // update starting base pair
        start_bp = end_bp + 1;

        // check if we're onto a new chromosome
        if (start_bp > vizObj.data.chrom_bounds[cur_chr]["end"]) {

            // skip a pixel to leave chromosome separator
            i++;
            if (i < pixels.length) {
                pixels[i]["separator"] = true;
            }

            cur_chr = vizObj.data.chroms[++chr_index]; // next chromosome
            start_bp = (cur_chr) ? vizObj.data.chrom_bounds[cur_chr]["start"] : NaN;  // new starting base pair
        }       
    };

    // group consecutive pixels in the same single cell & same chromosome with the same copy number
    var new_pixels = [], // condensed array of pixels
        prev_start = pixels[0]["start"]; // starting bp for the current cnv
    pixels[0]["px_length"] = 1; // length of the first pixel
    for (var i = 1; i < pixels.length; i++) {

        // a new chromosome (a new single cell is automatically a new chromosome too)
        if (pixels[i-1]["chr"] != pixels[i]["chr"]) {
            prev_start = pixels[i]["start"]; 

            // pixel length is 1
            pixels[i]["px_length"] = 1;

            // append the previous pixel to the list
            new_pixels.push(pixels[i-1]);
        }

        // the same chromosome
        else {
            // same cnv value as the previous pixel
            if (pixels[i-1]["mode_cnv"] == pixels[i]["mode_cnv"]) {

                // bring forward the start of this pixel
                pixels[i]["start"] = prev_start;
                pixels[i]["px_length"] = pixels[i-1]["px_length"] + 1;
            }
            // different cnv value
            else {
                // update the starting bp for this cnv
                prev_start = pixels[i]["start"];

                // pixel length is 1
                pixels[i]["px_length"] = 1;

                // append the previous pixel to the list
                new_pixels.push(pixels[i-1]);
            }
        }
    }

    vizObj.view.cnv.pixels = new_pixels;

}

// GENERAL FUNCTIONS

/* alphanumeric sorting function
* from: http://stackoverflow.com/questions/4340227/sort-mixed-alpha-numeric-array
*/
function _sortAlphaNum(a,b) {
    var reA = /[^a-zA-Z]/g;
    var reN = /[^0-9]/g;
    var aA = a.replace(reA, "");
    var bA = b.replace(reA, "");
    if(aA === bA) {
        var aN = parseInt(a.replace(reN, ""), 10);
        var bN = parseInt(b.replace(reN, ""), 10);
        return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
        return aA > bA ? 1 : -1;
    }
}


/* function to get the mode of an array
* from: http://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
* @param arr -- array of values
*/
function _arrayMode(arr) 
{
    if(arr.length == 0)
        return null;
    var modeMap = {};
    var maxEl = arr[0], maxIntensity = 1;
    for(var i = 0; i < arr.length; i++)
    {
        var el = arr[i];
        if(modeMap[el] == null)
            modeMap[el] = 1;
        else
            modeMap[el]++;  
        if(modeMap[el] > maxIntensity)
        {
            maxEl = el;
            maxIntensity = modeMap[el];
        }
    }
    return maxEl;
}
