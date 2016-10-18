// D3 EFFECTS FUNCTIONS

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

/* brush selection ending function
* @param {Object} curVizObj
*/
function _brushEnd(curVizObj, brush) {
    var cur_selectedSCs = [];
    var extent = d3.event.target.extent();

    // if there were no previously selected single cells, inactivate all single cells
    if (curVizObj.view.selectedSCs.length === 0) {
        // turn off all single cells
        _inactivateSingleCells(curVizObj.view_id);
    }

    // if the brush is not empty
    if (!brush.empty()) {
        
        // highlight selected grid cell rows
        d3.select("#" + curVizObj.view_id).selectAll(".indic").classed("active", function(d) {
            var y_coord = parseFloat(d3.select(this).attr("y"));
            // if any transformation has occurred
            var t = d3.transform(d3.select(this).attr("transform")), 
                t_y = t.translate[1];
            var brushed = extent[0] <= (y_coord+curVizObj.view.hm.rowHeight+t_y) && (y_coord+t_y) <= extent[1];
            if (brushed) {
                cur_selectedSCs.push(d);
            }
            return brushed;
        });

        // highlight selected sc's indicators & nodes
        cur_selectedSCs.forEach(function(sc_id) {
            _highlightIndicator(sc_id, curVizObj.view_id);   
            _highlightSingleCell(sc_id, curVizObj.view_id);    
        });

        // add the currently selected single cells to the curVizObj list
        curVizObj.view.selectedSCs = curVizObj.view.selectedSCs.concat(cur_selectedSCs);
    } 
    // if the brush is empty
    else {
        _clearBrush(curVizObj.view_id);
    }

    // clear brush
    d3.select("#" + curVizObj.view_id).select(".brush").call(brush.clear());
}

/* function to check for selections
*/
function _checkForSelections(view_id) {
    return ((d3.select("#" + view_id).selectAll(".brushButtonSelected")[0].length === 0) && // brush button not selected
            (d3.select("#" + view_id).selectAll(".scissorsButtonSelected")[0].length === 0)); // scissors button not selected
}

/* function to clear any brush selection
*/
function _clearBrush(view_id) {
    d3.select("#" + view_id).select(".cnvSVG").classed("brushed", false);
    d3.select("#" + view_id).selectAll(".gridCell").classed("active", false);

    // reset nodes and indicators
    _resetSingleCells(view_id);
    _resetIndicators(view_id);

    // reset selectedSCs list
    curVizObj.view.selectedSCs = [];
}

/* function for node mouseover
* @param {String} sc_id -- single cell id
* @param {String} view_id -- id of current view
* @param {Object} nodeTip -- tooltip for node
* @param {Boolean} switchView -- which view is on, tree (T) or graph (F)
* @param {Array} sc_annot -- annotations for single cells (provided by user)
*/
function _mouseoverNode(sc_id, view_id, nodeTip, switchView, sc_annot) {
    // show single cell tooltip
    if (switchView) {
        nodeTip.show(sc_id, d3.select("#" + view_id).select(".tree.node.node_" + sc_id).node());
    }
    else {
        nodeTip.show(sc_id, d3.select("#" + view_id).select(".graph.node.node_" + sc_id).node());
    }

    // highlight indicator 
    _highlightIndicator(sc_id, view_id);

    // highlight node's genotype and timepoint
    var gtype = _getGenotype(sc_annot, sc_id);
    var tp = _getTP(sc_annot, sc_id);
    d3.select("#" + view_id).selectAll(".legendGroupRect").classed("active", false);
    d3.select("#" + view_id).selectAll(".legendGroupRect.gtype_" + gtype).classed("active", true);
    d3.select("#" + view_id).selectAll(".legendTpRect").classed("active", false);
    d3.select("#" + view_id).selectAll(".legendTpRect.tp_" + tp).classed("active", true);

    // highlight node itself & bring it to front
    d3.select("#" + view_id).selectAll(".graph.node.node_" + sc_id).classed("active", true);
    d3.select("#" + view_id).selectAll(".tree.node.node_" + sc_id).classed("active", true);
    d3.select(d3.select("#" + view_id).selectAll(".graph.node.node_" + sc_id).node().parentNode).moveToFront();
    d3.select(d3.select("#" + view_id).selectAll(".tree.node.node_" + sc_id).node().parentNode).moveToFront();
}

/* function for node mouseout
* @param {String} sc_id -- single cell id
* @param {String} view_id -- id of current view
* @param {Object} nodeTip -- tooltip for node
*/
function _mouseoutNode(sc_id, view_id, nodeTip) {
    // hide tooltip
    nodeTip.hide(sc_id);

    //unhighlight indicator TODO
    _resetIndicator(view_id, sc_id);

    // reset genotypes
    _mouseoutGenotype(view_id);

    // reset timepoints
    _mouseoutTp(view_id);
}

/* function for genotype mouseover
* @param {String} gtype -- genotype to highlight
* @param {String} view_id -- id of current view
*/
function _mouseoverGenotype(gtype, view_id) {

    _inactivateGenotypes(view_id);
    _highlightGenotype(gtype, view_id);
}

/* function for timepoint mouseover
* @param {String} tp -- timepoint to highlight
* @param {String} view_id -- id of current view
*/
function _mouseoverTp(tp, view_id) {
    _inactivateTps(view_id);
    _highlightTp(tp, view_id);
}

/* function for genotype mouseout
* @param {String} view_id -- id of current view
*/
function _mouseoutGenotype(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".graph.node").classed("active", false);
    d3.select("#" + view_id).selectAll(".tree.node").classed("active", false);
    d3.select("#" + view_id).selectAll(".legendGroupRect").classed("active", false);
    d3.select("#" + view_id).selectAll(".tsPlot").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".legendTreeNode").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".indic").attr("fill-opacity", 0);
}

/* function for timepoint mouseover
* @param {String} view_id -- id of current view
*/
function _mouseoutTp(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".legendTpRect").classed("active", false);
    d3.select("#" + view_id).selectAll(".indic").attr("fill-opacity", 0);
    _hideTpGuides(view_id);
}

/* function to inactivate all genotypes
* @param {String} view_id -- id of current view
*/
function _inactivateGenotypes(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".legendGroupRect").classed("active", false);
    d3.select("#" + view_id).selectAll(".tsPlot").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".legendTreeNode").classed("inactive", true);
}

/* function to inactivate all timepoints
* @param {String} view_id -- id of current view
*/
function _inactivateTps(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".legendTpRect").classed("active", false);
    _hideTpGuides(view_id);
}

/* function to highlight a particular genotype
* @param {String} gtype -- genotype to highlight
* @param {String} view_id -- id of current view
*/
function _highlightGenotype(gtype, view_id) {
    d3.select("#" + view_id).selectAll(".indic.gtype_" + gtype).attr("fill-opacity", 1);
    d3.select("#" + view_id).selectAll(".graph.node.gtype_" + gtype).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node.gtype_" + gtype).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".legendGroupRect.gtype_" + gtype).classed("active", true);
    d3.select("#" + view_id).selectAll(".tsPlot.gtype_" + gtype).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".legendTreeNode.gtype_" + gtype).classed("inactive", false);
}

/* function to highlight a particular timepoint
* @param {String} tp -- timepoint to highlight
* @param {String} view_id -- id of current view
*/
function _highlightTp(tp, view_id) {
    d3.select("#" + view_id).selectAll(".indic.tp_" + tp).attr("fill-opacity", 1);
    d3.select("#" + view_id).selectAll(".graph.node.tp_" + tp).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node.tp_" + tp).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".legendTpRect.tp_" + tp).classed("active", true);
    _hlTpGuide(view_id, tp);
}

/* function to highlight a single cell
* @param {String} sc_id -- single cell id
* @param {String} view_id -- id of current view
*/
function _highlightSingleCell(sc_id, view_id) {
    d3.select("#" + view_id).selectAll(".graph.node.node_" + sc_id).classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node.node_" + sc_id).classed("inactive", false);
}

/* function to inactivate all single cells
* @param {String} view_id -- id of current view
*/
function _inactivateSingleCells(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", true);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", true);
}

/* function to reset all single cells
* @param {String} view_id -- id of current view
*/
function _resetSingleCells(view_id) {
    d3.select("#" + view_id).selectAll(".graph.node").classed("inactive", false);
    d3.select("#" + view_id).selectAll(".tree.node").classed("inactive", false);
}

/* function to highlight a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} curVizObj
*/
function _highlightNode(sc_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id)
        .attr("fill", curVizObj.generalConfig.highlightColour);
}

/* function to highlight a genotype annotation rectangle in the legend
* @param {String} gtype_id -- genotype id
* @param {String} highlightColour -- colour to highlight indicators/nodes
*/
function _highlightGroupAnnotLegendRect(gtype_id, highlightColour, view_id) {
    d3.select("#" + view_id).select(".legendGroupRect.gtype_" + gtype_id)
        .attr("stroke", highlightColour);
}

/* function to unhighlight genotype annotation rectangles in the legend
* @param {String} view_id -- id of current view
*/
function _resetGroupAnnotLegendRects(view_id) {
    d3.select("#" + view_id).selectAll(".legendGroupRect")
        .attr("stroke", "none");
}

/* function to highlight indicator for a single cell
* @param {String} sc_id -- single cell id
* @param {String} view_id -- id for current view
*/
function _highlightIndicator(sc_id, view_id) {
    d3.select("#" + view_id).select(".indic.sc_" + sc_id).attr("fill-opacity", 1);
}

/* function to reset a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} curVizObj
*/
function _resetNode(sc_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id)
        .attr("fill", function(d) {
            return _getNodeFill(curVizObj, d.sc_id);
        });
}

/* function to reset indicator for a single cell
* @param {String} sc_id -- single cell id
* @param {String} view_id -- id for current view
*/
function _resetIndicator(view_id, sc_id) {
    d3.select("#" + view_id).select(".indic.sc_" + sc_id)
        .attr("fill-opacity", 0);
}

/* function to reset all nodes in the tree
* @param {String} view_id -- id for current view
*/
function _resetNodes(view_id) {
    d3.select("#" + view_id).selectAll(".node")
        .attr("fill", function(d) { return d.fill; });
}

/* function to get the fill colour of a node
* @param {Object} curVizObj
* @param {String} sc_id -- single cell id
*/
function _getNodeFill(curVizObj, sc_id) {
    var missingColour = "white";

    // genotype annotations specified -- colour by genotype
    if (curVizObj.view.gtypesSpecified) {
        var found_sc_with_gtype = _.findWhere(curVizObj.userConfig.sc_annot, {single_cell_id: sc_id});
        return (found_sc_with_gtype) ? // if this sc has a genotype
            curVizObj.view.alpha_colour_assignment[found_sc_with_gtype.genotype] : 
            missingColour;
    }
    // no genotype annotations -- default colour, unless heatmap data is missing for this cell
    else {
        return (curVizObj.data.missing_scs_to_plot.indexOf(sc_id) != -1) ? 
            missingColour : curVizObj.generalConfig.defaultNodeColour;
    }
}

/* function to get the stroke colour of a node
* @param {Object} curVizObj
* @param {String} sc_id -- single cell id
*/
function _getNodeStroke(curVizObj, sc_id) {
    // genotype annotations specified -- colour by genotype
    if (curVizObj.view.gtypesSpecified) {
        var found_sc_with_gtype = _.findWhere(curVizObj.userConfig.sc_annot, {single_cell_id: sc_id});
        return (found_sc_with_gtype) ? // if this sc has a genotype
            curVizObj.view.colour_assignment[found_sc_with_gtype.genotype] : 
            curVizObj.generalConfig.defaultNodeColour;
    }
    // no genotype annotations -- default colour
    return curVizObj.generalConfig.defaultNodeColour;
}

/* function to reset all indicators for a single cell
* @param {String} view_id -- id for the current view
*/
function _resetIndicators(view_id) {
    d3.select("#" + view_id).selectAll(".indic")
        .attr("fill-opacity", 0);
}

/* function to reset all links in the tree
* @param {Object} curVizObj
*/
function _resetLinks(curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".link")
        .attr("stroke", curVizObj.generalConfig.defaultLinkColour);
}

/* brush selection button push function
* @param {Object} brush -- brush object
* @param {Object} curVizObj
*/
function _pushBrushSelectionButton(brush, curVizObj) {

    // deselect brush tool
    if (d3.select("#" + curVizObj.view_id).select(".selectionButton").classed("brushButtonSelected")) {
        // deselect any nodes and indicators
        _clearBrush(curVizObj.view_id);

        // remove brush tool
        d3.select("#" + curVizObj.view_id).select(".brush").remove();

        // remove "brushButtonSelected" class from button
        d3.select("#" + curVizObj.view_id).select(".selectionButton").classed("brushButtonSelected", false); 

        // reset colour of the brush selection button
        d3.select("#" + curVizObj.view_id).select(".selectionButton").attr("fill", curVizObj.generalConfig.topBarColour);
    }
    // select brush tool
    else {
        // mark this button as brushButtonSelected
        d3.select("#" + curVizObj.view_id).select(".selectionButton").classed("brushButtonSelected", true); 

        // create brush tool
        curVizObj.view.cnvSVG.append("g") 
            .attr("class", "brush")
            .call(brush)
            .selectAll('rect')
            .attr('width', curVizObj.userConfig.heatmapWidth);
    }
}

/* scissors button push function
* @param {Object} curVizObj
*/
function _pushScissorsButton(curVizObj) {

    // deselect scissors tool
    if (d3.select("#" + curVizObj.view_id).select(".scissorsButton").classed("scissorsButtonSelected")) {
        // remove "scissorsButtonSelected" class from button
        d3.select("#" + curVizObj.view_id).select(".scissorsButton").classed("scissorsButtonSelected", false); 

        // reset colour of the brush scissors button
        d3.select("#" + curVizObj.view_id).select(".scissorsButton").attr("fill", curVizObj.generalConfig.topBarColour);
    }
    // select scissors tool
    else {
        // mark this button as scissorsButtonSelected
        d3.select("#" + curVizObj.view_id).select(".scissorsButton").classed("scissorsButtonSelected", true); 
    }
}

/* push reroot button
*/
function _pushRerootButton(curVizObj) {
    // if this button is not selected
    if (d3.select("#" + curVizObj.view_id).selectAll(".rerootButtonSelected")[0].length === 0) {
        d3.select("#" + curVizObj.view_id).selectAll(".rerootButton").classed("rerootButtonSelected", true);
        d3.select("#" + curVizObj.view_id).selectAll("rect.rerootButton").attr("fill", curVizObj.generalConfig.topBarHighlight);
    }
    else {
        d3.select("#" + curVizObj.view_id).selectAll(".rerootButton").classed("rerootButtonSelected", false);
        d3.select("#" + curVizObj.view_id).selectAll("rect.rerootButton").attr("fill", curVizObj.generalConfig.topBarColour);
    }
}

/* push branch flip button
*/
function _pushBranchFlipButton(curVizObj) {
    // if this button is not selected
    if (d3.select("#" + curVizObj.view_id).selectAll(".flipBranchButtonSelected")[0].length === 0) {
        d3.select("#" + curVizObj.view_id).selectAll(".flipBranchButton").classed("flipBranchButtonSelected", true);
        d3.select("#" + curVizObj.view_id).selectAll("rect.flipBranchButton").attr("fill", curVizObj.generalConfig.topBarHighlight);
    }
    else {
        d3.select("#" + curVizObj.view_id).selectAll(".flipBranchButton").classed("flipBranchButtonSelected", false);
        d3.select("#" + curVizObj.view_id).selectAll("rect.flipBranchButton").attr("fill", curVizObj.generalConfig.topBarColour);
    }
}

// TREE FUNCTIONS

/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
* @param {Array} list - list of nodes
* @param {String} name - name of key to find
*/
function _gt_findTreeByRoot(list, name) {
    var foundNode = _.findWhere(list, {id: name}),
        curNode;

    if (!foundNode) {
        curNode = {'id': name, 'children': []};
        list.push(curNode);
        return curNode;
    }

    return foundNode;
}

/*
* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
* @param {Object} curNode -- current key in the tree
* @param {Object} chains -- originally empty object of the segments 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} base -- the base key of this chain (originally "")
*/
function _gt_getLinearTreeSegments(curVizObj, curNode, chains, base) {

    // if it's a new base, create the base, with no descendants in its array yet
    if (base === "") {
        base = curNode.id;
        chains[base] = [];
        curVizObj.data.gtypeTreeChainRoots.push(curNode.id);
    }
    // if it's a linear descendant, append the current key to the chain
    else {
        chains[base].push(curNode.id);
    }

    // if the current key has 1 child to search through
    if (curNode.children.length == 1) { 
        _gt_getLinearTreeSegments(curVizObj, curNode.children[0], chains, base);
    }

    // otherwise for each child, create a blank base (will become that child)
    else {
        for (var i = 0; i < curNode.children.length; i++) {
            _gt_getLinearTreeSegments(curVizObj, curNode.children[i], chains, "");
        }
    }

    return chains;
}

/* function to handle single cells that are missing heatmap data
* --> store the single cells missing heatmap data that we should still plot in the phylogeny 
*     (ONLY those whose descendants do have heatmap data)
* --> remove any cells that do not have data-associated descendants
* @param {Object} curVizObj
*/
function _handleMissingScs(curVizObj) {
    // plot single cells that don't have heatmap data ONLY IF their descendants do have heatmap data
    curVizObj.data.missing_scs_to_plot = [];
    curVizObj.data.missing_scs_to_remove = [];
    curVizObj.userConfig.scs_missing_from_hm.forEach(function(sc_id) {

        // descendants
        var cur_descs = curVizObj.data.treeDescendantsArr[sc_id];

        // if at least one of the descendants have heatmap data, add it to the list of missing scs to plot
        var cur_descs_missing_data = _getIntersection(cur_descs, curVizObj.userConfig.scs_missing_from_hm);
        if (cur_descs_missing_data.length != cur_descs.length) {
            curVizObj.data.missing_scs_to_plot.push(sc_id);
        }

        // otherwise, mark the node as removable
        else {
            console.warn("Single cell " + sc_id + " present in the phylogeny, but will be removed from the " + 
                "view as it does not have heatmap data, nor do any of its descendants have heatmap data.")
            curVizObj.data.missing_scs_to_remove.push(sc_id);
        }

    });
}

/* function to get the y-coordinate for each single cell
* @param {Object} curVizObj
*/
function _getYCoordinates(curVizObj) {
    var config = curVizObj.generalConfig;
    
    curVizObj.data.yCoordinates = {}; // y-coordinates for each single cell (each single cell id is a property)
    
    // keep track of single cells that have been assigned
    var assigned_scs = $.extend([], curVizObj.data.hm_sc_ids);

    // height of heatmap 
    var hmHeight = (curVizObj.userConfig.heatmap_type == "cnv") ? 
        (config.hmHeight-config.chromLegendHeight) : config.hmHeight;

    // for each single cell in the heatmap
    curVizObj.data.hm_sc_ids.forEach(function(sc_id, sc_id_i) {

        // starting y-coordinate for this id
        curVizObj.data.yCoordinates[sc_id] = 
            config.paddingGeneral + config.spacingForTitle + (sc_id_i/curVizObj.view.hm.nrows)*hmHeight; 
    });

    _getYCoordinatesLatentNodes(curVizObj, assigned_scs, curVizObj.data.yCoordinates);
}

/* function to get y coordinates for the latent nodes
* @param yCoords -- y coordinates assigned
*/
function _getYCoordinatesLatentNodes(curVizOb, assigned_scs, yCoords) {

    // sort single cells w/o data by descending number of ancestors
    var missing_scs_sorted = [];
    curVizObj.data.missing_scs_to_plot.forEach(function(sc_id) {
        missing_scs_sorted.push({
            sc_id: sc_id,
            n_ancestors: curVizObj.data.treeAncestorsArr[sc_id].length
        });
    });

    _sortByKey(missing_scs_sorted, "n_ancestors"); 
    missing_scs_sorted.reverse();

    // for each single cell that doesn't have heatmap data
    missing_scs_sorted.forEach(function(sc, sc_id_i) {
        var y_coordinates_of_direct_descendants = [];
        var cur_direct_descendants = // direct descendants already assigned a y-coordinate
            _getIntersection(curVizObj.data.direct_descendants[sc.sc_id], assigned_scs);
        var cur_direct_ancestor = // direct ancestors already assigned a y-coordinate
            _getIntersection([curVizObj.data.direct_ancestors[sc.sc_id]], assigned_scs);
        
        // if the cell has descendants with y-coordinates already assigned
        if (cur_direct_descendants.length > 0) {

            // for each of its direct descendants, get the y-coordinate
            cur_direct_descendants.forEach(function(desc) {
                if (yCoords[desc]) {
                    y_coordinates_of_direct_descendants.push(yCoords[desc]);
                }
            });

            // set the y-coordinate for this latent single cell to be 
            // the midpoint between the min and max y-coordinates of these direct descendants
            var min_y = Math.min.apply(Math, y_coordinates_of_direct_descendants);
            var max_y = Math.max.apply(Math, y_coordinates_of_direct_descendants);
            var mid_y = (min_y + max_y)/2;
            yCoords[sc.sc_id] = mid_y;  
        }

        // if the cell has an ancestor with y-coordinates already assigned
        else if (cur_direct_ancestor.length > 0) {
            // set the y-coordinate of this latent single cell to be
            // the y coordinate of its ancestor
            yCoords[sc.sc_id] = yCoords[cur_direct_ancestor]; 
        }

        // the cell must be a latent root node
        else {
            yCoords[sc.sc_id] = config.paddingGeneral + (hmHeight/2);
        }

        // mark this cell as assigned to a y-coordinate
        assigned_scs.push(sc.sc_id);

    });
}


/* function to get the x-coordinate for each single cell in the tree
* @param {Object} curVizObj
*/
function _getXCoordinates(curVizObj) {
    var config = curVizObj.generalConfig;

    // radius of nodes
    var r = (curVizObj.userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;
    
    // x-coordinates for each single cell (each single cell id is a property)
    curVizObj.data.xCoordinates = {}; 
    curVizObj.data.xCoordinatesDist = {}; // x coordinates with distances taken into account

    // for each single cell in the tree
    curVizObj.userConfig.sc_tree_nodes.forEach(function(node, sc_id_i) {

        // width of tree 
        var treeWidth = config.treeWidth - 4*r; // spacing of one radius before and after
        var spaceBeforeStart = 2*r; // space before the first x-coordinate

        // number of ancestors for this single cell
        var n_ancestors = curVizObj.data.treeAncestorsArr[node.sc_id].length;

        // starting x-coordinate for this single cell
        curVizObj.data.xCoordinates[node.sc_id] = 
            spaceBeforeStart + (treeWidth/(curVizObj.data.tree_height-1)) * n_ancestors; 

        // if there is distance info for each edge
        if (curVizObj.userConfig.distances_provided) {
            curVizObj.data.xCoordinatesDist[node.sc_id] = 
                spaceBeforeStart + (curVizObj.data.pathDists[node.sc_id] / curVizObj.data.max_tree_path_dist)*treeWidth;
        }
    });
}

/* function for mouseout of link
* @param {Object} curVizObj
* @param {Boolean} resetSelectedSCList -- whether or not to reset the seleted sc list
*/
function _linkMouseout(curVizObj, resetSelectedSCList) {
    // if there's no node or link selection taking place, or scissors tool on, reset the links
    if (_checkForSelections(curVizObj.view_id) || d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {
        // reset nodes & indicators
        _resetSingleCells(curVizObj.view_id);
        _resetIndicators(curVizObj.view_id);

        // reset links
        d3.select("#" + curVizObj.view_id).selectAll(".link")
            .attr("stroke", curVizObj.generalConfig.defaultLinkColour);

        // reset list of selected cells & links
        if (resetSelectedSCList) {
            curVizObj.view.selectedSCs = [];
            curVizObj.view.selectedLinks = [];
        }
    }
}

/* function for mouseover of link
* @param {Object} curVizObj
* @param {String} link_id -- id for mousedover link
*/
function _linkMouseover(curVizObj, link_id) {
    // if there's no node or link selection taking place
    if (_checkForSelections(curVizObj.view_id)) {
        // turn off all single cells
        _inactivateSingleCells(curVizObj.view_id);
        // highlight downstream links
        _downstreamEffects(curVizObj, link_id);                     
    }
    // if scissors button is selected
    else if (d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {

        // reset lists of selected links and scs
        curVizObj.view.selectedSCs = [];
        curVizObj.view.selectedLinks = [];

        // turn off all single cells
        _inactivateSingleCells(curVizObj.view_id);
        // highlight downstream links
        _downstreamEffects(curVizObj, link_id); 

        // highlight the potentially-cut link red
        if (curVizObj.generalConfig.switchView) { // tree view is on
            d3.select("#" + curVizObj.view_id).select(".tree."+link_id)
                .attr("stroke", "red");
        }
        else { // graph view is on
            d3.select("#" + curVizObj.view_id).select(".graph."+link_id)
                .attr("stroke", "red");
        }
    }
}

/* function for clicked link (tree trimming)
* @param {Object} curVizObj
* @param {String} link_id -- id for clicked link
*/
function _linkClick(curVizObj, link_id) {
    var userConfig = curVizObj.userConfig,
        index_link,
        index_edge,
        index_hm,
        index_not_hm,
        index_sc_tree_nodes;

    // if scissors button is selected
    if (d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {

        // keep track of the y-coordinate boundaries for the removed single cells
        var max_y = -Infinity;
        var min_y = Infinity;

        // for each link
        curVizObj.view.selectedLinks.forEach(function(link_id) {
            // remove link
            d3.select("#" + curVizObj.view_id).selectAll("." + link_id).remove();

            // remove link from list of links
            index_link = userConfig.link_ids.indexOf(link_id);
            userConfig.link_ids.splice(index_link, 1);

            // remove link from list of edges
            var foundLink = _.findWhere(curVizObj.userConfig.sc_tree_edges, {link_id: link_id});
            index_edge = curVizObj.userConfig.sc_tree_edges.indexOf(foundLink);
            if (index_edge != -1) {
                curVizObj.userConfig.sc_tree_edges.splice(index_edge, 1);
            }
        });
        // for each single cell
        curVizObj.view.selectedSCs.forEach(function(sc_id) {

            // get the y-coordinate for this single cell
            var original_y = parseFloat(d3.select("#" + curVizObj.view_id).selectAll(".tree.node_" + sc_id).attr("cy"));
            var t_y = _getTreeNodeYTranslation(curVizObj.view_id, sc_id); 
            var cur_y = original_y + t_y;
            if (cur_y > max_y) { 
                max_y = cur_y;
            }
            if (cur_y < min_y) {
                min_y = cur_y;
            }

            // remove the single cell in the view
            d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id).remove(); // remove node in tree and graph
            d3.select("#" + curVizObj.view_id).selectAll(".nodeLabel_" + sc_id).remove(); // remove node labels
            d3.select("#" + curVizObj.view_id).select(".gridCellG.sc_" + sc_id).remove(); // remove copy number profile
            d3.select("#" + curVizObj.view_id).select(".gtypeAnnot.sc_" + sc_id).remove(); // remove genotype annotation
            d3.select("#" + curVizObj.view_id).select(".tpAnnot.sc_" + sc_id).remove(); // remove timepoint annotation
            d3.select("#" + curVizObj.view_id).select(".indic.sc_" + sc_id).remove(); // remove indicator

            // remove single cell from userConfig nodes list
            var foundNode = _.findWhere(curVizObj.userConfig.sc_tree_nodes, {sc_id: sc_id});
            index_sc_tree_nodes = curVizObj.userConfig.sc_tree_nodes.indexOf(foundNode);
            if (index_sc_tree_nodes != -1) {
                curVizObj.userConfig.sc_tree_nodes.splice(index_sc_tree_nodes, 1);
            }
            // remove single cell from list of single cells in heatmap
            index_hm = curVizObj.data.hm_sc_ids.indexOf(sc_id);
            if (index_hm != -1) {
                curVizObj.data.hm_sc_ids.splice(index_hm, 1);
            }
            // remove single cell from list of single cells NOT in heatmap
            index_not_hm = curVizObj.data.missing_scs_to_plot.indexOf(sc_id);
            if (index_not_hm != -1) {
                curVizObj.data.missing_scs_to_plot.splice(index_not_hm, 1);
            }

            // remove single cell from tree ancestors / descendants arrays
            delete curVizObj.data.treeAncestorsArr[sc_id];
            delete curVizObj.data.direct_ancestors[sc_id];
            delete curVizObj.data.treeDescendantsArr[sc_id];
            delete curVizObj.data.direct_descendants[sc_id];
            Object.keys(curVizObj.data.treeDescendantsArr).forEach(function(key) {
                var cur_descs = curVizObj.data.treeDescendantsArr[key];
                var cur_i = cur_descs.indexOf(sc_id);
                if (cur_i > -1) {
                    cur_descs.splice(cur_i, 1);
                }
            });
            Object.keys(curVizObj.data.direct_descendants).forEach(function(key) {
                var cur_descs = curVizObj.data.direct_descendants[key];
                var cur_i = cur_descs.indexOf(sc_id);
                if (cur_i > -1) {
                    cur_descs.splice(cur_i, 1);
                }
            });

            // remove single cell from y- and x-coordinates lists
            delete curVizObj.data.yCoordinates[sc_id];
            delete curVizObj.data.xCoordinates[sc_id];
            delete curVizObj.data.xCoordinatesDist[sc_id];
        });

        // height of removed cells (+ 1 row for the two row halves on either side)
        var removal_height = (max_y-min_y) + curVizObj.view.hm.rowHeight;

        // reset single cells
        _resetSingleCells(curVizObj.view_id);

        // adjust copy number matrix to fill the entire space
        d3.timer(_updateTrimmedMatrix(curVizObj, removal_height, max_y, $.extend([],curVizObj.view.selectedSCs)), 300);

        // reset lists of selected links and selected single cells
        curVizObj.view.selectedLinks = [];
        curVizObj.view.selectedSCs = [];
    }
}

/* recursive function to perform downstream effects upon tree link highlighting
* @param {Object} curVizObj
* @param link_id -- id for the link that's currently highlighted
*/
function _downstreamEffects(curVizObj, link_id) {

    // get target id & single cell id
    var targetRX = new RegExp("link_source_.+_target_(.+)");  
    var target_id = targetRX.exec(link_id)[1];

    // add this target sc and link id to the lists of selected scs and links
    curVizObj.view.selectedSCs.push(target_id);
    curVizObj.view.selectedLinks.push(link_id);

    // highlight node & its indicator
    _highlightSingleCell(target_id, curVizObj.view_id);
    _highlightIndicator(target_id, curVizObj.view_id);

    // get the targets of this target
    var sourceRX = new RegExp("link_source_" + target_id + "_target_(.+)");
    var targetLinks_of_targetNode = [];
    curVizObj.userConfig.link_ids.map(function(id) {
        if (id.match(sourceRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _downstreamEffects(curVizObj, target_link_id);
    });
}

/* function to get order of tree nodes
* @param {Object} descendants -- descendants for each node
* param link_ids -- ids for all links in tree
* param node_name -- the name of the current node - start with root
* param nodeOrder -- array of node order - starts empty, appended to as function executes
* @param scs_not_in_hm -- single cells not in the heatmap (don't add them to node order)
*/
function _getNodeOrder(descendants, link_ids, node_name, nodeOrder, scs_not_in_hm) {

    // get the targets of this node
    var targetRX = new RegExp("link_source_" + node_name + "_target_(.+)");
    var targets = [];
    link_ids.map(function(id) {
        if (id.match(targetRX)) {
            var cur_target = targetRX.exec(id)[1];
            targets.push({ "sc_id": cur_target, 
                           "n_desc": descendants[cur_target].length });
        }
    });

    // if there are no targets, and this node is in the heatmap, append the current node to the node order array
    if ((targets.length === 0) && (scs_not_in_hm.indexOf(node_name) == -1)) {
        nodeOrder.push(node_name);
    }
    // there are targets
    else {
        // order the targets by how many descendants they have
        _sortByKey(targets, "n_desc");

        // for each of the targets
        targets.map(function(target, target_i) {
            // if we're at the middle target, append the current node to the node order array
            if ((target_i == Math.floor(targets.length/2)) && (scs_not_in_hm.indexOf(node_name) == -1)) {
                nodeOrder.push(node_name);
            }
            // get targets of this target
            _getNodeOrder(descendants, link_ids, target.sc_id, nodeOrder, scs_not_in_hm);
        });
    }

    return nodeOrder;
}

/* function to get font size for labels, given their content the size of the nodes that contain them
* @param {Array} labels -- array of node labels
* @param {Number} width -- width of svg element that will contain the label
*/
function _getLabelFontSize(labels, width) {

    // find the longest node label (in terms of # characters)
    var max_n_chars = 0;
    labels.forEach(function(label) {
        // parse integer (if the label is an integer) to remove leading zeros
        var label_parsed_int = parseInt(label, 10); 

        // number of characters in the label
        var n_chars = (!isNaN(label_parsed_int)) ? label_parsed_int.toString().length : label.length;

        // update max label length (# characters)
        if (n_chars > max_n_chars) {
            max_n_chars = n_chars; 
        }
    });

    // get font size, given longest node label (4 pixels per character)
    var aspect_ratio = 7/4; // font aspect ratio of (font height / font width)
    var font_size = (width - 2) / max_n_chars * aspect_ratio;

    return font_size;
}

/* function to retrieve a single cell's descendant tree structure object by its index, 
* or create the single cell as a new root of a tree if it doesn't already exist
* @param {String} sc_id -- id of the single cell
* @param {Array} nodes -- nodes from which to search for node of interest
*/
function _retrieveSCTree(sc_id, nodes) {
   var foundNode = _.findWhere(nodes, {sc_id: sc_id});
   if (!foundNode) {
      nodes.push({children: [], name: sc_id, sc_id: sc_id});
      foundNode = _.findWhere(nodes, {sc_id: sc_id});
   }
   return foundNode;
}

/* function to get the tree structures for each node, given an array of edges 
* param {Array} directed_edges -- array of directed edges objects (source, target)
*/
function _getTreeStructures(directed_edges) {
   var treeStructures = []; // all (descendant) tree structures for all single cells 

   directed_edges.forEach(function(edge) {
      var parent = _retrieveSCTree(edge.source_sc_id, treeStructures);
      var child = _retrieveSCTree(edge.target_sc_id, treeStructures);
      if (parent.children) parent.children.push(child);
      else parent.children = [child];
   });

   return treeStructures;
}

/* function to get descendants id's for the specified key
* @param {Object} root - key for which we want descendants
* @param {Array} descendants - initially empty array for descendants to be placed into
*/
function _getDescendantIds(root, descendants) {
    var child;

    if (root.children.length > 0) {
        for (var i = 0; i < root.children.length; i++) {
            child = root.children[i];
            descendants.push(child.sc_id);
            _getDescendantIds(child, descendants);
        }
    }
    return descendants;
}

/* function to get the DIRECT descendant id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _getDirectDescendants(curNode, dir_descendants) {
    dir_descendants[curNode.sc_id] = [];

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_descendants[curNode.sc_id].push(curNode.children[i].sc_id);
            _getDirectDescendants(curNode.children[i], dir_descendants);
        }
    }

    return dir_descendants;
}

/* function to get the DIRECT ancestor id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_ancestors -- originally empty array of direct descendants for each node
*/
function _getDirectAncestors(curNode, dir_ancestors) {

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_ancestors[curNode.children[i].sc_id] = curNode.sc_id;
            _getDirectAncestors(curNode.children[i], dir_ancestors);
        }
    }

    return dir_ancestors;
}

/* function to get the ancestor ids for all nodes
* @param {Object} curVizObj
*/
function _getAncestorIds(descendants_arr, treeNodes) {
    var ancestors = {},
        curDescendants;

    // set up each node as originally containing an empty list of ancestors
    treeNodes.forEach(function(node, idx) {
        ancestors[node.sc_id] = [];
    });

    // get ancestors data from the descendants data
    treeNodes.forEach(function(node, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[node.sc_id];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(node.sc_id);
        }
    });

    return ancestors;
}

/* function to get the length of the path to each node (and the maximum path distance, and min link dist for each node)
* @param {Object} curVizObj 
* @param {String} cur_sc_id -- current single cell id
* @param {Number} dist_thus_far -- cumulative distance to the current node
*/
function _getDistToNodes(curVizObj, cur_sc_id, dist_thus_far) {

    // set up minimum target link distance object (of all targets for a given node, what is the minimum edge distance)
    if (!curVizObj.data.minTargetLink) {
        curVizObj.data.minTargetLink = {};
    }

    // set up path distance object
    if (!curVizObj.data.pathDists) {
        curVizObj.data.pathDists = {};
    }

    // set up maximum (and runner up) path distance variable
    if (!curVizObj.data.max_tree_path_dist) {
        curVizObj.data.max_tree_path_dist = 0;
    }

    // set the distance for the current node
    curVizObj.data.pathDists[cur_sc_id] = dist_thus_far;

    // set the minimum target link distance for the current node
    curVizObj.data.minTargetLink[cur_sc_id] = Infinity;

    // for each descendant
    curVizObj.data.direct_descendants[cur_sc_id].forEach(function(desc) {
        // get link distance for the link connecting this descendant to its ancestor
        var cur_link = _.findWhere(curVizObj.userConfig.sc_tree_edges, {source_sc_id: cur_sc_id, target_sc_id: desc});
        var cur_dist = cur_link.dist;

        // update minimum target link distance for this node
        if (cur_dist < curVizObj.data.minTargetLink[cur_sc_id]) {
            curVizObj.data.minTargetLink[cur_sc_id] = cur_dist;
        }

        // update maximum path distance
        var cumulative_dist = dist_thus_far+cur_dist;
        if (cumulative_dist > curVizObj.data.max_tree_path_dist) {
            curVizObj.data.max_tree_path_dist = cumulative_dist;
        }

        // get the path lengths for its descendants
        _getDistToNodes(curVizObj, desc, cumulative_dist);
    });
}

/* companion to _getDistToNodes() function -- resets objects before the start of _getDistToNode()
*/
function _resetDistanceObjects(curVizObj) {
    // set up minimum target link distance object (of all targets for a given node, what is the minimum edge distance)
    curVizObj.data.minTargetLink = {};

    // set up path distance object
    curVizObj.data.pathDists = {};

    // set up maximum (and runner up) path distance variable
    curVizObj.data.max_tree_path_dist = 0;
}

/* scaled elbow function (takes into account the minimum link distance for the single cell)
*/
function _scaledElbow(curVizObj, d, source_name, source, target) {

    // minimum link distance for this single cell
    var min_link_dist = (curVizObj.data.minTargetLink[source_name]/curVizObj.data.max_tree_path_dist)*curVizObj.generalConfig.treeWidth; // TODO add padding

    return "M" + source.x + "," + source.y + "H" + (source.x + (min_link_dist)/2) + "V" + target.y + "H" + target.x;
}

/* function to remove any edges involving single cells that were removed due to no presence heatmap data, 
* nor descendants with heatmap data -- store the filtered set of edges in new array
*/
function _getEdgesToPlot(curVizObj) {
    // edges to plot (remove any involving single cells that were removed due to no presence heatmap data, 
    // nor descendants with heatmap data)
    var edges_to_plot = [];
    curVizObj.userConfig.sc_tree_edges.forEach(function(edge) {
        if (curVizObj.data.missing_scs_to_remove.indexOf(edge.source_sc_id) == -1 && 
            curVizObj.data.missing_scs_to_remove.indexOf(edge.target_sc_id) == -1) {
                edges_to_plot.push(edge);
        }
    })

    return edges_to_plot;
}

/* function to remove any nodes involving single cells that were removed due to no presence heatmap data, 
* nor descendants with heatmap data -- store the filtered set of nodes in new array
*/
function _getNodesToPlot(curVizObj) {

    // nodes to plot (remove any involving single cells that were removed due to no presence heatmap data, 
    // nor descendants with heatmap data)
    var nodes_to_plot = [];
    curVizObj.userConfig.sc_tree_nodes.forEach(function(node) {
        if (curVizObj.data.missing_scs_to_remove.indexOf(node.sc_id) == -1) {
            nodes_to_plot.push(node);
        }
    })

    return nodes_to_plot;
}

/* function to plot the force-directed graph
* @param {Object} curVizObj
*/
function _plotForceDirectedGraph(curVizObj) {
    var config = curVizObj.generalConfig,
        userConfig = curVizObj.userConfig;

    // force layout function
    var force_layout = d3.layout.force() // TODO update below
        .size([config.treeWidth, config.treeHeight])
        .charge(function(d){
            var charge = -10;
            if (curVizObj.data.treeDescendantsArr[d.sc_id].length > 0) charge = 10 * charge;
            return charge;
        })
        .gravity(0.28)
        .nodes(_getNodesToPlot(curVizObj))
        .links(_getEdgesToPlot(curVizObj));        

    // plot links
    var linksG = curVizObj.view.treeSVG
        .append("g")
        .classed("graphLinks", true)
        .selectAll(".linksG")
        .data(_getEdgesToPlot(curVizObj))
        .enter().append("g")
        .classed("linksG", true);

    var link = linksG.append("line")
        .classed("link", true)
        .attr("class", function(d) {
            return "link graph " + d.link_id;
        }) 
        .attr("stroke",curVizObj.generalConfig.defaultLinkColour)
        .attr("stroke-width", "2px")
        .attr("fill-opacity", config.graphOpacity)
        .attr("stroke-opacity", config.graphOpacity)
        .attr("pointer-events", function() {
            return (config.graphOpacity == 1) ? "auto" : "none";
        })
        .on("mouseover", function(d) {
            _linkMouseover(curVizObj, d.link_id);
        })
        .on("mouseout", function(d) { 
            _linkMouseout(curVizObj, true); 
        })
        .on("click", function(d) {
            _linkClick(curVizObj, d.link_id);
        });

    linksG.append("svg:title")
        .text(function(d) {
            return (d.dist) ? "Distance: "+d.dist : null;
        });

    // plot nodes
    var nodeG = curVizObj.view.treeSVG.append("g")
        .classed("graphNodes", true)
        .selectAll(".graphNodesG")
        .data(_getNodesToPlot(curVizObj))
        .enter()
        .append("g")
        .attr("class", function(d) { 
            return "graphNodesG node_" + d.sc_id;
        });

    // node circles
    var nodeCircle = nodeG.append("circle")
        .attr("class", function(d) {
            // get genotype
            var gtype = _getGenotype(curVizObj.userConfig.sc_annot, d.sc_id);
            var tp = _getTP(curVizObj.userConfig.sc_annot, d.sc_id);
            return "graph node node_" + d.sc_id + " gtype_" + gtype + " tp_" + tp;
        })
        .attr("r", function() {
            // if user wants to display node ids 
            if (userConfig.display_node_ids) {
                return config.tree_w_labels_r;
            }
            // don't display labels
            return config.tree_r;
        })
        .attr("fill", function(d) {
            d.fill = _getNodeFill(curVizObj, d.sc_id);
            return d.fill;
        })
        .attr("stroke", function(d) {
            return _getNodeStroke(curVizObj, d.sc_id);
        })
        .attr("fill-opacity", config.graphOpacity)
        .attr("stroke-opacity", config.graphOpacity)
        .attr("pointer-events", function() {
            return (config.graphOpacity == 1) ? "auto" : "none";
        })
        .on('mouseover', function(d) {
            if (_checkForSelections(curVizObj.view_id)) {
                _mouseoverNode(d.sc_id, curVizObj.view_id, curVizObj.nodeTip, config.switchView, curVizObj.userConfig.sc_annot);
            }
        })
        .on('mouseout', function(d) {
            if (_checkForSelections(curVizObj.view_id)) {
                _mouseoutNode(d.sc_id, curVizObj.view_id, curVizObj.nodeTip);
            }
        });

    // node single cell labels (if user wants to display them)
    if (userConfig.display_node_ids) {
        var nodeLabel = _plotNodeLabels(curVizObj, "graph");
    }

    // use timeout function to allow rest of the page to load first
    setTimeout(function() {
        // run the layout a fixed number of times
        force_layout.start();
        var n = 100;
        for (var i = n*n; i > 0; --i) force_layout.tick();
        force_layout.stop();

        // radius of nodes
        var r = (userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;

        nodeCircle.attr("cx", function(d) { 
                d.x = Math.max(r, Math.min(config.treeWidth - r, d.x));
                return d.x;
            })
            .attr("cy", function(d) { 
                d.y = Math.max(r, Math.min(config.treeHeight - r, d.y));
                return d.y;
            });

        if (userConfig.display_node_ids) {
            nodeLabel.attr("x", function(d) { 
                    return d.x = Math.max(r, Math.min(config.treeWidth - r, d.x)); 
                })
                .attr("y", function(d) { 
                    return d.y = Math.max(r, Math.min(config.treeHeight - r, d.y)); 
                });
        }

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    });
}

function _rePlotForceLayout(curVizObj) {
    var config = curVizObj.generalConfig,
        userConfig = curVizObj.userConfig,
        force_layout;

    // SCALE
    if (curVizObj.generalConfig.distOn) {
        // layout function
        force_layout = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .linkDistance(function(d) {
                // divide by 2 so that two max paths can fit on the smallest dimension
                return (d.dist/curVizObj.data.max_tree_path_dist)*(config.smallest_tree_dim/2); 
            })
            .nodes(userConfig.sc_tree_nodes)
            .links(userConfig.sc_tree_edges);     
    }
    // UNSCALE
    else {
        // layout function
        force_layout = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .charge(function(d){
                var charge = -10;
                if (curVizObj.data.treeDescendantsArr[d.sc_id] && curVizObj.data.treeDescendantsArr[d.sc_id].length > 0) charge = 10 * charge;
                return charge;
            })
            .gravity(0.28)
            .nodes(userConfig.sc_tree_nodes)
            .links(userConfig.sc_tree_edges);        
    }

    // use timeout function to allow rest of the page to load first
    setTimeout(function() {
        
        // run the layout a fixed number of times
        force_layout.start();
        var n = 100;
        for (var i = n*n; i > 0; --i) force_layout.tick();
        force_layout.stop();

        // node circles
        var nodeCircle = curVizObj.view.treeSVG.selectAll(".graph.node");

        // radius of nodes
        var r = (userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;

        nodeCircle.attr("cx", function(d) { 
                return d.x = Math.max(r, Math.min(config.treeWidth - r, d.x)); 
            })
            .attr("cy", function(d) { 
                return d.y = Math.max(r, Math.min(config.treeHeight - r, d.y)); 
            });

        if (userConfig.display_node_ids) {
            curVizObj.view.treeSVG.selectAll(".graph.nodeLabel")
                .attr("x", function(d) { 
                    return d.x = Math.max(r, Math.min(config.treeWidth - r, d.x)); 
                })
                .attr("y", function(d) { 
                    return d.y = Math.max(r, Math.min(config.treeHeight - r, d.y)); 
                });
        }

        curVizObj.view.treeSVG.selectAll(".link.graph")
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
    });

}

/* function to plot node labels
* @param {String} tree_type -- "tree" or "graph"
*/
function _plotNodeLabels(curVizObj, tree_type) {
    var config = curVizObj.generalConfig;

    var nodesG = (tree_type == "tree") ? 
        curVizObj.view.treeSVG.selectAll(".treeNodesG") : curVizObj.view.treeSVG.selectAll(".graphNodesG");

    var nodeLabel = nodesG
        .append("text")
        .attr("class", function(d) {
            return "nodeLabel " + tree_type + " nodeLabel_" + d.sc_id;
        })
        .text(function(d) { 
            var isNumber = !isNaN(d.sc_id);
            return (isNumber) ? parseInt(d.sc_id, 10) : d.sc_id; 
        })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("font-size", 
            _getLabelFontSize(_.pluck(curVizObj.userConfig.sc_tree_nodes, "sc_id"), 
                curVizObj.generalConfig.tree_w_labels_r * 2))
        .attr("text-anchor", "middle")
        .attr("pointer-events", "none")
        .attr("fill-opacity", function() {
            return (tree_type == "tree") ? config.treeOpacity : config.graphOpacity;
        })
        .attr("dy", "+0.35em");
    return nodeLabel;
}

/* function to get diagonal for aligned phylogeny
* @param {Object} curVizObj
* @param {Object} d -- current data object
* @param {Number} half_rowHeight -- half the height of one row in the heatmap
*/
function _getElbow(curVizObj, d, half_rowHeight) {

    var source = {};
    var target = {};
    // we're scaling by edge distance -- get elbow
    if (curVizObj.generalConfig.distOn) {
        source.y = curVizObj.data.yCoordinates[d.source_sc_id] + half_rowHeight;
        target.y = curVizObj.data.yCoordinates[d.target_sc_id] + half_rowHeight;
        source.x = curVizObj.data.xCoordinatesDist[d.source_sc_id];
        target.x = curVizObj.data.xCoordinatesDist[d.target_sc_id];

        return _scaledElbow(curVizObj, d, d.source_sc_id, source, target);
    }
    // not scaling by edge distances -- get bezier diagonal
    else {

        var diagonal = d3.svg.diagonal()
            .projection(function(d) { return [d.y, d.x]; });

        source.x = curVizObj.data.yCoordinates[d.source_sc_id] + half_rowHeight;
        target.x = curVizObj.data.yCoordinates[d.target_sc_id] + half_rowHeight;
        source.y = curVizObj.data.xCoordinates[d.source_sc_id];
        target.y = curVizObj.data.xCoordinates[d.target_sc_id];
        
        return diagonal({source: source, target: target});
    }
}

/* function to plot phylogenetic tree aligned with heatmap
* @param {Object} curVizObj
*/
function _plotAlignedPhylogeny(curVizObj) {
    var config = curVizObj.generalConfig;
    var r = (curVizObj.userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;
    var half_rowHeight = (curVizObj.view.hm.rowHeight/2); // half the height of one heatmap row

    // create links
    curVizObj.view.treeSVG.append("g")
        .classed("treeLinks", true)
        .selectAll(".tree.link")                  
        .data(_getEdgesToPlot(curVizObj))                   
        .enter().append("path")  
        .attr("class", function(d) {
            d.link_id = "link_source_" + d.source_sc_id + "_target_" + d.target_sc_id;
            return "link tree " + d.link_id;
        })                
        .attr("d", function(d) {
            return _getElbow(curVizObj, d, half_rowHeight);
        })
        .attr("stroke",curVizObj.generalConfig.defaultLinkColour)
        .attr("stroke-width", "2px")
        .attr("fill", "none")
        .attr("fill-opacity", config.treeOpacity)
        .attr("stroke-opacity", config.treeOpacity)
        .attr("pointer-events", function() {
            return (config.treeOpacity == 1) ? "auto" : "none";
        })
        .on("mouseover", function(d) {
            _linkMouseover(curVizObj, d.link_id);
        })
        .on("mouseout", function(d) { 
            _linkMouseout(curVizObj, true); 
        })
        .on("click", function(d) {
            _linkClick(curVizObj, d.link_id);
        })
        .append("title")
        .text(function(d) {
            if (d.dist) {
                return d.dist;                
            }
        });

    // create nodes
    var nodeG = curVizObj.view.treeSVG
        .selectAll(".treeNodesG")
        .data(_getNodesToPlot(curVizObj))
        .enter()
        .append("g")
        .attr("class", function(d) { 
            return "treeNodesG node_" + d.sc_id;
        });

    nodeG.append("circle")   
        .attr("class", function(d) {
            // get genotype & timepoint
            var gtype = _getGenotype(curVizObj.userConfig.sc_annot, d.sc_id);
            var tp = _getTP(curVizObj.userConfig.sc_annot, d.sc_id);
            return "tree node node_" + d.sc_id + " gtype_" + gtype + " tp_" + tp;
        })  
        .attr("cx", function(d) { 
            d.x = curVizObj.data.xCoordinates[d.sc_id];
            return d.x;
        })
        .attr("cy", function(d) { 
            d.y = curVizObj.data.yCoordinates[d.sc_id] + half_rowHeight;
            return d.y;
        })   
        .attr("stroke", function(d) {
            return _getNodeStroke(curVizObj, d.sc_id);
        })           
        .attr("fill", function(d) {
            return d.fill = _getNodeFill(curVizObj, d.sc_id);
        })
        .attr("r", r)
        .attr("fill-opacity", config.treeOpacity)
        .attr("stroke-opacity", config.treeOpacity)
        .attr("pointer-events", function() {
            return (config.treeOpacity == 1) ? "auto" : "none";
        })
        .on('mouseover', function(d) {
            if (_checkForSelections(curVizObj.view_id)) {
                _mouseoverNode(d.sc_id, curVizObj.view_id, curVizObj.nodeTip, config.switchView, curVizObj.userConfig.sc_annot);
            }
        })
        .on('mouseout', function(d) {
            if (_checkForSelections(curVizObj.view_id)) {
                _mouseoutNode(d.sc_id, curVizObj.view_id, curVizObj.nodeTip);
            }
        })
        .on('click', function(d) {
            // if we're in re-root mode
            if (d3.select("#" + curVizObj.view_id).selectAll(".rerootButtonSelected")[0].length != 0) {

                // re-root the single cell tree
                _reRootSCTree(curVizObj.userConfig.sc_tree_edges, d.sc_id, curVizObj.data.direct_descendants, curVizObj.data.direct_ancestors, curVizObj.view_id);
                curVizObj.userConfig.root = d.sc_id;
                curVizObj.userConfig.link_ids = curVizObj.userConfig.sc_tree_edges.map(function(a) {return a.link_id;});

                // get all the tree info (descendants, ancestors, etc)
                _getTreeInfo(curVizObj, curVizObj.userConfig.sc_tree_edges, curVizObj.userConfig.sc_tree_nodes, curVizObj.userConfig.root);

                // order single cells by tree
                curVizObj.data.hm_sc_ids = _getNodeOrder(curVizObj.data.treeDescendantsArr, 
                                                         curVizObj.userConfig.link_ids, 
                                                         curVizObj.userConfig.root, 
                                                         [],
                                                         curVizObj.data.missing_scs_to_plot);

                // get new coordinates
                _getYCoordinates(curVizObj);
                _getXCoordinates(curVizObj);

                // translate nodes in tree
                curVizObj.data.hm_sc_ids.concat(curVizObj.data.missing_scs_to_plot).forEach(function(sc) {
                    d3.select("#" + curVizObj.view_id).select(".tree.node.node_" + sc)
                        .transition()
                        .duration(1000)
                        .attr("cx", function(d) { 
                            d.x = curVizObj.data.xCoordinates[d.sc_id];
                            return d.x;
                        })
                        .attr("cy", function(d) {
                            d.y = curVizObj.data.yCoordinates[d.sc_id] + half_rowHeight;
                            return d.y;
                        })
                        .attr("transform", "translate(0,0)");
                });

                // translate the single cell profiles in the heatmap
                _moveSCHeatmapProfiles(curVizObj.view_id, curVizObj.data.yCoordinates);

                // translate edges
                d3.select("#" + curVizObj.view_id).selectAll(".tree.link") 
                    .transition()
                    .duration(1000)       
                    .attr("d", function(d) {
                        return _getElbow(curVizObj, d, half_rowHeight);
                    })
                    .attr("transform", "translate(0,0)");
            }

            // if we're in flip-branch mode
            else if (d3.select("#" + curVizObj.view_id).selectAll(".flipBranchButtonSelected")[0].length != 0) { 

                // *** reverse y-coordinates for the descendants of this node ***

                // get current y-coordinates for all descendants of this node
                var cur_descs = curVizObj.data.treeDescendantsArr[d.sc_id].concat(d.sc_id);
                var cur_descs_y_coords = [];
                cur_descs.forEach(function(cur_desc) {
                    cur_descs_y_coords.push(curVizObj.data.yCoordinates[cur_desc]);
                })

                // get the mid y-coordinate for these descendants
                var mid_y = (Math.max(...cur_descs_y_coords)+Math.min(...cur_descs_y_coords))/2;

                // for each descendant, flip its coordinate over the mid y-coordinate of the descendants
                cur_descs.forEach(function(cur_desc) {

                    // get the new y coordinate and the difference between old and new y-coordinates
                    var cur_y_coord = curVizObj.data.yCoordinates[cur_desc];
                    var diff_y = -2*(cur_y_coord - mid_y);
                    var new_y_coord = cur_y_coord + diff_y;
                    curVizObj.data.yCoordinates[cur_desc] = new_y_coord;

                    // current y-coordinate translation of the sc
                    var t_y = _getTreeNodeYTranslation(curVizObj.view_id, cur_desc); 

                    // translate the single cell profile in the heatmap
                    _translateSCHeatmapProfile(curVizObj.view_id, cur_desc, diff_y + t_y);

                    // translate the single cell node
                    d3.select("#" + curVizObj.view_id).select(".tree.node.node_" + cur_desc)
                        .transition()
                        .duration(1000)
                        .attr("transform", function() {
                            return "translate(0," + (diff_y + t_y) + ")";
                        });
                });

                // plot each latent cell
                curVizObj.data.missing_scs_to_plot.forEach(function(sc_id) {
                    var old_y = _getTreeNodeYCoord(curVizObj.view_id, sc_id) - half_rowHeight;
                    var old_translation = _getTreeNodeYTranslation(curVizObj.view_id, sc_id);
                    var new_y = curVizObj.data.yCoordinates[sc_id];
                    _translateSCNode(curVizObj.view_id, sc_id, (new_y-old_y+old_translation));
                });

                // translate aligned tree link for the edge just below the deletion
                d3.select("#" + curVizObj.view_id).selectAll(".tree.link") 
                    .transition()
                    .duration(1000)       
                    .attr("d", function(d) {
                        return _getElbow(curVizObj, d, half_rowHeight);
                    });

            }
        });

    // node single cell labels (if user wants to display them)
    if (curVizObj.userConfig.display_node_ids) {
        _plotNodeLabels(curVizObj, "tree");
    }
}

function _getTreeInfo(curVizObj, sc_tree_edges, sc_tree_nodes, root) {
    // get tree structures for each node
    curVizObj.data.treeStructures = _getTreeStructures(sc_tree_edges);
    
    // the root tree structure
    curVizObj.data.treeStructure = _.findWhere(curVizObj.data.treeStructures, {sc_id: root});

    // get descendants for each node
    curVizObj.data.treeDescendantsArr = {};
    sc_tree_nodes.forEach(function(node, idx) {
        var curRoot = _.findWhere(curVizObj.data.treeStructures, {sc_id: node.sc_id});
        var curDescendants = _getDescendantIds(curRoot, []);
        curVizObj.data.treeDescendantsArr[node.sc_id] = curDescendants;
    })

    // get direct descendants for each node
    curVizObj.data.direct_descendants = _getDirectDescendants(curVizObj.data.treeStructure, {});

    // get ancestors for each node
    curVizObj.data.treeAncestorsArr = _getAncestorIds(curVizObj.data.treeDescendantsArr, sc_tree_nodes);

    // get direct ancestors for each ndoe
    curVizObj.data.direct_ancestors = _getDirectAncestors(curVizObj.data.treeStructure, {});

    // get linear chains in genotype tree 
    if (curVizObj.userConfig.gtype_tree_edges) {
        curVizObj.data.gtypeTreeChainRoots = []; // keep track of linear chain segment roots
        curVizObj.data.gtypeTreeChains = _gt_getLinearTreeSegments(curVizObj, curVizObj.data.gtypeTreeStructure, {}, "");
    }

    // get the height of the tree (# nodes)
    curVizObj.data.tree_height = 0;
    Object.keys(curVizObj.data.treeAncestorsArr).forEach(function(key) {
        var ancestor_arr = curVizObj.data.treeAncestorsArr[key];
        if ((ancestor_arr.length + 1) > curVizObj.data.tree_height) {
            curVizObj.data.tree_height = (ancestor_arr.length + 1);
        }
    })

    // get the cumulative distances to each node & the maximum cumulative path distance
    if (curVizObj.userConfig.distances_provided) {
        _resetDistanceObjects(curVizObj);
        _getDistToNodes(curVizObj, root, 0); 
    }
}

/* function to re-root the single cell tree
* @param tree -- array of tree edges
* @param newRoot -- the new root single cell id
* @param dir_descs -- object of direct descendants for each node
* @param dir_ancs -- object of direct ancestor for each node
* @param view_id -- id of the view
*/
function _reRootSCTree(tree, newRoot, dir_descs, dir_anc, view_id) {
    // previous ancestor of this new root
    var prevAnc = dir_anc[newRoot];

    var edgeToFlipOriginal = _.findWhere(tree, {target_sc_id: newRoot});
    var edgeI = tree.indexOf(edgeToFlipOriginal); // index of this edge in the array of edges
    if (prevAnc && (edgeI != -1)) {
        var edgeToFlip = $.extend({}, edgeToFlipOriginal);

        // flip the edge in the data
        edgeToFlip.old_source_sc_id = edgeToFlip.source_sc_id;
        edgeToFlip.old_source = edgeToFlip.source;
        edgeToFlip.source_sc_id = edgeToFlip.target_sc_id;
        edgeToFlip.source = edgeToFlip.target;
        edgeToFlip.target_sc_id = edgeToFlip.old_source_sc_id;
        edgeToFlip.target = edgeToFlip.old_source;
        edgeToFlip.link_id = "link_source_" + edgeToFlip.source_sc_id + "_target_" + edgeToFlip.target_sc_id;
        delete edgeToFlip.old_source;
        delete edgeToFlip.old_source_sc_id;

        // flip the next edge
        _reRootSCTree(tree, edgeToFlip.target_sc_id, dir_descs, dir_anc, view_id);

        // save this flipped edge in the original array
        tree[edgeI] = edgeToFlip;

        // flip the edge in the DOM
        d3.select("#" + view_id).select(".link.tree.link_source_" + edgeToFlipOriginal.source_sc_id + "_target_" + edgeToFlipOriginal.target_sc_id)
            .attr("class", function(d) { // select random attribute so we can change 
                d.source_sc_id = edgeToFlip.source_sc_id;
                d.source = edgeToFlip.source;
                d.target_sc_id = edgeToFlip.target_sc_id;
                d.target = edgeToFlip.target;
                d.link_id = "link_source_" + d.target_sc_id + "_target_" + d.source_sc_id;
                return ("tree link " + d.link_id);
            })

    }
}

/* function to get the tree node's y-coordinate translation
*/
function _getTreeNodeYTranslation(view_id, sc_id) {
    return d3.transform(d3.select("#" + view_id).select(".tree.node.node_" + sc_id).attr("transform")).translate[1];
}
/* function to get the tree node's x-coordinate translation
*/
function _getTreeNodeXTranslation(view_id, sc_id) {
    return d3.transform(d3.select("#" + view_id).select(".tree.node.node_" + sc_id).attr("transform")).translate[0];
}

/* function to get the tree node's absolute y-coordinate (including translation)
*/
function _getTreeNodeYCoord(view_id, sc_id) {
    return parseFloat(d3.select("#" + view_id).select(".tree.node.node_" + sc_id).attr("cy")) + _getTreeNodeYTranslation(view_id, sc_id);
}

/* function to switch between tree and graph views
*/
function _switchView(curVizObj) {
    var config = curVizObj.generalConfig;

    // flip opacities of tree & graph
    config.treeOpacity = + !config.treeOpacity;
    config.graphOpacity = + !config.graphOpacity;

    d3.select("#" + curVizObj.view_id).selectAll(".tree.node")
        .attr("fill-opacity", config.treeOpacity)
        .attr("stroke-opacity", config.treeOpacity)
        .attr("pointer-events", function() {
            return (config.treeOpacity == 1) ? "auto" : "none";
        });
    d3.select("#" + curVizObj.view_id).selectAll(".tree.link")
        .attr("fill-opacity", config.treeOpacity)
        .attr("stroke-opacity", config.treeOpacity)
        .attr("pointer-events", function() {
            return (config.treeOpacity == 1) ? "auto" : "none";
        });
    d3.select("#" + curVizObj.view_id).selectAll(".tree.nodeLabel")
        .attr("fill-opacity", config.treeOpacity);
    d3.select("#" + curVizObj.view_id).selectAll(".graph.node")
        .attr("fill-opacity", config.graphOpacity)
        .attr("stroke-opacity", config.graphOpacity)
        .attr("pointer-events", function() {
            return (config.graphOpacity == 1) ? "auto" : "none";
        });
    d3.select("#" + curVizObj.view_id).selectAll(".graph.link")
        .attr("fill-opacity", config.graphOpacity)
        .attr("stroke-opacity", config.graphOpacity)
        .attr("pointer-events", function() {
            return (config.graphOpacity == 1) ? "auto" : "none";
        });
    d3.select("#" + curVizObj.view_id).selectAll(".graph.nodeLabel")
        .attr("fill-opacity", config.graphOpacity);

    d3.select("#" + curVizObj.view_id).select(".forceDirectedIcon").attr("opacity", config.treeOpacity);
    d3.select("#" + curVizObj.view_id).select(".phylogenyIcon").attr("opacity", config.graphOpacity);

    config.switchView = !config.switchView;
}

/* function to plot tree/graph scaled by edge distances
* @param {Object} curVizObj
*/
function _scaleTree(curVizObj) {
    var half_rowHeight = (curVizObj.view.hm.rowHeight/2); // half the height of one heatmap row
    curVizObj.generalConfig.distOn = !curVizObj.generalConfig.distOn;

    // SCALE nodes & labels
    if (curVizObj.generalConfig.distOn) {
        // mark this button as rulerButtonSelected
        d3.select("#" + curVizObj.view_id).select(".rulerButton").classed("rulerButtonSelected", true); 

        // move nodes to their scaled locadtion
        curVizObj.view.treeSVG.selectAll(".treeNodesG")
            .attr("transform", function(d) {
                var dx = curVizObj.data.xCoordinatesDist[d.sc_id] - curVizObj.data.xCoordinates[d.sc_id];
                return "translate(" + dx + ",0)";
            });

        // scale or unscale links
        curVizObj.view.treeSVG.selectAll(".tree.link")                     
            .attr("d", function(d) {
                return _getElbow(curVizObj, d, half_rowHeight);
            });
    }

    // UNSCALE nodes & labels
    else {
        // remove "rulerButtonSelected" class from button
        d3.select("#" + curVizObj.view_id).select(".rulerButton").classed("rulerButtonSelected", false); 

        // reset colour of the brush scissors button
        d3.select("#" + curVizObj.view_id).select(".rulerButton").attr("fill", curVizObj.generalConfig.topBarColour);

        // move nodes to their unscaled position
        curVizObj.view.treeSVG.selectAll(".treeNodesG")
            .attr("transform", "translate(0,0)");

        // scale or unscale links
        curVizObj.view.treeSVG.selectAll(".tree.link")                     
            .attr("d", function(d) {
                return _getElbow(curVizObj, d, half_rowHeight);
            });
    }

    
    // scale or unscale graph
    _rePlotForceLayout(curVizObj);
}

// GROUP ANNOTATION FUNCTIONS

/* function to get a genotype annotation for a given single cell id
* @param {Array} sc_annot -- single cell annotations provided by user
* @param {String} sc_id -- single cell id
*/
function _getGenotype(sc_annot, sc_id) {
    // there are single cell annotations provided by user
    if (sc_annot) {
        var sc_w_gtype = _.findWhere(sc_annot, {"single_cell_id": sc_id});
        // if there's an annotation for this single cell, return it, otherwise return "none"
        return (sc_w_gtype) ? sc_w_gtype.genotype : "none";
    }
    else {
        return "none";
    }
}

/* function to get a timepoint annotation for a given single cell id
* @param {Array} sc_annot -- single cell annotations provided by user
* @param {String} sc_id -- single cell id
*/
function _getTP(sc_annot, sc_id) {
    // there are single cell annotations provided by user
    if (sc_annot) {
        var sc_w_gtype = _.findWhere(sc_annot, {"single_cell_id": sc_id});
        // if there's an annotation for this single cell, return it, otherwise return "none"
        return (sc_w_gtype && sc_w_gtype.timepoint) ? sc_w_gtype.timepoint : "none";
    }
    else {
        return "none";
    }
}

/* function to get genotype annotations as object w/properties genotype : [array of single cells]
* @param {Object} curVizObj
*/
function _reformatGroupAnnots(curVizObj) {
    var gtypes = {};

    curVizObj.userConfig.sc_annot.forEach(function(sc) {
        if (!gtypes[sc.genotype]) {
            gtypes[sc.genotype] = [];
        }
        gtypes[sc.genotype].push(sc.single_cell_id);
    });

    curVizObj.data.gtypes = gtypes;
}

/* function to translate the single cell heatmap profile to a new location
* @param view_id -- current view id
* @param sc_id -- current single cell id
* @param diff_y -- the y-coordinate difference for this cell
*/
function _translateSCHeatmapProfile(view_id, sc_id, diff_y) {
    // translate copy number profile & indicator
    d3.select("#" + view_id).select(".gridCellG.sc_" + sc_id)
        .transition()
        .duration(1000)
        .attr("transform", function() {
            return "translate(0," + diff_y + ")";
        });
    
    // translate genotype annotation
    if (curVizObj.view.gtypesSpecified) {
        d3.select("#" + view_id).select(".gtypeAnnot.sc_" + sc_id)
            .transition()
            .duration(1000)
            .attr("transform", function() {
                return "translate(0," + diff_y + ")";
            });
    }
    
    // translate timepoint annotation
    if (curVizObj.view.tpsSpecified) {
        d3.select("#" + view_id).select(".tpAnnot.sc_" + sc_id)
            .transition()
            .duration(1000)
            .attr("transform", function() {
                return "translate(0," + diff_y + ")";
            });
    }

    // translate indicator
    d3.select("#" + view_id).select(".indic.sc_" + sc_id)
        .transition()
        .duration(1000)
        .attr("transform", function() {
            return "translate(0," + diff_y + ")";
        });
}

/* function to MOVE (not by translating, but by altering the y-coordinates) all the single cell heatmap profiles to their new locations
* @param view_id -- current view id
* @param new_ycoords -- new y coordinates for each single cell
*/
function _moveSCHeatmapProfiles(view_id, new_ycoords) {

    // untranslate gridCell groups
    d3.select("#" + view_id).selectAll(".gridCellG")
        .attr("transform", "translate(0,0)");

    // move copy number profile & indicator
    d3.select("#" + view_id).selectAll(".gridCell")
        .transition()
        .duration(1000)
        .attr("y", function(d) { 
            d.y = new_ycoords[d.sc_id];
            return d.y; 
        });
    
    // move genotype annotation
    if (curVizObj.view.gtypesSpecified) {
        d3.select("#" + view_id).selectAll(".gtypeAnnot")
            .transition()
            .duration(1000)
            .attr("transform", "translate(0,0)")
            .attr("y", function(d) { 
                d.y = new_ycoords[d.single_cell_id];
                return d.y; 
            });
    }
    
    // move timepoint annotation
    if (curVizObj.view.tpsSpecified) {
        d3.select("#" + view_id).selectAll(".tpAnnot")
            .transition()
            .duration(1000)
            .attr("transform", "translate(0,0)")
            .attr("y", function(d) { 
                d.y = new_ycoords[d.single_cell_id];
                return d.y; 
            });
    }

    // move indicator
    d3.select("#" + view_id).selectAll(".indic")
        .transition()
        .duration(1000)
        .attr("transform", "translate(0,0)")
        .attr("y", function(d) { 
            return new_ycoords[d];
        });
}

/* function to translate single cell node
* @param view_id -- current view id
* @param sc_id -- current single cell id
* @param diff_y -- the FULL y-coordinate translation for this cell
*/
function _translateSCNode(view_id, sc_id, diff_y) {

    // translate aligned tree nodes
    d3.select("#" + view_id).select(".tree.node.node_" + sc_id)
        .transition()
        .duration(1000)
        .attr("transform", function() {
            return  "translate(0," + diff_y + ")";
        });

    // translate aligned tree node labels
    d3.select("#" + view_id).select(".tree.nodeLabel.nodeLabel_" + sc_id)
        .transition()
        .duration(1000)
        .attr("transform", function() {
            return  "translate(0," + diff_y + ")";
        });
}

// CNV FUNCTIONS

/* function to update copy number matrix upon trimming
* @param removal_height -- height of single cell phylogeny that was removed
* @param removed_cell_max_y -- the maximum y-value of the removed cell
* @param removed_scs -- the cells that were just removed
*/
function _updateTrimmedMatrix(curVizObj, removal_height, removed_cell_max_y, removed_scs) {
    var config = curVizObj.generalConfig,
        half_rowHeight = (curVizObj.view.hm.rowHeight/2);

    // for each single cell that's still in the matrix
    curVizObj.data.hm_sc_ids.forEach(function(sc_id) {

        var t_y = _getTreeNodeYTranslation(curVizObj.view_id, sc_id);
        var cur_y = parseFloat(d3.select(".tree.node.node_" + sc_id).attr("cy")) + t_y;
        
        // if this cell is below the last cut cell, translate the single cell profile in the heatmap and the node in the tree
        if (cur_y > removed_cell_max_y) {
            curVizObj.data.yCoordinates[sc_id] = cur_y - removal_height - half_rowHeight;
            if (curVizObj.data.hm_sc_ids.indexOf(sc_id) != -1) {
                _translateSCHeatmapProfile(curVizObj.view_id, sc_id, -removal_height + t_y); // if this sc is in the heatmap
            }
            _translateSCNode(curVizObj.view_id, sc_id, -removal_height + t_y);
        }
        else {
            curVizObj.data.yCoordinates[sc_id] = cur_y - half_rowHeight;
        }
    });

    // for each latent cell, get its new y-coordinate and plot it
    _getYCoordinatesLatentNodes(curVizObj, $.extend([], curVizObj.data.hm_sc_ids), curVizObj.data.yCoordinates);
    curVizObj.data.missing_scs_to_plot.forEach(function(sc_id) {
        var old_y = _getTreeNodeYCoord(curVizObj.view_id, sc_id) - half_rowHeight;
        var old_translation = _getTreeNodeYTranslation(curVizObj.view_id, sc_id);
        var new_y = curVizObj.data.yCoordinates[sc_id];
        _translateSCNode(curVizObj.view_id, sc_id, (new_y-old_y+old_translation));
    });

    // translate aligned tree link for the edge just below the deletion
    d3.select("#" + curVizObj.view_id).selectAll(".tree.link") 
        .transition()
        .duration(1000)       
        .attr("d", function(d) {
            return _getElbow(curVizObj, d, half_rowHeight);
        });

    // move chromosome legend up
    curVizObj.generalConfig.chromLegendStartYCoord -= removal_height;
    d3.select("#" + curVizObj.view_id).selectAll(".chromBox")
        .transition()
        .duration(1000)
        .attr("y", curVizObj.generalConfig.chromLegendStartYCoord);
    d3.select("#" + curVizObj.view_id).selectAll(".chromBoxText")
        .transition()
        .duration(1000)
        .attr("y", curVizObj.generalConfig.chromLegendStartYCoord + (config.chromLegendHeight / 2));
}

/* function to get chromosome min and max values
* @param {Object} curVizObj
*/
function _getChromBounds(curVizObj) {
    var chroms = curVizObj.userConfig.chroms;
    var chrom_bounds = {};

    // for each chromosome
    for (var i = 0; i < chroms.length; i++) {

        // get all the starts and ends of segments for this chromosome
        var cur_chrom_data = _.filter(curVizObj.userConfig.cnv_data, 
                                      function(cnv){ 
                                        return cnv.chr == chroms[i]; 
                                      });
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


/* function to calculate genotype colours based on phylogeny 
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getPhyloColours(curVizObj) {

    var colour_assignment = {}, // standard colour assignment
        alpha_colour_assignment = {}, // alpha colour assignment
        clone_cols = curVizObj.userConfig.clone_cols;

    // clone colours specified
    if (clone_cols != "NA") {
        // get colour assignment - use specified colours
        // handling different inputs -- TODO should probably be done in R
        clone_cols.forEach(function(col, col_idx) {
            var col_value = col.colour;
            if (col_value[0] != "#") { // append a hashtag if necessary
                col_value = "#".concat(col_value);
            }
            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
                col_value = col_value.substring(0,7);
            }
            colour_assignment[col.clone_id] = col_value;
        });
    }

    // clone colours not specified
    else {

        var s = 0.88, // saturation
            l = 0.77; // lightness

        // number of nodes
        var n_nodes = curVizObj.data.gtypeTreeChainRoots.length;

        // colour each tree chain root a sequential colour from the spectrum
        for (var i = 0; i < n_nodes; i++) {
            var cur_node = curVizObj.data.gtypeTreeChainRoots[i];
            var h = (i/n_nodes + 0.96) % 1;
            var rgb = _hslToRgb(h, s, l); // hsl to rgb
            var col = _rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

            colour_assignment[cur_node] = col;

            // for each of the chain's descendants
            var prev_colour = col;
            curVizObj.data.gtypeTreeChains[cur_node].forEach(function(desc, desc_i) {
                // if we're on the phantom root's branch and it's the first descendant
                if (cur_node == curVizObj.generalConfig.phantomRoot && desc_i === 0) {

                    // do not decrease the brightness
                    colour_assignment[desc] = prev_colour;
                }
                // we're not on the phantom root branch's first descendant
                else {
                    // colour the descendant a lighter version of the previous colour in the chain
                    colour_assignment[desc] = 
                        _decrease_brightness(prev_colour, 20);

                    // set the previous colour to the lightened colour
                    prev_colour = colour_assignment[desc]; 
                }
            })
        }
    }


    // get the alpha colour assignment
    Object.keys(colour_assignment).forEach(function(key, key_idx) {
        alpha_colour_assignment[key] = 
            _increase_brightness(colour_assignment[key], curVizObj.userConfig.alpha);
    });

    return {"colour_assignment": colour_assignment, "alpha_colour_assignment": alpha_colour_assignment};
}

/* function to calculate colours for genotypes (not based on phylogeny)
* @param {Array} gtypes -- gtypes in dataset, for which we need colours
* @param {Object} clone_cols -- colours for each clone (specified by user)
*/
function _getGtypeColours(gtypes, clone_cols) {

    var colour_assignment = {},
        alpha_colour_assignment = {};

    // clone colours specified
    if (clone_cols != "NA") {
        // get colour assignment - use specified colours
        // handling different inputs -- TODO should probably be done in R
        clone_cols.forEach(function(col, col_idx) {
            var col_value = col.colour;
            if (col_value[0] != "#") { // append a hashtag if necessary
                col_value = "#".concat(col_value);
            }
            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
                col_value = col_value.substring(0,7);
            }
            colour_assignment[col.clone_id] = col_value;
        });
    }

    // clone colours not specified
    else {

        var s = 0.95, // saturation
            l = 0.76; // lightness

        // number of nodes
        var n_nodes = gtypes.length;

        for (var i = 0; i < n_nodes; i++) {
            var h = i/n_nodes;
            var rgb = _hslToRgb(h, s, l); // hsl to rgb
            var col = _rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

            colour_assignment[gtypes[i]] = col;
        }
    }

    // get the alpha colour assignment
    Object.keys(colour_assignment).forEach(function(key, key_idx) {
        alpha_colour_assignment[key] = 
            _increase_brightness(colour_assignment[key], 30);
    });

    return {"colour_assignment": colour_assignment, "alpha_colour_assignment": alpha_colour_assignment}; 
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

    if(s === 0){
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
    if(arr.length === 0)
        return null;
    var modeMap = {};
    var maxEl = arr[0], maxIntensity = 1;
    for(var i = 0; i < arr.length; i++)
    {
        var el = arr[i];
        if(modeMap[el] === null)
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

// DOWNLOAD FUNCTIONS


/* function to download PNG
* @param className -- name of the class of the svg to download (e.g. "mySVG")
* @param fileOutputName -- filename for output
*/
function _downloadPNG(className, fileOutputName) {
    // get current margin of svg element
    var cur_margin = d3.select("." + className).style("margin");

    // temporarily remove the margin so the view isn't cut off
    d3.select("." + className)
        .style("margin", "0px");

    var html = d3.select("." + className)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);

    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    var image = new Image;
    image.src = imgsrc;
    image.onload = function() {
        context.drawImage(image, 0, 0);

        var canvasdata = canvas.toDataURL("image/png");

        var pngimg = '<img src="'+canvasdata+'">'; 

        var a = document.createElement("a");
        a.download = fileOutputName;
        a.href = canvasdata;
        a.click();
    };

    // reset the margin of the svg element
    d3.select("." + className)
        .style("margin", cur_margin);
}

/* function to sort array of objects by key 
* modified from: http://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
*/
function _sortByKey(array, firstKey, secondKey) {
    secondKey = secondKey || "NA";
    return array.sort(function(a, b) {
        var x = a[firstKey]; var y = b[firstKey];
        var res = ((x < y) ? -1 : ((x > y) ? 1 : 0));
        if (secondKey == "NA") {
            return res;            
        }
        else {
            if (typeof(a[secondKey] == "string")) {
                return (res === 0) ? (a[secondKey] > b[secondKey]) : res;
            }
            else if (typeof(a[secondKey] == "number")) {
                return (res === 0) ? (a[secondKey] - b[secondKey]) : res;
            }
            else {
                return res;
            }
        }
    });
}

/* function to get the intersection of two arrays
* @param {Array} array1 -- first array
* @param {Array} array2 -- second array
*/
function _getIntersection(array1, array2) {

    if (array1 === undefined || array2 === undefined) {
        return [];
    }

    return array1.filter(function(n) {
        return array2.indexOf(n) != -1
    });
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

    if(s === 0){
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

// function to increase brightness of hex colour
// from: http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function _increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
}

// function to decrease brightness of hex colour
// from: http://stackoverflow.com/questions/12660919/javascript-brightness-function-decrease
function _decrease_brightness(hex, percent){
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);

   return '#' +
       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
}
