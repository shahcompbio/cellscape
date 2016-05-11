#' cnvTree
#'
#' Explores single cell copy number profiles in the context of a single cell tree.
#'   
#' @import htmlwidgets, gtools, jsonlite, reshape2, stringr, dplyr
#'
#' @param cnv_data {Data frame} (Required if mut_data not provided) Single cell copy number segments data.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "chr" - chromosome number
#'                       (3) {Number} "start" - start position
#'                       (4) {Number} "end" - end position
#'                       (5) {Number} "integer_copy_number" - copy number state.
#'
#' @param mut_data {Data frame} (Required if cnv_data not provided) Single cell targeted mutation data frame.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "chr" - chromosome number
#'                       (3) {Number} "coord" - genomic coordinate
#'                       (5) {Number} "VAF" - variant allele frequency.
#'
#' @param tree_edges {Data frame} Edges for the single cell phylogenetic tree.
#'   Format: columns are (1) {String} "source" - edge source (single cell id)
#'                       (2) {String} "target" - edge target (single cell id)
#'
#' @param sc_groups {Data frame} (Optional) Group assignment (annotation) for each single cell.
#'   Format: columns are (1) {String} "single_cell_id" - single cell id
#'                       (2) {String} "group" - group assignment
#'
#' @param sc_id_order {Array} (Optional) Single cell ids in the desired y-axis order for the heatmap. 
#'                                       By default, single cells will be ordered by the phylogeny.
#' @param mut_order {Data Frame} (Optional) Mutations in the desired y-axis order for the heatmap. 
#'                                     By default, mutations will be ordered based on their position in the genome.
#'                       (1) {String} "chr" - chromosome number
#'                       (2) {Number} "coord" - genomic coordinate
#' @param display_node_ids {Boolean} (Optional) Whether or not to display the single cell ID within the tree nodes. Default is FALSE.
#' @param width {Number} (Optional) Width of the plot.
#' @param height {Number} (Optional) Height of the plot.
#'
#' @export
cnvTree <- function(cnv_data = NULL, 
                    mut_data = NULL, 
                    tree_edges, 
                    sc_groups = NULL, 
                    sc_id_order = NULL, 
                    mut_order = NULL,
                    display_node_ids = FALSE, 
                    width = 800, 
                    height = 900) {

  # CHECK REQUIRED INPUTS ARE PRESENT 

  if (is.null(cnv_data) && is.null(mut_data)) {
    stop(paste("User must provide either copy number data (parameter cnv_data)",
      " or mutation data (parameter mut_data).",sep=""))
  }
  if (!is.null(cnv_data) && !is.null(mut_data)) {
    stop(paste("User can only provide copy number (parameter cnv_data) OR targeted mutations",
      " data (parameter mut_data), not both.", sep=""))
  }
  if (missing(tree_edges)) {
    stop("User must provide tree edge data (parameter tree_edges).")
  }

  # heatmap width (pixels)
  heatmapWidth <- (width/2) - 40 

  # MUTATION ORDER

  if (!is.null(mut_order)) {

    # check it's a data frame
    if (!is.data.frame(mut_order)) {
      stop("Mutation order data (parameter mut_order) must be a data frame.")
    }

    # ensure column names are correct
    if (!("chr" %in% colnames(mut_order)) ||
        !("coord" %in% colnames(mut_order))) {
      stop(paste("Mutation order data frame (parameter mut_order) must have the following column names: ", 
          "\"chr\", \"coord\"", sep=""))
    }

    # correct data types
    mut_order$chr <- as.character(mut_order$chr)
    mut_order$coord <- as.numeric(as.character(mut_order$coord))
  }

  # CNV DATA

  # CNV data is provided
  if (missing(mut_data)) {

    # set heatmap type
    heatmap_type <- "cnv"

    # check it's a data frame
    if (!is.data.frame(cnv_data)) {
      stop("CNV data (parameter cnv_data) must be a data frame.")
    }

    # ensure column names are correct
    if (!("single_cell_id" %in% colnames(cnv_data)) ||
        !("chr" %in% colnames(cnv_data)) ||
        !("start" %in% colnames(cnv_data)) ||
        !("end" %in% colnames(cnv_data)) ||
        !("integer_copy_number" %in% colnames(cnv_data))) {
      stop(paste("CNV data frame (parameter cnv_data) must have the following column names: ", 
          "\"single_cell_id\", \"chr\", \"start\", \"end\", \"integer_copy_number\"", sep=""))
    }

    # ensure data is of the correct type
    cnv_data$single_cell_id <- as.character(cnv_data$single_cell_id)
    cnv_data$chr <- as.character(cnv_data$chr)
    cnv_data$start <- as.numeric(as.character(cnv_data$start))
    cnv_data$end <- as.numeric(as.character(cnv_data$end))
    cnv_data$integer_copy_number <- as.numeric(as.character(cnv_data$integer_copy_number))

    # check that the number of single cells does not exceed the height of the plot
    n_scs <- length(unique(cnv_data$single_cell_id))
    if ((height - 45) < n_scs) { # - 45 for top bar height (30) and space between top bar and main view (15)
      stop(paste("The number of single cells (",n_scs,") cannot exceed the plot height minus 45px (",
        (height - 45),"). Either reduce the number of cells, or increase the plot height.",sep=""))
    }

    # get chromosomes, chromosome bounds (min & max bp), genome length
    chroms <- gtools::mixedsort(unique(cnv_data$chr))
    chrom_bounds <- getChromBounds(chroms, cnv_data) 
    genome_length <- getGenomeLength(chrom_bounds)

    # get cnv heatmap information for each cell
    n_bp_per_pixel <- getNBPPerPixel(heatmapWidth, chrom_bounds, genome_length) # number bps per pixel
    heatmap_info <- getCNVHeatmapForEachSC(cnv_data, chrom_bounds, n_bp_per_pixel)
    
    # get chromosome box information (chromosome legend)
    chrom_boxes <- getChromBoxInfo(chrom_bounds, n_bp_per_pixel)
  }

  # TARGETED MUTATIONS DATA

  # targeted mutations data is provided
  if (missing(cnv_data)) {

    # set heatmap type
    heatmap_type <- "targeted"

    # check it's a data frame
    if (!is.data.frame(mut_data)) {
      stop("Targeted mutations data (parameter mut_data) must be a data frame.")
    }

    # ensure column names are correct
    if (!("single_cell_id" %in% colnames(mut_data)) ||
        !("chr" %in% colnames(mut_data)) ||
        !("coord" %in% colnames(mut_data)) ||
        !("VAF" %in% colnames(mut_data))) {
      stop(paste("Targeted mutations data frame must have the following column names: ", 
          "\"single_cell_id\", \"chr\", \"coord\", \"VAF\"", sep=""))
    }

    # ensure data is of the correct type
    mut_data$single_cell_id <- as.character(mut_data$single_cell_id)
    mut_data$chr <- as.character(mut_data$chr)
    mut_data$coord <- as.numeric(as.character(mut_data$coord))
    mut_data$VAF <- as.numeric(as.character(mut_data$VAF))

    # get chromosomes
    chroms <- gtools::mixedsort(unique(mut_data$chr))

    # set chromosome bounds, genome length and chromosome box info to NULL (not needed for mutation data)
    chrom_bounds <- NULL
    genome_length <- NULL
    chrom_boxes <- NULL

    # heatmap information for each cell
    heatmap_info <- getTargetedHeatmapForEachSC(mut_data, mut_order, heatmapWidth)
  }

  # TREE EDGE DATA

  # check it's a data frame
  if (!is.data.frame(tree_edges)) {
    stop("Tree edges data (parameter tree_edges) must be a data frame.")
  }

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
  tree_nodes_for_layout <- data.frame(sc_id=unique_nodes, 
                                      index=(seq(1:length(unique_nodes)) - 1), 
                                      stringsAsFactors=FALSE)

  # list of tree edges for d3 phylogenetic layout function
  # note: for force-directed graph, we need the source/target to be the *index* of the tree node in the list of tree nodes
  tree_edges_for_layout <- data.frame(
    source=sapply(tree_edges$source, function(src) {return(which(tree_nodes_for_layout$sc_id == src) - 1) }),
    source_sc_id=tree_edges$source,
    target=sapply(tree_edges$target, function(trg) {return(which(tree_nodes_for_layout$sc_id == trg) - 1) }),
    target_sc_id=tree_edges$target,
    link_id=apply(tree_edges, 1, function(edge) { 
        return(paste("link_source_", edge["source"], "_target_", edge["target"], sep="")) 
      }),
    stringsAsFactors=FALSE)
  tree_edges_for_layout$source <- as.numeric(as.character(tree_edges_for_layout$source))
  tree_edges_for_layout$target <- as.numeric(as.character(tree_edges_for_layout$target))

  # get list of link ids
  link_ids <- tree_edges_for_layout$link_id

  # check for tree rootedness
  sources <- unique(tree_edges$source)
  targets <- unique(tree_edges$target)
  sources_for_iteration <- sources # because we will be changing the sources array over time
  for (i in 1:length(sources_for_iteration)) {
    cur_source <- sources_for_iteration[i]

    # if the source is a target, remove it from the sources list
    if (cur_source %in% targets) {
      sources <- sources[sources != cur_source]
    }
  }

  # if multiple roots are detected, throw error
  if (length(sources) > 1) {
    stop(paste("Multiple roots detected in tree (",paste(sources,collapse=", "),
      ") - tree must have only one root.",sep=""))
  }
  # otherwise, set the root
  else {
    root <- sources
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

  # GET SINGLE CELLS THAT ARE IN THE TREE BUT DON'T HAVE ASSOCIATED HEATMAP DATA
  scs_in_hm <- names(heatmap_info) # single cells in heatmap
  scs_in_tree <- unique(c(tree_edges$source, tree_edges$target))
  scs_missing_from_hm <- setdiff(scs_in_tree, scs_in_hm)

  # forward options using x
  x = list(
    hm_sc_ids_ordered=sc_id_order, # the single cells present in the heatmap
    sc_groups=sc_groups, # single cells and their associated group ids
    tree_edges=jsonlite::toJSON(tree_edges_for_layout), # tree edges for phylogeny
    tree_nodes=jsonlite::toJSON(tree_nodes_for_layout), # tree nodes for phylogeny
    link_ids=link_ids, # ids for all links in the phylogeny
    chroms=chroms, # chromosomes
    chrom_boxes=jsonlite::toJSON(chrom_boxes), # chromosome legend boxes
    heatmap_info=jsonlite::toJSON(heatmap_info), # heatmap information 
    heatmap_type=heatmap_type, # type of data in heatmap (cnv or targeted)
    heatmapWidth=heatmapWidth, # width of the heatmap
    root=root, # name of root
    display_node_ids=display_node_ids, # whether or not to display the node id labels on each node
    scs_missing_from_hm=scs_missing_from_hm # single cells in tree but not heatmap
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
getEmptyGrid <- function(hm_sc_ids_ordered, ncols) {
  sc_ids <- rep(hm_sc_ids_ordered, each=ncols)
  cols <- rep(seq(0:(ncols-1)), length(hm_sc_ids_ordered))

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
#' @param {Data Frame} chrom_bounds -- chromosome boundaries
#' @param {Integer} n_bp_per_pixel -- number of base pairs per pixel
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
getCNVHeatmapForEachSC <- function(cnv_data, chrom_bounds, n_bp_per_pixel) {

  # get the pixel start and end for each segment (account for chromosome separators in pixel info)
  heatmap_info <- cnv_data
  heatmap_info <- merge(cnv_data, chrom_bounds, by.x="chr", by.y="chrom")
  heatmap_info$start_px <- floor((heatmap_info$chrom_start + heatmap_info$start) / n_bp_per_pixel) + 2*(heatmap_info$chrom_index-1)
  heatmap_info$end_px <- floor((heatmap_info$chrom_start + heatmap_info$end) / n_bp_per_pixel) + 2*(heatmap_info$chrom_index-1)
  heatmap_info$px_width <- heatmap_info$end_px - heatmap_info$start_px + 1

  # note any segments whose start_px != end_px --> these will be the separated end pixels
  segment_ends_info <- heatmap_info[which(heatmap_info$start_px != heatmap_info$end_px),]

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
  singles <- heatmap_info[which(heatmap_info$start_px == heatmap_info$end_px),]
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
  colnames(consecutive_px_merged) <- c("sc_id", "cumsum_values", "px_width", "chr", "x", "gridCell_value")
  # rearrange columns
  consecutive_px_merged <- consecutive_px_merged[,c("sc_id","x","px_width","chr","gridCell_value","cumsum_values")]

  # separate pixels by single cell id
  consecutive_px_merged_split <- split(consecutive_px_merged , f = consecutive_px_merged$sc_id)

  return (consecutive_px_merged_split)
}


#' function to get targeted heatmap information 
#' @param {Data Frame} mut_data -- mutations data
#' @param {Data Frame} mut_order -- order of mutations for heatmap
#' @param {Number} heatmapWidth -- width of the heatmap (in pixels)
getTargetedHeatmapForEachSC <- function(mut_data, mut_order, heatmapWidth) {

  # sort mutations by single cell, genomic position
  heatmap_info <- mut_data
  heatmap_info$chr <- as.character(heatmap_info$chr)
  # prepend 0 to single-character chromosomes for natural sorting of chr
  heatmap_info$chr <- sapply(heatmap_info$chr, function(chr) {
      if (chr == "X" || chr == "x" || chr == "Y" || chr == "y") {
        return (chr)
      }
      else if (nchar(chr) == 1) {
        return (paste("0", chr, sep=""))
      }
      else {
        return (chr)
      }
    })
  heatmap_info <- dplyr::arrange(heatmap_info, single_cell_id, chr, coord)

  # get mutation site as one string
  heatmap_info$site <- paste(trimws(heatmap_info$chr), trimws(heatmap_info$coord), sep=":")

  # get all unique mutation sites (in order given by user, if provided)
  if (!is.null(mut_order)) {
    # check that all sites in mutation order df are given in mutation data, and vice versa
    mut_order_sites <- paste(trimws(mut_order$chr), trimws(mut_order$coord), sep=":")
    mut_data_sites <- heatmap_info$site
    sites_missing_from_mut_order <- setdiff(mut_data_sites, mut_order_sites) 
    sites_missing_from_mut_data <- setdiff(mut_order_sites, mut_data_sites)

    if (length(sites_missing_from_mut_order) > 0) {
      stop(paste("The following sites given in targeted mutations data frame (parameter mut_data)",
        " are missing from mutation order data frame (parameter mut_order): ("
        , paste(sites_missing_from_mut_order,collapse=", "), ").",sep=""))
    }
    if (length(sites_missing_from_mut_data) > 0) {
      stop(paste("The following sites given in mutation order data frame (parameter mut_order)",
        " are missing from targeted mutations data frame (parameter mut_data): ("
        , paste(sites_missing_from_mut_data,collapse=", "), ").",sep=""))
    }

    # note sites in order
    sites <- mut_order_sites
  }
  else {
    sites <- unique(heatmap_info$site)
  }
  n_sites <- length(sites)

  # check that the number of mutation sites does not exceed 1 pixel per mutation site
  if (heatmapWidth < n_sites) {
    stop(paste("The number of mutation sites (",n_sites,") cannot exceed the width of the plot (",
      heatmapWidth,"). Either reduce the number of mutation sites, or increase the plot width.",sep=""))
  }

  # heatmap cell width
  mut_width <- heatmapWidth/n_sites

  # attach heatmap cell x information and width information to each mutation
  heatmap_info$x <- sapply(heatmap_info$site, function(site) {
      # index of this site in the list of mutation sites
      index_of_site <- which(sites == site) - 1
      return(index_of_site * mut_width);
    })
  heatmap_info$px_width <- mut_width

  # colname sc_id not single_cell_id
  colnames(heatmap_info)[which(colnames(heatmap_info) == "single_cell_id")] <- "sc_id"
  colnames(heatmap_info)[which(colnames(heatmap_info) == "VAF")] <- "gridCell_value"

  # separate pixels by single cell id
  heatmap_info_split <- split(heatmap_info , f = heatmap_info$sc_id)

  return (heatmap_info_split)
}

# function to find the mode of a vector
#' @param {Vector} x -- vector of numbers
findMode <- function(x) {
  ux <- unique(x) # each unique value
  n_appearances <- tabulate(match(x, ux)) # number of appearances for each unique value
  return(list(mode=ux[which.max(n_appearances)], n_with_max=max(n_appearances)))
}
