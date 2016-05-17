// D3 EFFECTS FUNCTIONS

/* brush selection ending function
* @param {Object} curVizObj
*/
function _brushEnd(curVizObj, brush) {
    var selectedSCs = [];
    var extent = d3.event.target.extent();
    if (!brush.empty()) {

        // highlight selected grid cell rows
        d3.select("#" + curVizObj.view_id).selectAll(".groupAnnot").classed("active", function(d) {
            // if any transformation has occurred
            var t = d3.transform(d3.select(this).attr("transform")), 
                t_y = t.translate[1];
            var brushed = extent[0] <= (d.y+curVizObj.view.hm.rowHeight+t_y) && (d.y+t_y) <= extent[1];
            if (brushed) {
                selectedSCs.push(d.single_cell_id);
            }
            return brushed;
        });

        // highlight selected sc's indicators & nodes
        selectedSCs.forEach(function(sc_id) {
            _highlightIndicator(sc_id, curVizObj);   
            _highlightNode(sc_id, curVizObj);    
        });
    } else {
        _clearBrush(curVizObj);
    }

    // clear brush
    d3.select("#" + curVizObj.view_id).select(".brush").call(brush.clear());
}

/* function to check for selections
*/
function _checkForSelections(curVizObj) {
    return ((d3.select("#" + curVizObj.view_id).selectAll(".nodeSelected")[0].length == 0) && // node selection
            (d3.select("#" + curVizObj.view_id).selectAll(".linkSelected")[0].length == 0) && // link selection
            (d3.select("#" + curVizObj.view_id).selectAll(".brushButtonSelected")[0].length == 0) && // brush button not selected
            (d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 0)) // scissors button not selected
}

/* function to clear any brush selection
*/
function _clearBrush(curVizObj) {
    d3.select("#" + curVizObj.view_id).select(".cnvSVG").classed("brushed", false)
    d3.select("#" + curVizObj.view_id).selectAll(".gridCell").classed("active", false)

    // reset nodes and indicators
    _resetNodes(curVizObj);
    _resetIndicators(curVizObj);
}

/* mouseover function for group annotations
* highlights indicator & node for all sc's with this group annotation id, highlights group annotation rectangle in legend
* @param {String} group -- group to highlight
* @param {Object} curVizObj
*/
function _mouseoverGroupAnnot(group, curVizObj) {
    // highlight indicator & node for all sc's with this group annotation id
    curVizObj.data.groups[group].forEach(function(sc) {
        _highlightIndicator(sc, curVizObj);
        _highlightNode(sc, curVizObj);
    })

    // highlight group annotation rectangle in legend
    _highlightGroupAnnotLegendRect(group, curVizObj);
}

/* mouseover function for group annotations
* reset indicators, nodes, group annotation rectangles in legend
* @param {Object} curVizObj
*/
function _mouseoutGroupAnnot(curVizObj) {
    // reset indicators & nodes
    _resetIndicators(curVizObj);
    _resetNodes(curVizObj);

    // reset group annotation rectangles in legend
    _resetGroupAnnotLegendRects(curVizObj);
}

/* function to highlight a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} curVizObj
*/
function _highlightNode(sc_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id)
        .style("fill", curVizObj.generalConfig.highlightColour);
}

/* function to highlight a group annotation rectangle in the legend
* @param {String} group_id -- group id
* @param {Object} curVizObj
*/
function _highlightGroupAnnotLegendRect(group_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).select(".legendGroupRect.group_" + group_id)
        .attr("stroke", curVizObj.generalConfig.highlightColour);
}

/* function to unhighlight group annotation rectangles in the legend
*/
function _resetGroupAnnotLegendRects(curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".legendGroupRect")
        .attr("stroke", "none");
}

/* function to highlight indicator for a single cell
* @param {String} sc_id -- single cell id
* @param {Object} curVizObj
*/
function _highlightIndicator(sc_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).select(".indic.sc_" + sc_id)
        .style("fill-opacity", 1);
}

/* function to reset a node in the tree
* @param {String} sc_id -- single cell id
* @param {Object} curVizObj
*/
function _resetNode(sc_id, curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id)
        .style("fill", function(d) {
            return _getNodeColour(curVizObj, d.sc_id);
        });
}

/* function to reset indicator for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicator(curVizObj, sc_id) {
    d3.select("#" + curVizObj.view_id).select(".indic.sc_" + sc_id)
        .style("fill-opacity", 0);
}

/* function to reset all nodes in the tree
* @param {Object} curVizObj
*/
function _resetNodes(curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".node")
        .style("fill", function(d) {
            return _getNodeColour(curVizObj, d.sc_id);
        });
}

/* function to get the colour of a node
* @param {Object} curVizObj
* @param {String} sc_id -- single cell id
*/
function _getNodeColour(curVizObj, sc_id) {
    // group annotations specified -- colour by group
    if (curVizObj.view.groupsSpecified) {
        var found_sc_with_group = _.findWhere(curVizObj.userConfig.sc_groups, {single_cell_id: sc_id});
        return (found_sc_with_group) ? // if this sc has a group
            curVizObj.view.colour_assignment[found_sc_with_group.group] : 
            "white";
    }
    // no group annotations -- default colour
    return curVizObj.generalConfig.defaultNodeColour;
}

/* function to reset all indicators for a single cell
* @param {String} sc_id -- single cell id
*/
function _resetIndicators(curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".indic")
        .style("fill-opacity", 0);
}

/* function to reset all links in the tree
* @param {Object} curVizObj
*/
function _resetLinks(curVizObj) {
    d3.select("#" + curVizObj.view_id).selectAll(".link")
        .style("stroke", curVizObj.generalConfig.defaultLinkColour);
}

/* brush selection button push function
* @param {Object} brush -- brush object
* @param {Object} curVizObj
*/
function _pushBrushSelectionButton(brush, curVizObj) {

    // deselect brush tool
    if (d3.select("#" + curVizObj.view_id).select(".selectionButton").classed("brushButtonSelected")) {
        // deselect any nodes and indicators
        _clearBrush(curVizObj);

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

// TREE FUNCTIONS

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
            config.paddingAboveMainView + (sc_id_i/curVizObj.view.hm.nrows)*hmHeight; 
    });

    // sort single cells without heatmap data by the number of ancestors they have
    var missing_scs_sorted = [];
    curVizObj.userConfig.scs_missing_from_hm.forEach(function(sc_id) {
        missing_scs_sorted.push({
            sc_id: sc_id,
            n_ancestors: curVizObj.data.treeAncestorsArr[sc_id].length
        })
    })
    // sort by descending number of ancestors
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
                if (curVizObj.data.yCoordinates[desc]) {
                    y_coordinates_of_direct_descendants.push(curVizObj.data.yCoordinates[desc]);
                }
            })

            // set the y-coordinate for this latent single cell to be 
            // the average y-coordinate of these direct descendants
            var sum_y = y_coordinates_of_direct_descendants.reduce((a, b) => a + b, 0);
            var average_y = sum_y/(y_coordinates_of_direct_descendants.length);
            curVizObj.data.yCoordinates[sc.sc_id] = average_y;  
        }

        // if the cell has an ancestor with y-coordinates already assigned
        else if (cur_direct_ancestor.length > 0) {
            // set the y-coordinate of this latent single cell to be
            // the y coordinate of its ancestor
            curVizObj.data.yCoordinates[sc.sc_id] = curVizObj.data.yCoordinates[cur_direct_ancestor]; 
        }

        // the cell must be a latent root node
        else {
            curVizObj.data.yCoordinates[sc.sc_id] = config.paddingAboveMainView + (hmHeight/2);
        }

        // mark this cell as assigned to a y-coordinate
        assigned_scs.push(sc.sc_id);

    })
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
    curVizObj.userConfig.tree_nodes.forEach(function(node, sc_id_i) {

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
    })
}

/* function to get the link id for a link data object
* @param {Object} d - link data object
*/
function _getLinkId(d) {
   return "link_" + d.source.sc_id + "_" + d.target.sc_id;
}

/* function for mouseout of link
* @param {Object} curVizObj
* @param {Boolean} resetSelectedSCList -- whether or not to reset the seleted sc list
*/
function _linkMouseout(curVizObj, resetSelectedSCList) {
    // if there's no node or link selection taking place, or scissors tool on, reset the links
    if (_checkForSelections(curVizObj) || d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {
        // reset nodes
        d3.select("#" + curVizObj.view_id).selectAll(".node")
            .style("fill", function(d) {
                return _getNodeColour(curVizObj, d.sc_id);
            });

        // reset indicators
        d3.select("#" + curVizObj.view_id).selectAll(".indic")
            .style("fill-opacity", 0);

        // reset links
        d3.select("#" + curVizObj.view_id).selectAll(".link")
            .style("stroke", curVizObj.generalConfig.defaultLinkColour);

        // reset list of selected cells & links
        if (resetSelectedSCList) {
            curVizObj.view.selectedSCs = [];
            curVizObj.view.selectedLinks = [];
        }
    }
};

/* function for mouseover of link
* @param {Object} curVizObj
* @param {String} link_id -- id for mousedover link
*/
function _linkMouseover(curVizObj, link_id) {
    // if there's no node or link selection taking place
    if (_checkForSelections(curVizObj)) {
        // highlight downstream links
        _downstreamEffects(curVizObj, link_id);                     
    }
    // if scissors button is selected
    else if (d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {

        // reset lists of selected links and scs
        curVizObj.view.selectedSCs = [];
        curVizObj.view.selectedLinks = [];

        // highlight downstream links
        _downstreamEffects(curVizObj, link_id); 

        // highlight the potentially-cut link red
        if (curVizObj.generalConfig.switchView) { // tree view is on
            d3.select("#" + curVizObj.view_id).select(".tree."+link_id)
                .style("stroke", "red");
        }
        else { // graph view is on
            d3.select("#" + curVizObj.view_id).select(".graph."+link_id)
                .style("stroke", "red");
        }
    }
}

/* function for clicked link (tree trimming)
* @param {Object} curVizObj
* @param {String} link_id -- id for clicked link
*/
function _linkClick(curVizObj, link_id) {
    var userConfig = curVizObj.userConfig;

    // if scissors button is selected
    if (d3.select("#" + curVizObj.view_id).selectAll(".scissorsButtonSelected")[0].length == 1) {

        // for each link
        curVizObj.view.selectedLinks.forEach(function(link_id) {
            // remove link
            d3.select("#" + curVizObj.view_id).selectAll("." + link_id).remove();

            // remove link from list of links
            var index = userConfig.link_ids.indexOf(link_id);
            userConfig.link_ids.splice(index, 1);
        })
        // for each single cell
        curVizObj.view.selectedSCs.forEach(function(sc_id) {
            d3.select("#" + curVizObj.view_id).selectAll(".node_" + sc_id).remove(); // remove node in tree
            d3.select("#" + curVizObj.view_id).selectAll(".nodeLabel_" + sc_id).remove(); // remove node labels
            d3.select("#" + curVizObj.view_id).select(".gridCellG.sc_" + sc_id).remove(); // remove copy number profile
            d3.select("#" + curVizObj.view_id).select(".groupAnnot.sc_" + sc_id).remove(); // remove group annotation
            d3.select("#" + curVizObj.view_id).select(".indic.sc_" + sc_id).remove(); // remove indicator

            // remove single cell from list of single cells
            var index = curVizObj.data.hm_sc_ids.indexOf(sc_id);
            if (index != -1) {
                curVizObj.data.hm_sc_ids.splice(index, 1);
            }
        })

        // adjust copy number matrix to fill the entire space
        d3.timer(_updateTrimmedMatrix(curVizObj), 300);
    }
}

/* function for tree node mouseover
* @param {Object} curVizObj
* @param {String} sc_id -- single cell id of mousedover node
*/
function _nodeMouseover(curVizObj, sc_id) {
    // if there's no node or link selection taking place
    if (_checkForSelections(curVizObj)) {
        // show tooltip
        curVizObj.nodeTip.show(sc_id);

        // highlight node
        _highlightNode(sc_id, curVizObj);

        // highlight indicator
        _highlightIndicator(sc_id, curVizObj);
    }
}

/* function for tree node mouseout
* @param {Object} curVizObj
* @param {String} sc_id -- single cell id of mousedover node
*/
function _nodeMouseout(curVizObj, sc_id) {
    // if there's no node or link selection taking place
    if (_checkForSelections(curVizObj)) {
        // hide tooltip
        curVizObj.nodeTip.hide(sc_id);

        // reset node
        _resetNode(sc_id, curVizObj);

        // reset indicator
        _resetIndicator(curVizObj, sc_id);
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

    // highlight node
    if (curVizObj.generalConfig.switchView) { // tree view is on
        d3.select("#" + curVizObj.view_id).select(".tree.node_" + target_id)
            .style("fill", curVizObj.generalConfig.highlightColour);
    }
    else { // graph view is on
        d3.select("#" + curVizObj.view_id).select(".graph.node_" + target_id)
            .style("fill", curVizObj.generalConfig.highlightColour);
    }

    // highlight indicator for target
    d3.select("#" + curVizObj.view_id).select(".indic.sc_" + target_id)
        .style("fill-opacity", 1);

    // highlight link
    if (curVizObj.generalConfig.switchView) { // tree view is on
        d3.select("#" + curVizObj.view_id).select(".tree."+link_id)
            .style("stroke", curVizObj.generalConfig.linkHighlightColour);
    }
    else { // graph view is on
        d3.select("#" + curVizObj.view_id).select(".graph."+link_id)
            .style("stroke", curVizObj.generalConfig.linkHighlightColour);
    }

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
};

/* function to get order of tree nodes
* @param {Object} descendants -- descendants for each node
* param link_ids -- ids for all links in tree
* param node_name -- the name of the current node - start with root
* param nodeOrder -- array of node order - starts empty, appended to as function executes
*/
function _getNodeOrder(descendants, link_ids, node_name, nodeOrder) {
    var finalOrder = [];

    // get group for this node
    var found_sc_with_group = _.findWhere(curVizObj.userConfig.sc_groups, {single_cell_id: node_name});
    var cur_group = (found_sc_with_group) ? found_sc_with_group.group : undefined;

    // create object for this node
    var node_obj = {
        "sc_id": node_name, 
        "n_desc": descendants[node_name].length,
        "group": cur_group
    }

    // get the targets of this node, adding them to "targets" list
    var targetRX = new RegExp("link_source_" + node_name + "_target_(.+)");
    var targets = [];
    link_ids.map(function(id) {
        if (id.match(targetRX)) {
            var cur_target = targetRX.exec(id)[1];
            targets.push({
                "sc_id": cur_target,
                "n_desc": descendants[cur_target].length
            });
        }
    });

    // if there are no targets, append the current node to the node order array
    if (targets.length == 0) {
        nodeOrder.push(node_obj);
    }
    // there are targets
    else {
        // order the targets by number of descendants they have
        _sortByKey(targets, "n_desc");

        // for each of the targets
        targets.map(function(target, target_i) {
            // if we're at the middle target, append the current node to the node order array
            if (target_i == Math.floor(targets.length/2)) {
                nodeOrder.push(node_obj);
            }
            // get targets of this target
            _getNodeOrder(descendants, link_ids, target.sc_id, nodeOrder);
        });
    }

    // prioritize ordering by groups (split by groups and then join)
    // for each group, add nodes in that group to the final order
    _.uniq(_.pluck(nodeOrder, "group")).forEach(function(group) {
        var cur_group_nodes = _.filter(nodeOrder, function(node) {
            return node.group == group;
        })
        finalOrder = finalOrder.concat(cur_group_nodes);
    });

    return _.pluck(finalOrder, "sc_id");
 };

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
    })

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
};

/* function to get the tree structures for each node, given an array of edges 
* param {Array} directed_edges -- array of directed edges objects (source, target)
*/
function _getTreeStructures(directed_edges) {
   var treeStructures = []; // all (descendant) tree structures for all single cells 

   directed_edges.forEach(function(edge) {
      var parent = _retrieveSCTree(edge["source_sc_id"], treeStructures);
      var child = _retrieveSCTree(edge["target_sc_id"], treeStructures);
      if (parent.children) parent.children.push(child);
      else parent.children = [child];
   });

   return treeStructures;
};

/* function to get descendants id's for the specified key
* @param {Object} root - key for which we want descendants
* @param {Array} descendants - initially empty array for descendants to be placed into
*/
function _getDescendantIds(root, descendants) {
    var child;

    if (root["children"].length > 0) {
        for (var i = 0; i < root["children"].length; i++) {
            child = root["children"][i];
            descendants.push(child["sc_id"]);
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
            _getDirectDescendants(curNode.children[i], dir_descendants)
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
            _getDirectAncestors(curNode.children[i], dir_ancestors)
        }
    }

    return dir_ancestors;
}

/* function to get the ancestor ids for all nodes
* @param {Object} curVizObj
*/
function _getAncestorIds(curVizObj) {
    var ancestors = {},
        curDescendants,
        descendants_arr = curVizObj.data.treeDescendantsArr,
        treeNodes = curVizObj.userConfig.tree_nodes;

    // set up each node as originally containing an empty list of ancestors
    treeNodes.forEach(function(node, idx) {
        ancestors[node.sc_id] = [];
    })

    // get ancestors data from the descendants data
    treeNodes.forEach(function(node, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[node.sc_id];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(node.sc_id);
        }
    })

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
        curVizObj.data.secondMax_tree_path_dist = 0;
    }

    // set the distance for the current node
    curVizObj.data.pathDists[cur_sc_id] = dist_thus_far;

    // set the minimum target link distance for the current node
    curVizObj.data.minTargetLink[cur_sc_id] = Infinity;

    // for each descendant
    curVizObj.data.direct_descendants[cur_sc_id].forEach(function(desc) {
        // get link distance for the link connecting this descendant to its ancestor
        var cur_link = _.findWhere(curVizObj.userConfig.tree_edges, 
            {source_sc_id: cur_sc_id, target_sc_id: desc});
        var cur_dist = cur_link.dist;

        // update minimum target link distance for this node
        if (cur_dist < curVizObj.data.minTargetLink[cur_sc_id]) {
            curVizObj.data.minTargetLink[cur_sc_id] = cur_dist;
        }

        // update maximum (and runner-up) path distance
        var cumulative_dist = dist_thus_far+cur_dist;
        if (cumulative_dist > curVizObj.data.max_tree_path_dist) {
            curVizObj.data.secondMax_tree_path_dist = curVizObj.data.max_tree_path_dist;
            curVizObj.data.max_tree_path_dist = cumulative_dist;
        }

        // get the path lengths for its descendants
        _getDistToNodes(curVizObj, desc, cumulative_dist)
    });;
}

/* scaled elbow function (takes into account the minimum link distance for the single cell)
*/
function _scaledElbow(curVizObj, d, source_name, source, target) {

    // minimum link distance for this single cell
    var min_link_dist = (curVizObj.data.minTargetLink[source_name]/curVizObj.data.max_tree_path_dist)*curVizObj.generalConfig.treeWidth; // TODO add padding

    return "M" + source.x + "," + source.y
        + "H" + (source.x + (min_link_dist)/2)
        + "V" + target.y + "H" + target.x;
}


/* function to plot the force-directed graph
* @param {Object} curVizObj
*/
function _plotForceDirectedGraph(curVizObj) {
    var config = curVizObj.generalConfig,
        userConfig = curVizObj.userConfig;

    // layout function
    var force_layout = d3.layout.force()
        .size([config.treeWidth, config.treeHeight])
        .linkDistance(20)
        .gravity(.09)
        .charge(-20)
        .nodes(userConfig.tree_nodes)
        .links(userConfig.tree_edges)
        .start();        

    // plot links
    var link = curVizObj.view.treeSVG
        .append("g")
        .classed("graphLinks", true)
        .selectAll(".link")
        .data(userConfig.tree_edges)
        .enter().append("line")
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

    // plot nodes
    var nodeG = curVizObj.view.treeSVG.append("g")
        .classed("graphNodes", true)
        .selectAll(".graphNodesG")
        .data(userConfig.tree_nodes)
        .enter()
        .append("g")
        .attr("class", "graphNodesG");

    // node circles
    var nodeCircle = nodeG.append("circle")
        .attr("class", function(d) {
            return "graph node node_" + d.sc_id;
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
             return _getNodeColour(curVizObj, d.sc_id);
        })
        .attr("stroke", "#838181")
        .attr("fill-opacity", config.graphOpacity)
        .attr("stroke-opacity", config.graphOpacity)
        .attr("pointer-events", function() {
            return (config.graphOpacity == 1) ? "auto" : "none";
        })
        .on('mouseover', function(d) {
            _nodeMouseover(curVizObj, d.sc_id);
        })
        .on('mouseout', function(d) {
            _nodeMouseout(curVizObj, d.sc_id);
        })
        .call(force_layout.drag);

    // node single cell labels (if user wants to display them)
    if (userConfig.display_node_ids) {
        var nodeLabel = _plotNodeLabels(curVizObj, "graph");
    }

    force_layout.on("tick", function() {

        // radius of nodes
        var r = (userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;

        nodeCircle.attr("cx", function(d) { 
                return d.x = Math.max(r, Math.min(config.treeWidth - r, d.x)); 
            })
            .attr("cy", function(d) { 
                return d.y = Math.max(r, Math.min(config.treeHeight - r, d.y)); 
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
        userConfig = curVizObj.userConfig;

    // SCALE
    if (curVizObj.generalConfig.distOn) {
        // layout function
        var force_layout = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .linkDistance(function(d) {

                // smallest dimension on the view (width or height)
                var smallest_dim = (config.treeWidth < config.treeHeight) ? config.treeWidth : config.treeHeight;

                // divide by 2 so that two max paths can fit on the smallest dimension
                return (d.dist/curVizObj.data.max_tree_path_dist)*(smallest_dim/2); 
            })
            .gravity(.09)
            .charge(-100)
            .nodes(userConfig.tree_nodes)
            .links(userConfig.tree_edges)
            .start();     
    }
    // UNSCALE
    else {
        // layout function
        var force_layout = d3.layout.force()
            .size([config.treeWidth, config.treeHeight])
            .linkDistance(20)
            .gravity(.09)
            .charge(-20)
            .nodes(userConfig.tree_nodes)
            .links(userConfig.tree_edges)
            .start();        
    }

    // node circles
    var nodeCircle = curVizObj.view.treeSVG.selectAll(".graph.node")
        .on('mousedown.drag', null);
    nodeCircle
        .call(force_layout.drag);

    force_layout.on("tick", function() {

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
        .attr("x", function(d) { return d.x})
        .attr("y", function(d) { return d.y})
        .attr("font-size", 
            _getLabelFontSize(_.pluck(curVizObj.userConfig.tree_nodes, "sc_id"), 
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
    }
    return diagonal({source: source, target: target});
}

/* function to plot phylogenetic tree aligned with heatmap
* @param {Object} curVizObj
*/
function _plotAlignedPhylogeny(curVizObj) {
    var config = curVizObj.generalConfig;
    var r = (curVizObj.userConfig.display_node_ids) ? config.tree_w_labels_r : config.tree_r;
    var half_rowHeight = (curVizObj.view.hm.rowHeight/2); // half the height of one heatmap row

    // create links
    var link = curVizObj.view.treeSVG.append("g")
        .classed("treeLinks", true)
        .selectAll(".tree.link")                  
        .data(curVizObj.userConfig.tree_edges)                   
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
        .data(curVizObj.userConfig.tree_nodes)
        .enter()
        .append("g")
        .attr("class", "treeNodesG");;

    nodeG.append("circle")   
        .attr("class", function(d) {
            return "tree node node_" + d.sc_id;
        })  
        .attr("cx", function(d) { 
            d.x = curVizObj.data.xCoordinates[d.sc_id];
            return d.x;
        })
        .attr("cy", function(d) { 
            d.y = curVizObj.data.yCoordinates[d.sc_id] + half_rowHeight;
            return d.y;
        })   
        .attr("stroke",curVizObj.generalConfig.defaultLinkColour)           
        .attr("fill", function(d) {
            return _getNodeColour(curVizObj, d.sc_id);
        })
        .attr("r", r)
        .attr("fill-opacity", config.treeOpacity)
        .attr("stroke-opacity", config.treeOpacity)
        .attr("pointer-events", function() {
            return (config.treeOpacity == 1) ? "auto" : "none";
        })
        .on('mouseover', function(d) {
            _nodeMouseover(curVizObj, d.sc_id);
        })
        .on('mouseout', function(d) {
            _nodeMouseout(curVizObj, d.sc_id);
        });

    // node single cell labels (if user wants to display them)
    if (curVizObj.userConfig.display_node_ids) {
        _plotNodeLabels(curVizObj, "tree");
    }
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

    config.switchView = !config.switchView
}

/* function to plot tree/graph scaled by edge distances
* @param {Object} curVizObj
*/
function _scaleTree(curVizObj) {
    var config = curVizObj.generalConfig;
    var half_rowHeight = (curVizObj.view.hm.rowHeight/2); // half the height of one heatmap row
    curVizObj.generalConfig.distOn = !curVizObj.generalConfig.distOn;

    // SCALE nodes & labels
    if (curVizObj.generalConfig.distOn) {
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

/* function to get group annotations as object w/properties group : [array of single cells]
* @param {Object} curVizObj
*/
function _reformatGroupAnnots(curVizObj) {
    var groups = {};

    curVizObj.userConfig.sc_groups.forEach(function(sc) {
        if (!groups[sc.group]) {
            groups[sc.group] = [];
        }
        groups[sc.group].push(sc.single_cell_id);
    });

    curVizObj.data.groups = groups;
}

// CNV FUNCTIONS

/* function to update copy number matrix upon trimming
*/
function _updateTrimmedMatrix(curVizObj) {
    var config = curVizObj.generalConfig;
    var half_rowHeight = (curVizObj.view.hm.rowHeight/2); // half the height of one heatmap row

    // get updated y-coordinates for each single cell
    _getYCoordinates(curVizObj);

    // keep track of matrix height
    var matrix_height = 0;

    // for each single cell that's still in the matrix
    curVizObj.data.hm_sc_ids.forEach(function(sc_id) {
        // difference between original & new y-coordinates for this single cell
        var original_y = curVizObj.data.originalYCoordinates[sc_id];
        var new_y = curVizObj.data.yCoordinates[sc_id];
        var diff_y = original_y - new_y;

        // translate copy number profile & indicator
        d3.select("#" + curVizObj.view_id).select(".gridCellG.sc_" + sc_id)
            .transition()
            .duration(1000)
            .attr("transform", function() {
                return "translate(0," + (-1*diff_y) + ")";
            });
        
        // translate group annotation
        if (curVizObj.view.groupsSpecified) {
            d3.select("#" + curVizObj.view_id).select(".groupAnnot.sc_" + sc_id)
                .transition()
                .duration(1000)
                .attr("transform", function() {
                    return "translate(0," + (-1*diff_y) + ")";
                });
        }

        // translate indicator
        d3.select("#" + curVizObj.view_id).select(".indic.sc_" + sc_id)
            .transition()
            .duration(1000)
            .attr("transform", function() {
                return "translate(0," + (-1*diff_y) + ")";
            });

        // update matrix height 
        matrix_height = new_y + curVizObj.view.hm.rowHeight;

    });

    // translate aligned tree links
    d3.select("#" + curVizObj.view_id).selectAll(".tree.link") 
        .transition()
        .duration(1000)                       
        .attr("d", function(d) {
            return _getElbow(curVizObj, d, half_rowHeight);
        });

    // translate aligned tree nodes
    d3.select("#" + curVizObj.view_id).selectAll(".tree.node")
        .transition()
        .duration(1000)
        .attr("cy", function(d) { 
            d.y = curVizObj.data.yCoordinates[d.sc_id] + half_rowHeight;
            return d.y;
        });

    // translate aligned tree nodelabels
    d3.select("#" + curVizObj.view_id).selectAll(".tree.nodeLabel")
        .transition()
        .duration(1000)
        .attr("y", function(d) { 
            return d.y = curVizObj.data.yCoordinates[d.sc_id] + half_rowHeight; 
        })

    // move chromosome legend up
    d3.select("#" + curVizObj.view_id).selectAll(".chromBox")
        .transition()
        .duration(1000)
        .attr("y", matrix_height);
    d3.select("#" + curVizObj.view_id).selectAll(".chromBoxText")
        .transition()
        .duration(1000)
        .attr("y", matrix_height + (config.chromLegendHeight / 2));

    // check for groups no longer in the view
    if (curVizObj.view.groupsSpecified) {
        // for each group
        Object.keys(curVizObj.data.groups).forEach(function(group_id) {
            // check that the group has members in the view
            var group_members_in_view = 
                _getIntersection(curVizObj.data.groups[group_id], 
                    curVizObj.data.hm_sc_ids);

            // if no members left in view, delete the group from the legend
            if (group_members_in_view.length == 0) {
                d3.select("#" + curVizObj.view_id).select(".legendGroupRect.group_" + group_id).remove();
                d3.select("#" + curVizObj.view_id).select(".legendGroupText.group_" + group_id).remove();
            }
        })

        // adjust position of groups in legend
        d3.select("#" + curVizObj.view_id).selectAll(".legendGroupRect")
            .transition()
            .duration(1000)
            .attr("y", function(d,i) {
                return config.groupAnnotStartY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing);
            });
        d3.select("#" + curVizObj.view_id).selectAll(".legendGroupText")
            .transition()
            .duration(1000)
            .attr("y", function(d,i) {
                return config.groupAnnotStartY + config.legendTitleHeight + config.rectSpacing*2 + i*(config.rectHeight + config.rectSpacing) + (config.legendFontHeight/2);
            })
    }
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
        var cur_chrom_data = _.filter(curVizObj.userConfig.cnv_data, function(cnv){ return cnv.chr == chroms[i]; });
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
                return (res == 0) ? (a[secondKey] > b[secondKey]) : res;
            }
            else if (typeof(a[secondKey] == "number")) {
                return (res == 0) ? (a[secondKey] - b[secondKey]) : res;
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

    if (array1 == undefined || array2 == undefined) {
        return [];
    }

    return array1.filter(function(n) {
        return array2.indexOf(n) != -1
    });
}
