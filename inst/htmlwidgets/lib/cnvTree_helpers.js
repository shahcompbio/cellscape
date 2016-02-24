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