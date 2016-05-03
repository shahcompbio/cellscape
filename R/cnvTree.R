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
cnvTree <- function(cnv_data, tree_edges, sc_id_order = NULL, sc_groups = NULL, width = 1200, height = 1000) {

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
  if (is.null(sc_id_order)) {
    sc_id_order = unique(cnv_data$single_cell_id)
  }

  # GET GRID OF PIXELS
  tmp_ncols <- 500 # temporary number of columns
  empty_pixels <- getEmptyGrid(sc_id_order, tmp_ncols)
  tmp <- getChromBounds(chroms, cnv_data) # TODO "x" "y"
  print(tmp)

  # forward options using x
  x = list(
    cnv_data=jsonlite::toJSON(cnv_data),
    tree_edges=jsonlite::toJSON(tree_edges_for_layout),
    sc_ids_ordered=sc_id_order,
    sc_groups=sc_groups,
    link_ids=link_ids,
    tree_nodes=jsonlite::toJSON(tree_nodes_for_layout),
    chroms=chroms,
    empty_pixels=jsonlite::toJSON(empty_pixels)
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


#' Function to get data frame of pixels
getEmptyGrid <- function(sc_ids_ordered, ncols) {
  sc_ids <- rep(sc_ids_ordered, each=ncols)
  cols <- rep(seq(0:(ncols-1)), length(sc_ids_ordered))

  return(data.frame(col=cols, sc_id=sc_ids, stringsAsFactors=FALSE))
}


#' function to get chromosome min and max values
#' @param chroms -- vector of chromosome names
getChromBounds <- function(chroms, cnv_data) {
    chrom_bounds = lapply(chroms, function(chrom) {
        chrom_cnv_data <- cnv_data[which(cnv_data$chr == chrom),]
        start <- min(chrom_cnv_data$start)
        end <- max(chrom_cnv_data$end)
        return(c(start=start, end=end))
      })

    return(chrom_bounds)
}


#' function to fill the pixel grid with chromosome info (chr, start, end, mode_cnv)
#' @param pixels -- empty data frame of pixels
#' @param sc_ids -- single cell ids (in order)
#' @param chroms -- vector of chromosomes
fillPixelWithChromInfo <- function(cnv_data, ncols, pixels, sc_ids, chroms) {
  chr_index <- 0 # index of current chromosome
  cur_chr <- chroms[chr_index] # current chromosome
}

# /* function to fill the pixel grid with chromosome info (chr, start, end, mode_cnv)
# * @param {Object} vizObj
# */
# function _fillPixelWithChromInfo(vizObj) {
#     var cnv_data = vizObj.userConfig.cnv_data, // cnv data from user
#         nCols = vizObj.view.cnv.ncols,
#         pixels = vizObj.view.cnv.pixels, // empty grid of pixels
#         sc_ids = vizObj.userConfig.sc_ids_ordered; // single cell ids

#     // number of pixels filled with data 
#     // (subtract number chromosome separators:
#     // - 1 for each separator
#     // - 1 for the end of each chromosome (we don't want chromosomes to share pixels))
#     var n_data_pixels = vizObj.view.cnv.ncols - 2*(vizObj.userConfig.chroms.length + 1), 
#         chr_index = 0, // index of current chromosome
#         cur_chr = vizObj.userConfig.chroms[chr_index], // current chromosome
#         start_bp = vizObj.data.chrom_bounds[cur_chr]["start"], // start bp of the current pixel
#         cur_sc_id = pixels[0]["sc_id"];
#     vizObj.data.n_bp_per_pixel = Math.ceil(vizObj.data.genome_length/n_data_pixels); // number of base pairs per pixel

#     // for each pixel
#     for (var i = 0; i < pixels.length; i++) {
#         var pixel = pixels[i];

#         // if we're at the end of the single cell's genome, but excess pixels are on this row 
#         if (!cur_chr && (pixel["sc_id"] == cur_sc_id)) {
#             pixel["start"] = NaN;
#             pixel["end"] = NaN;
#             pixel["chr"] = "NA";
#             pixel["mode_cnv"] = NaN;
#             continue;                
#         }

#         // we're onto a new single cell
#         if (pixel["sc_id"] != cur_sc_id) {
#             cur_sc_id = pixel["sc_id"];
#             chr_index = 0;
#             cur_chr = vizObj.userConfig.chroms[chr_index];
#             start_bp = vizObj.data.chrom_bounds[cur_chr]["start"]; // start bp of the current pixel             
#         } 

#         // get genomic region in this bin
#         var end_bp = start_bp + vizObj.data.n_bp_per_pixel;
#         pixel["start"] = start_bp;
#         pixel["end"] = end_bp;
#         pixel["chr"] = cur_chr;
        
#         // get segments for this bin
#         var segments = vizObj.data.itrees[pixel["sc_id"]][cur_chr].search(start_bp, end_bp);

#         // copy numbers for each segment in this bin
#         var integer_copy_numbers = [];
#         _.pluck(segments, "id").forEach(function(segment_id) {
#             integer_copy_numbers.push(cnv_data[segment_id]["integer_copy_number"]);
#         });
#         pixel["mode_cnv"] = _arrayMode(integer_copy_numbers);

#         // update starting base pair
#         start_bp = end_bp + 1;

#         // check if we're onto a new chromosome
#         if (start_bp > vizObj.data.chrom_bounds[cur_chr]["end"]) {

#             // skip a pixel to leave chromosome separator
#             i++;
#             if (i < pixels.length) {
#                 pixels[i]["separator"] = true;
#             }

#             cur_chr = vizObj.userConfig.chroms[++chr_index]; // next chromosome
#             start_bp = (cur_chr) ? vizObj.data.chrom_bounds[cur_chr]["start"] : NaN;  // new starting base pair
#         }       
#     };

#     // group consecutive pixels in the same single cell & same chromosome with the same copy number
#     var new_pixels = [], // condensed array of pixels
#         prev_start = pixels[0]["start"]; // starting bp for the current cnv
#     pixels[0]["px_length"] = 1; // length of the first pixel
#     for (var i = 1; i < pixels.length; i++) {

#         // a new chromosome (a new single cell is automatically a new chromosome too)
#         if (pixels[i-1]["chr"] != pixels[i]["chr"]) {
#             prev_start = pixels[i]["start"]; 

#             // pixel length is 1
#             pixels[i]["px_length"] = 1;

#             // append the previous pixel to the list
#             new_pixels.push(pixels[i-1]);
#         }

#         // the same chromosome
#         else {
#             // same cnv value as the previous pixel
#             if (pixels[i-1]["mode_cnv"] == pixels[i]["mode_cnv"]) {

#                 // bring forward the start of this pixel
#                 pixels[i]["start"] = prev_start;
#                 pixels[i]["px_length"] = pixels[i-1]["px_length"] + 1;
#             }
#             // different cnv value
#             else {
#                 // update the starting bp for this cnv
#                 prev_start = pixels[i]["start"];

#                 // pixel length is 1
#                 pixels[i]["px_length"] = 1;

#                 // append the previous pixel to the list
#                 new_pixels.push(pixels[i-1]);
#             }
#         }
#     }

#     vizObj.view.cnv.pixels = new_pixels;

# }

