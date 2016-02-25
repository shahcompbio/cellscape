#' cnvTree
#'
#' explores single cell copy number profiles in the context of a single cell tree.
#'
#' @import htmlwidgets
#'
#' @param cnv_data Single cell copy number data frame.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "chr" - chromosome number
#'                       (3) {Number} "start" - start position
#'                       (4) {Number} "end" - end position
#'                       (5) {Number} "integer_copy_number" - copy number state.
#'
#' @param tree_edges Edges for the single cell phylogenetic tree.
#'   Format: columns are (1) {String} "source" - edge source
#'                       (2) {String} "target" - edge target
#'
#' @export
cnvTree <- function(cnv_data, tree_edges, width = 1000, height = 1000) {

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
  }

  # TREE EDGE DATA
  if (is.data.frame(tree_edges)) {

    # ensure column names are correct
    if (!("source" %in% colnames(tree_edges)) ||
        !("target" %in% colnames(tree_edges))) {
      stop(paste("Tree edges data frame must have the following column names: ", 
          "\"source\", \"target\"", sep=""))
    }
  }

  # forward options using x
  x = list(
    cnv_data=jsonlite::toJSON(cnv_data),
    tree_edges=jsonlite::toJSON(tree_edges)
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
