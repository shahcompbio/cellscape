# script to load in gml file and convert it to a list of edges
library(stringr)

# parameters
path <- "/Users/msmith/data/external/SA501_xenograft_data/all_symbols_low_path_CLG_tree.gml"

# load graphml data
string <- readChar(path, nchars=1e6)

# parse nodes from gml string
nodeRXPattern <- "id ([:alnum:]+)\r\n    label \"([:alnum:]+)\"\r\n"
node_extractions <- stringr::str_match_all(string, nodeRXPattern)
nodes <- data.frame(
	id=node_extractions[[1]][,2], 
	label=node_extractions[[1]][,3], 
	stringsAsFactors=FALSE)

# parse edges from gml string
edgeRXPattern <- "source ([:alnum:]+)\r\n    target ([:alnum:]+)\r\n"
edge_extractions <- stringr::str_match_all(string, edgeRXPattern)
edges_by_id <- data.frame(
	source_id=edge_extractions[[1]][,2], 
	target_id=edge_extractions[[1]][,3], 
	stringsAsFactors=FALSE)

# swap ids for labels
edges <- merge(edges_by_id, nodes, by.x = "source_id", by.y = "id")
colnames(edges)[which(colnames(edges) == "label")] <- "source"
edges <- merge(edges, nodes, by.x = "target_id", by.y = "id")
colnames(edges)[which(colnames(edges) == "label")] <- "target"
edges <- data.frame(
	source=edges$source, 
	target=edges$target, 
	stringsAsFactors=FALSE)