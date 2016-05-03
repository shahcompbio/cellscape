#' cnvTree
#'
#' Explores single cell copy number profiles in the context of a single cell tree.
#' To use: Hover over nodes to inspect them. Click on nodes to select them.
#' Hover over branches to inspect the downstream nodes. Click on branches to select the downstream nodes.
#' To inspect a copy number profile, hover just to the left of the profile. Click this same region to select 
#' single cell(s). 
#' To exit any selection, double click near the single cell tree.
#'   
#' @import htmlwidgets, gtools, jsonlite, reshape2, stringr
#'
#' @param cnv_data {Data frame} Single cell copy number data frame.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "chr" - chromosome number
#'                       (3) {Number} "start" - start position
#'                       (4) {Number} "end" - end position
#'                       (5) {Number} "integer_copy_number" - copy number state.
#'
#' @param tree_edges {Data frame} Edges for the single cell phylogenetic tree.
#'   Format: columns are (1) {String} "source" - edge source (single cell id)
#'                       (2) {String} "target" - edge target (single cell id)
#'
#' @param sc_groups {Data frame} (Optional) Group assignment (annotation) for each single cell.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "group" - group assignment
#'
#' @param sc_id_order {Array} (Optional) Order of single cell ids.
#' @param width {Number} (Optional) Width of the plot.
#' @param height {Number} (Optional) Height of the plot.
#'
#' @export
cnvTree <- function(cnv_data, tree_edges, sc_id_order = "NA", sc_groups = NULL, width = 1200, height = 1000) {

  # CHECK REQUIRED INPUTS ARE PRESENT 
  if (missing(cnv_data)) {
    stop("User must provide CNV data (parameter cnv_data).")
  }
  if (missing(tree_edges)) {
    stop("User must provide tree edge data (parameter tree_edges).")
  }

  # CNV DATA
  if (is.data.frame(cnv_data)) {

    # ensure column names are correct
    if (!("single_cell_id" %in% colnames(cnv_data)) ||
        !("chr" %in% colnames(cnv_data)) ||
        !("start" %in% colnames(cnv_data)) ||
        !("end" %in% colnames(cnv_data)) ||
        !("integer_copy_number" %in% colnames(cnv_data))) {
      stop(paste("CNV data frame must have the following column names: ", 
          "\"single_cell_id\", \"chr\", \"start\", \"end\", \"integer_copy_number\"", sep=""))
    }

    # ensure data is of the correct type
    cnv_data$single_cell_id <- as.character(cnv_data$single_cell_id)
    cnv_data$chr <- as.character(cnv_data$chr)
    cnv_data$start <- as.numeric(as.character(cnv_data$start))
    cnv_data$end <- as.numeric(as.character(cnv_data$end))
    cnv_data$integer_copy_number <- as.numeric(as.character(cnv_data$integer_copy_number))

    # get chromosomes
    chroms <- gtools::mixedsort(unique(cnv_data$chr))
  }

  # TREE EDGE DATA
  if (is.data.frame(tree_edges)) {

    # ensure column names are correct
    if (!("source" %in% colnames(tree_edges)) ||
        !("target" %in% colnames(tree_edges))) {
      stop(paste("Tree edges data frame must have the following column names: ", 
          "\"source\", \"target\"", sep=""))
    }

    # ensure data is of the correct type
    tree_edges$source <- as.character(tree_edges$source)
    tree_edges$target <- as.character(tree_edges$target)

    # list of tree nodes for d3 phylogenetic layout function
    unique_nodes <- unique(c(tree_edges$source, tree_edges$target))
    tree_nodes_for_layout<- data.frame(matrix("", ncol = 2, nrow = length(unique_nodes)), stringsAsFactors=FALSE) 
    colnames(tree_nodes_for_layout) <- c("name", "index")
    tree_nodes_for_layout$name <- unique_nodes
    tree_nodes_for_layout$index <- rep(NULL, nrow(tree_nodes_for_layout))
    for (i in 1:nrow(tree_nodes_for_layout)) {
      tree_nodes_for_layout$index[i] <- i-1
    }
    tree_nodes_for_layout$index <- as.numeric(as.character(tree_nodes_for_layout$index))

    # list of tree edges for d3 phylogenetic layout function
    tree_edges_for_layout<- data.frame(matrix("", ncol = 3, nrow = nrow(tree_edges)), stringsAsFactors=FALSE) 
    colnames(tree_edges_for_layout) <- c("source", "target", "link_id")
    for (i in 1:nrow(tree_edges)) {
      tree_edges_for_layout$source[i] <- which(tree_nodes_for_layout$name == tree_edges$source[i]) - 1
      tree_edges_for_layout$target[i] <- which(tree_nodes_for_layout$name == tree_edges$target[i]) - 1
      tree_edges_for_layout$link_id[i] <- paste("link_source_", tree_edges$source[i], 
        "_target_", tree_edges$target[i], sep="")
    }
    tree_edges_for_layout$source <- as.numeric(as.character(tree_edges_for_layout$source))
    tree_edges_for_layout$target <- as.numeric(as.character(tree_edges_for_layout$target))

    # get list of link ids
    link_ids <- tree_edges_for_layout$link_id
  }

  # SINGLE CELL GROUPS
  if (!is.null(sc_groups)) {
    # ensure column names are correct
    if (!("single_cell_id" %in% colnames(sc_groups)) ||
        !("group" %in% colnames(sc_groups))) {
      stop(paste("Single cell group assignment data frame must have the following column names: ", 
          "\"single_cell_id\", \"group\"", sep=""))
    }

    # ensure data is of the correct type
    sc_groups$single_cell_id <- as.character(sc_groups$single_cell_id)
    sc_groups$group <- as.character(sc_groups$group)

    # to json
    sc_groups <- jsonlite::toJSON(sc_groups)
  }

  # SINGLE CELL IDS

  # if order is not specified, grab the order of the single cells in the cnv data
  if (sc_id_order == "NA") {
    sc_id_order = unique(cnv_data$single_cell_id)
  }

  # forward options using x
  x = list(
    cnv_data=jsonlite::toJSON(cnv_data),
    tree_edges=jsonlite::toJSON(tree_edges_for_layout),
    sc_ids_ordered=sc_id_order,
    sc_groups=sc_groups,
    link_ids=link_ids,
    tree_nodes=jsonlite::toJSON(tree_nodes_for_layout),
    chroms=chroms
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'cnvTree',
    x,
    width = width,
    height = height,
    package = 'cnvTree'
  )
}

#' Widget output function for use in Shiny
#'
#' @export
cnvTreeOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'cnvTree', width, height, package = 'cnvTree')
}

#' Widget render function for use in Shiny
#'
#' @export
renderCnvTree <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, cnvTreeOutput, env, quoted = TRUE)
}

# HELPER FUNCTIONS

