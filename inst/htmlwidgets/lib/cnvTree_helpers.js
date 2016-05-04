// D3 EFFECTS FUNCTIONS

/* mouseover function for group annotations
* highlights indicator & node for all sc's with this group annotation id, highlights group annotation rectangle in legend
* @param {String} group -- group to highlight
* @param {Object} vizObj
*/
function _mouseoverGroupAnnot(group, vizObj) {
    // highlight indicator & node for all sc's with this group annotation id
    vizObj.data.groups[group].forEach(function(sc) {
        _highlightIndicator(sc, vizObj);
        _highlightNode(sc, vizObj);
    })

    // highlight group annotation rectangle in legend
    _highlightGroupAnnotLegendRect(group, vizObj);
}

/* mouseover function for group annotations
* reset indicators, nodes, group annotation rectangles in legend
* @param {Object} vizObj
*/
function _mouseoutGroupAnnot(vizObj) {
    // reset indicators & nodes
    _resetIndicators();
    _resetNodes(vizObj);

    // reset group annotation rectangles in legend
    _resetGroupAnnotLegendRects();
}

/* function to highlight a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} vizObj
*/
function _highlightNode(sc_id, vizObj) {
    d3.select("#node_" + sc_id)
        .style("fill", vizObj.generalConfig.highlightColour);
}

/* function to highlight a group annotation rectangle in the legend
* @param {String} group_id -- group id
* @param {Object} vizObj
*/
function _highlightGroupAnnotLegendRect(group_id, vizObj) {
    d3.select(".legendGroupRect.group_" + group_id)
        .attr("stroke", vizObj.generalConfig.highlightColour);
}

/* function to unhighlight group annotation rectangles in the legend
*/
function _resetGroupAnnotLegendRects() {
    d3.selectAll(".legendGroupRect")
        .attr("stroke", "none");
}

/* function to highlight indicator for a single cell
* @param {String} sc_id -- single cell id
* @param {Object} vizObj
*/
function _highlightIndicator(sc_id, vizObj) {
    var config = vizObj.generalConfig;

    d3.select(".indic.sc_" + sc_id)
        .style("fill-opacity", 1);
}

/* function to reset a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} vizObj
*/
function _resetNode(sc_id, vizObj) {
    d3.select("#node_" + sc_id)
        .style("fill", function(d) {
            // group annotations specified -- colour by group
            if (vizObj.view.groupsSpecified) {
                var group = _.findWhere(vizObj.userConfig.sc_groups, {single_cell_id: d.name}).group;
                return vizObj.view.colour_assignment[group];
            }
            // no group annotations -- default colour
            return vizObj.generalConfig.defaultNodeColour;
        });
}

/* function to reset indicator for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicator(sc_id) {
    d3.select(".indic.sc_" + sc_id)
        .style("fill-opacity", 0);
}

/* function to reset all nodes in the tree
* @param {Object} vizObj
*/
function _resetNodes(vizObj) {
    d3.selectAll(".node")
        .style("fill", function(d) {
            // group annotations specified -- colour by group
            if (vizObj.view.groupsSpecified) {
                var group = _.findWhere(vizObj.userConfig.sc_groups, {single_cell_id: d.name}).group;
                return vizObj.view.colour_assignment[group];
            }
            // no group annotations -- default colour
            return vizObj.generalConfig.defaultNodeColour;
        });
}

/* function to reset all indicators for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicators() {
    d3.selectAll(".indic")
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
function _linkMouseover(vizObj, link_id) {

    // get downstream links, highlight heatmap
    _downstreamEffects(vizObj, link_id); 
};

/* function for mouseout of link
* @param {Object} vizObj
*/
function _linkMouseout(vizObj) {
    // reset nodes
    d3.selectAll(".node")
        .style("fill", function(d) {
            // group annotations specified -- colour by group
            if (vizObj.view.groupsSpecified) {
                var group = _.findWhere(vizObj.userConfig.sc_groups, {single_cell_id: d.name}).group;
                return vizObj.view.colour_assignment[group];
            }
            // no group annotations -- default colour
            return vizObj.generalConfig.defaultNodeColour;
        });

    // reset indicators
    d3.selectAll(".indic")
        .style("fill-opacity", 0);

    // reset links
    d3.selectAll(".link")
        .style("stroke", vizObj.generalConfig.defaultLinkColour);


};

/* recursive function to perform downstream effects upon tree link highlighting
* @param {Object} vizObj
* @param link_id -- id for the link that's currently highlighted
*/
function _downstreamEffects(vizObj, link_id) {

    // get target id & single cell id
    var targetRX = new RegExp("link_source_.+_target_(.+)");  
    var target_id = targetRX.exec(link_id)[1];

    // highlight node
    d3.select("#node_" + target_id)
        .style("fill", vizObj.generalConfig.highlightColour);

    // highlight indicator for target
    d3.select(".indic.sc_" + target_id)
        .style("fill-opacity", 1);

    // highlight link
    d3.select("#"+link_id)
        .style("stroke", vizObj.generalConfig.linkHighlightColour);

    // get the targets of this target
    var sourceRX = new RegExp("link_source_" + target_id + "_target_(.+)");
    var targetLinks_of_targetNode = [];
    vizObj.userConfig.link_ids.map(function(id) {
        if (id.match(sourceRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _downstreamEffects(vizObj, target_link_id);
    });
};

// GROUP ANNOTATION FUNCTIONS

/* function to get group annotations as object w/properties group : [array of single cells]
* @param {Object} vizObj
*/
function _reformatGroupAnnots(vizObj) {
    var groups = {};

    vizObj.userConfig.sc_groups.forEach(function(sc) {
        if (!groups[sc.group]) {
            groups[sc.group] = [];
        }
        groups[sc.group].push(sc.single_cell_id);
    });

    vizObj.data.groups = groups;
}

// CNV FUNCTIONS

/* function to get chromosome min and max values
* @param {Object} vizObj
*/
function _getChromBounds(vizObj) {
    var chroms = vizObj.userConfig.chroms;
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

// COLOUR FUNCTIONS


/* function to calculate colours for group annotations
* @param {Array} groups -- groups in dataset, for which we need colours
*/
function _getColours(groups) {

    var colour_assignment = {};

    var s = 0.95, // saturation
        l = 0.76; // lightness

    // number of nodes
    var n_nodes = groups.length;

    for (var i = 0; i < n_nodes; i++) {
        var h = i/n_nodes;
        var rgb = _hslToRgb(h, s, l); // hsl to rgb
        var col = _rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

        colour_assignment[groups[i]] = col;
    }

    return colour_assignment;  
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function _hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}


// convert RGB to hex
// http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
function _rgb2hex(rgb) {
     if (  rgb.search("rgb") == -1 ) {
          return rgb;
     } else {
          rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
          function hex(x) {
               return ("0" + parseInt(x).toString(16)).slice(-2);
          }
          return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
     }
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
