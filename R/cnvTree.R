#' cnvTree
#'
#' Explores single cell copy number profiles in the context of a single cell tree.
#' To use: Hover over nodes to inspect them. Click on nodes to select them.
#' Hover over branches to inspect the downstream nodes. Click on branches to select the downstream nodes.
#' To inspect a copy number profile, hover just to the left of the profile. Click this same region to select 
#' single cell(s). 
#' To exit any selection, double click near the single cell tree.
#'   
#' @import htmlwidgets, gtools, jsonlite, reshape2, stringr, dplyr
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

    # get chromosomes, chromosome bounds (min & max bp), genome length
    chroms <- gtools::mixedsort(unique(cnv_data$chr))
    chrom_bounds <- getChromBounds(chroms, cnv_data) 
    genome_length <- getGenomeLength(chrom_bounds)
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

  # GET PIXELS FOR EACH SINGLE CELL

  ncols <- (width/2) - 40 # number of columns (pixels)
  n_bp_per_pixel <- getNBPPerPixel(ncols, chrom_bounds, genome_length) # number bps per pixel
  pixel_info <- getPixelsForEachSC(cnv_data, chrom_bounds, n_bp_per_pixel)
  
  # GET CHROMOSOME BOX INFO
  chrom_boxes <- getChromBoxInfo(chrom_bounds, n_bp_per_pixel)

  # forward options using x
  x = list(
    cnv_data=jsonlite::toJSON(cnv_data),
    tree_edges=jsonlite::toJSON(tree_edges_for_layout),
    sc_ids_ordered=sc_id_order,
    sc_groups=sc_groups,
    link_ids=link_ids,
    tree_nodes=jsonlite::toJSON(tree_nodes_for_layout),
    chroms=chroms,
    pixel_info=jsonlite::toJSON(pixel_info),
    chrom_boxes=jsonlite::toJSON(chrom_boxes),
    cnvWidth=ncols
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


#' function to get min and max values for each chromosome
#' @param chroms -- vector of chromosome names
getChromBounds <- function(chroms, cnv_data) {

  # get min & max for each chromosome
  chrom_bounds = sapply(chroms, function(chrom) {
    chrom_cnv_data <- cnv_data[which(cnv_data$chr == chrom),]
    start <- min(chrom_cnv_data$start)
    end <- max(chrom_cnv_data$end)
    return(c(chrom=chrom, bp_start=start, bp_end=end))
  })

  # flip data frame
  chrom_bounds_t <- as.data.frame(t(as.matrix(chrom_bounds)))

  # ensure correct data types
  chrom_bounds_t$bp_start <- as.numeric(as.character(chrom_bounds_t$bp_start))
  chrom_bounds_t$bp_end <- as.numeric(as.character(chrom_bounds_t$bp_end))

  # get the ADDITIVE chromosome start and end bps
  chrom_bounds_t$chrom_start <- NA
  chrom_bounds_t$chrom_end <- NA
  next_chr_start_bp <- 0 # base pair BEFORE the next chromosome
  for (i in 1:nrow(chrom_bounds_t)) {
    chrom_bounds_t$chrom_start[i] <- next_chr_start_bp
    this_chr_end_bp <- next_chr_start_bp + (chrom_bounds_t$bp_end[i] - chrom_bounds_t$bp_start[i])
    chrom_bounds_t$chrom_end[i] <- this_chr_end_bp
    next_chr_start_bp <- this_chr_end_bp + 1
  }

  # get the chromosome index
  chrom_bounds_t$chrom_index <- seq(1:nrow(chrom_bounds_t))

  return (chrom_bounds_t)
}

#' function to get chromosome box pixel info
#' @param {Object} vizObj
#'
getChromBoxInfo <- function(chrom_bounds, n_bp_per_pixel) {
  chrom_boxes <- data.frame(chr=chrom_bounds$chrom, 
                            # x coordinate (start of chromosome)
                            x=floor(chrom_bounds$chrom_start/n_bp_per_pixel) + 2*(chrom_bounds$chrom_index - 1), 
                            width=rep(-1, nrow(chrom_bounds)))
  # width = end - start + 1
  chrom_boxes$width <- (floor(chrom_bounds$chrom_end/n_bp_per_pixel) + 2*(chrom_bounds$chrom_index - 1)) - chrom_boxes$x + 1

  return(chrom_boxes)
}

#' function to get the genome length
#' @param {Data Frame} chrom_bounds -- chromosome boundaries
getGenomeLength <- function(chrom_bounds) {

  tmp_chrom_bounds <- chrom_bounds
  tmp_chrom_bounds$n_bps <- tmp_chrom_bounds$bp_end - tmp_chrom_bounds$bp_start + 1
  genome_length <- sum(tmp_chrom_bounds$n_bps)

  return(genome_length)
}

#' function to get the number of base pairs per pixel
#' @param {Integer} ncols -- number of columns (pixels) to fill
#' @param {Data Frame} chrom_bounds -- chromosome boundaries
#' @param {Integer} genome_length -- length of the genome
getNBPPerPixel <- function(ncols, chrom_bounds, genome_length) {
  n_data_pixels <- ncols - 2*(nrow(chrom_bounds) + 1) # number of pixels filled with data 
                                                      # (subtract number chromosome separators:
                                                      # - 1 for each separator
                                                      # - 1 for the end of each chromosome 
                                                      # (we don't want chromosomes to share pixels))
  n_bp_per_pixel <- ceiling(genome_length/n_data_pixels) # number of bps per pixel
  return(n_bp_per_pixel)
}

#' function to get information (chr, start, end, mode_cnv) for each pixel
#' @param {Data Frame} cnv_data -- copy number variant segments data
#' @param {Data Frame} chrom_bounds -- chromosome boundaries
#' @param {Integer} n_bp_per_pixel -- number of base pairs per pixel
getPixelsForEachSC <- function(cnv_data, chrom_bounds, n_bp_per_pixel) {

  # get the pixel start and end for each segment (account for chromosome separators in pixel info)
  pixel_info <- cnv_data
  pixel_info <- merge(cnv_data, chrom_bounds, by.x="chr", by.y="chrom")
  pixel_info$start_px <- floor((pixel_info$chrom_start + pixel_info$start) / n_bp_per_pixel) + 2*(pixel_info$chrom_index-1)
  pixel_info$end_px <- floor((pixel_info$chrom_start + pixel_info$end) / n_bp_per_pixel) + 2*(pixel_info$chrom_index-1)
  pixel_info$px_width <- pixel_info$end_px - pixel_info$start_px + 1

  # note any segments whose start_px != end_px --> these will be the separated end pixels
  segment_ends_info <- pixel_info[which(pixel_info$start_px != pixel_info$end_px),]

  # save their left ends (starts)
  starts <- segment_ends_info
  colnames(starts)[which(colnames(starts) == "start_px")] <- "px"
  starts <- starts[ , !(names(starts) %in% c("end_px"))] # drop end_px column
  starts$px_width <- 1 # set pixel width to 1

  # save their right ends (ends)
  ends <- segment_ends_info
  colnames(ends)[which(colnames(ends) == "end_px")] <- "px"
  ends <- ends[ , !(names(ends) %in% c("start_px"))] # drop start_px column
  ends$px_width <- 1 # set pixel width to 1

  # save their middles (for segments with length greater than 2)
  segs_gt_2 <- segment_ends_info[which(segment_ends_info$px_width > 2),]
  segs_gt_2$px_width <- segs_gt_2$px_width - 2 # subtract 2 (for 2 ends) from pixel width
  middles <- segs_gt_2[,c("single_cell_id", "start_px", "px_width", "integer_copy_number", "chr", "chrom_index")]
  colnames(middles)[which(colnames(middles) == "start_px")] <- "px"
  colnames(middles)[which(colnames(middles) == "integer_copy_number")] <- "mode_cnv"
  middles$px <- middles$px + 1 # first pixel will be a start pixel, so we shift 1

  # note any segments that occupy one pixel only
  singles <- pixel_info[which(pixel_info$start_px == pixel_info$end_px),]
  colnames(singles)[which(colnames(singles) == "end_px")] <- "px"
  singles <- singles[ , !(names(singles) %in% c("start_px"))] # drop start_px column

  # bind starts, ends, and singles
  starts_ends_singles <- rbind(starts, ends, singles)

  # find the mode cnv of all starts, ends, and singles
  starts_ends_singles_grouped <- dplyr::group_by(starts_ends_singles, single_cell_id, px, px_width, chr, chrom_index)
  starts_ends_singles_w_mode <- dplyr::summarise(starts_ends_singles_grouped, mode_cnv=findMode(integer_copy_number)[["mode"]])
  starts_ends_singles_w_mode <- as.data.frame(starts_ends_singles_w_mode)

  # bind the starts, ends, singles and middles
  all_pixels <- rbind(starts_ends_singles_w_mode, middles)
  all_pixels <- all_pixels[with(all_pixels, order(single_cell_id, px)), ]
  colnames(all_pixels)[which(colnames(all_pixels) == "single_cell_id")] <- "sc_id"

  # merge consecutive pixels with the same mode_cnv

  # remove NAs & Infs from mode cnv for cumsum calculation
  all_pixels$mode_cnv_no_NA <- all_pixels$mode_cnv
  all_pixels$mode_cnv_no_NA[which(is.na(all_pixels$mode_cnv_no_NA))] <- 1 
  all_pixels$mode_cnv_no_NA[which(all_pixels$mode_cnv_no_NA == Inf)] <- 1 
  # compute the lengths and values of runs of equal values vector of cnvs
  cnv_rle <- rle(all_pixels$mode_cnv_no_NA)
  # add 1 so zero copy numbers have an additive effect in the cumulative sum calculation
  all_pixels$cumsum_values <- rep.int(cumsum(cnv_rle$values + 1), cnv_rle$length)
  # add chromosome index to cumsum values to ensure ends of chromosomes are not merged if same cnv
  all_pixels$cumsum_values <- all_pixels$cumsum_values + all_pixels$chrom_index 
  all_pixels_select <- dplyr::select(all_pixels, sc_id, px, px_width, chr, mode_cnv, cumsum_values)
  all_pixels_grouped <- dplyr::group_by(all_pixels_select, sc_id, cumsum_values)
  consecutive_px_merged <- dplyr::summarise(all_pixels_grouped, sum_px_width=sum(px_width),
                                                                chr=chr[1],
                                                                px_min=min(px),
                                                                mode_cnv=mode_cnv[1])
  consecutive_px_merged <- as.data.frame(consecutive_px_merged)
  colnames(consecutive_px_merged) <- c("sc_id", "cumsum_values", "px_width", "chr", "px", "mode_cnv")
  # rearrange columns
  consecutive_px_merged <- consecutive_px_merged[,c("sc_id","px","px_width","chr","mode_cnv","cumsum_values")]

  # separate pixels by single cell id
  consecutive_px_merged_split <- split(consecutive_px_merged , f = consecutive_px_merged$sc_id)

  return (consecutive_px_merged_split)
}

# function to find the mode of a vector
findMode <- function(x) {
  ux <- unique(x) # each unique value
  n_appearances <- tabulate(match(x, ux)) # number of appearances for each unique value
  return(list(mode=ux[which.max(n_appearances)], n_with_max=max(n_appearances)))
}
