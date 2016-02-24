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
cnvTree <- function(cnv_data, tree_edges, width = NULL, height = NULL) {

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
