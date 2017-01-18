#' CellScape
#'
#' \code{cellscape} explores single cell copy number profiles in the 
#'     context of a single cell phylogeny.
#' 
#' Interactive components:
#'   \enumerate{
#' 
#'     \item Mouseover any single cell in the phylogeny to view its 
#'     corresponding genomic profile in the heatmap, and vice versa.
#' 
#'     \item Mouseover any part of the heatmap to view the CNV or VAF 
#'     value for that copy number segment or mutation site, respectively. 
#' 
#'     \item Mouseover any branch of the phylogeny to view downstream 
#'     single cells, both in the phylogeny and heatmap. 
#' 
#'     \item Mouseover any clone to view its corresponding single cells 
#'     in the phylogeny and heatmap. 
#' 
#'     \item Click any node in the phylogeny to flip the order of its 
#'     descendant branches. 
#' 
#'     \item Use the selection tool in the tool bar to select single cell 
#'     genomic profiles and view their corresponding single cells in the 
#'     phylogeny. 
#' 
#'     \item Use the tree trimming tool in the tool bar to remove any
#'      branch of the phylogeny by clicking it. 
#' 
#'     \item Use the switch view tool in the tool bar to change the 
#'     phylogeny view from force-directed to unidirectional, and vice 
#'     versa. 
#' 
#'     \item Use the re-root phylogeny tool to root the phylogeny at a 
#'     clicked node. 
#' 
#'     \item Use the flip branch tool to vertically rotate any branch by 
#'     clicking its root node.
#' 
#'     \item If present, use the scale tree/graph tool in the tool bar to 
#'     scale the phylogeny by the provided edge distances. 
#' 
#'     \item If time-series information is present such that the TimeScape 
#'     is displayed below the CellScape, clones and time points are 
#'     interactively linked in both views on mouseover. 
#' 
#'     \item Click the download buttons to download a PNG or SVG of the view. 
#'
#'   }
#'
#' Note: 
#' 
#' See TimeScape repo (https://bitbucket.org/MO_BCCRC/timescape) for more 
#'     information about TimeScape. 
#'
#'   
#' @import htmlwidgets
#'
#' @param cnv_data \code{data.frame} (Required if mut_data not provided) 
#'     Single cell copy number segments data. Note that every single cell id
#'     must be present in the tree_edges data frame. Required columns are:
#'     \describe{
#'
#'       \item{single_cell_id:}{\code{character()} single cell id.}
#' 
#'       \item{chr:}{\code{character()} chromosome number.}
#' 
#'       \item{start:}{\code{numeric()} start position.}
#'
#'       \item{end:}{\code{numeric()} end position.}
#'
#'       \item{copy_number:}{\code{numeric()} copy number state.}
#'
#'     }
#' @param mut_data \code{data.frame} (Required if cnv_data not provided) 
#'     Single cell targeted mutation data frame. Note that every single cell id 
#'     must be present in the tree_edges data frame. Required columns are:
#'     \describe{
#'
#'       \item{single_cell_id:}{\code{character()} single cell id.}
#' 
#'       \item{chr:}{\code{character()} chromosome number.}
#' 
#'       \item{coord:}{\code{numeric()} genomic coordinate.}
#'
#'       \item{VAF:}{\code{numeric()} variant allele frequency [0, 1].}
#'
#'     }
#' @param mut_order \code{vector} (Optional) Mutation order for targeted 
#'     mutation heatmap (each mutation should consist of a string in the 
#'     form "chrom:coord"). Default will use a clustering function to 
#'     determine mutation order.
#' @param tree_edges \code{data.frame} Edges for the single cell phylogenetic 
#'     tree. Required columns are:
#'     \describe{
#'
#'       \item{source:}{\code{character()} edge source (single cell id).}
#' 
#'       \item{target:}{\code{character()} edge target (single cell id).}
#' 
#'     }
#'     Optional columns are:
#'     \describe{
#'
#'       \item{dist:}{\code{numeric()} edge distance.}
#' 
#'     }
#' @param gtype_tree_edges \code{data.frame} (Required for TimeScape) Genotype 
#'     tree edges of a rooted tree. Required columns are:
#'     \describe{
#'
#'       \item{source:}{\code{character()} source node id.}
#' 
#'       \item{target:}{\code{character()} target node id.}
#' 
#'     }
#' @param sc_annot \code{data.frame} (Required for TimeScape) Annotations 
#'     (genotype and sample id) for each single cell. Required columns are:
#'     \describe{
#'
#'       \item{single_cell_id:}{\code{character()} single cell id.}
#' 
#'       \item{genotype:}{\code{character()} genotype assignment.}
#' 
#'     }
#'     Optional columns are:
#'     \describe{
#'
#'       \item{timepoint:}{\code{character()} id of the sampled time point. 
#'           Note: time points will be ordered alphabetically. }
#' 
#'     }
#' @param clone_colours \code{data.frame} (Optional) Clone ids and their 
#'     corresponding colours (in hex format). Required columns are:
#'     \describe{
#'
#'       \item{clone_id:}{\code{character()} clone id.}
#' 
#'       \item{colour:}{\code{character()} the corresponding Hex colour 
#'          for each clone id.}
#'
#'     }
#' @param timepoint_title \code{character()} (Optional) Legend title for 
#'     timepoint groups. Default is "Timepoint".
#' @param clone_title \code{character()} (Optional) Legend title for clones. 
#'     Default is "Clone".
#' @param xaxis_title \code{character()} (Optional) For TimeScape - x-axis title. 
#'     Default is "Time Point".
#' @param yaxis_title \code{character()} (Optional) For TimeScape - y-axis title. 
#'     Default is "Clonal Prevalence".
#' @param phylogeny_title \code{character()} (Optional) For TimeScape - legend 
#'     phylogeny title. Default is "Clonal Phylogeny".
#' @param value_type \code{character()} (Optional) The type of value plotted in 
#'     heatmap - will affect legend and heatmap tooltips. Default is "VAF" for 
#'     mutation data, and "CNV" for copy number data.
#' @param node_type \code{character()} (Optional) The type of node plotted in 
#'     single cell phylogeny - will affect phylogeny tooltips. Default is "Cell".
#' @param display_node_ids \code{logical()} (Optional) Whether or not to display 
#'     the single cell ID within the tree nodes. Default is FALSE.
#' @param prop_of_clone_threshold \code{numeric()} (Optional) Used for the 
#'     ordering of targeted mutations. The minimum proportion of a clone to have 
#'     a mutation in order to consider the mutation as present within that clone. 
#'     Default is 0.2.
#' @param vaf_threshold \code{numeric()} (Optional) Used for the ordering of 
#'     targeted mutations. The minimum variant allele frequency for a mutation to 
#'     be considered as present within a single cell. Default is 0.05.
#' @param show_warnings \code{logical()} (Optional) Whether or not to show any 
#'     warnings. Default is TRUE.
#' @param width \code{numeric()} (Optional) Width of the plot.
#' @param height \code{numeric()} (Optional) Height of the plot.
#'
#' @export
#' @examples
#'
#'
#' library("cellscape")
#'
#' 
#' # EXAMPLE 1 - TARGETED MUTATION DATA
#'
#' # single cell tree edges
#' tree_edges <- read.csv(system.file("extdata", "targeted_tree_edges.csv", 
#'     package = "cellscape"))
#'
#' # targeted mutations
#' targeted_data <- read.csv(system.file("extdata", "targeted_muts.csv", 
#'     package = "cellscape"))
#'
#' # genotype tree edges
#' gtype_tree_edges <- data.frame("source"=c("Ancestral", "Ancestral", "B",
#'     "C", "D"), "target"=c("A", "B", "C", "D", "E"))
#'
#' # annotations
#' sc_annot <- read.csv(system.file("extdata", "targeted_annots.csv", 
#'     package = "cellscape"))
#'
#' # mutation order
#' mut_order <- scan(system.file("extdata", "targeted_mut_order.txt", 
#'     package = "cellscape"), what=character())
#'
#' # run cellscape
#' cellscape(mut_data=targeted_data, tree_edges=tree_edges, sc_annot = 
#'     sc_annot, gtype_tree_edges=gtype_tree_edges, mut_order=mut_order)
#'
#' 
#' # EXAMPLE 2 - COPY NUMBER DATA
#'
#' # single cell tree edges
#' tree_edges <- read.csv(system.file("extdata", "cnv_tree_edges.csv", 
#'     package = "cellscape"))
#'
#' # cnv segments data
#' cnv_data <- read.csv(system.file("extdata", "cnv_data.csv", package = 
#'     "cellscape"))
#'
#' # annotations
#' sc_annot <- read.csv(system.file("extdata", "cnv_annots.tsv", package = 
#'     "cellscape"), sep="\t")
#'
#' # custom clone colours
#' clone_colours <- data.frame( clone_id = c("1","2","3"), 
#'     colour = c("7fc97f", "beaed4", "fdc086"))
#'
#' # run cellscape
#' cellscape(cnv_data=cnv_data, tree_edges=tree_edges, sc_annot=sc_annot, 
#'     width=800, height=475, show_warnings=FALSE, 
#'     clone_colours = clone_colours)
cellscape <- function(cnv_data = NULL, 
                    mut_data = NULL, 
                    mut_order = NULL,
                    tree_edges, 
                    gtype_tree_edges = NULL,
                    sc_annot = NULL, 
                    clone_colours = "NA",
                    timepoint_title = "Timepoint",
                    clone_title = "Clone",
                    xaxis_title = "Time Point",
                    yaxis_title = "Clonal Prevalence",
                    phylogeny_title = "Clonal Phylogeny",
                    value_type = NULL,
                    node_type = "Cell",
                    display_node_ids = FALSE, 
                    prop_of_clone_threshold = 0.2,
                    vaf_threshold = 0.05,
                    show_warnings = TRUE,
                    width = 900, 
                    height = 800) {

  # CHECK REQUIRED INPUTS ARE PRESENT 

  if (is.null(cnv_data) && is.null(mut_data)) {
    stop("User must provide either copy number data (parameter cnv_data)",
      " or mutation data (parameter mut_data).")
  }
  if (!is.null(cnv_data) && !is.null(mut_data)) {
    stop("User can only provide copy number (parameter cnv_data) OR targeted mutations",
      " data (parameter mut_data), not both.")
  }
  if (missing(tree_edges)) {
    stop("User must provide tree edge data (parameter tree_edges).")
  }

  # heatmap width (pixels)
  heatmapWidth <- (width/2) 

  # CLONE COLOURS

  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\"")
    }
  }

  # GENOTYPE TREE EDGES
  if (!missing(gtype_tree_edges)) {

    # check genotype tree inputs

    gtype_tree_edges <- checkTreeEdges(gtype_tree_edges)

    # check that all genotypes in the annotations data are present in the genotype tree
    if (!missing(sc_annot)) {
      gtype_tree_gtypes <- unique(c(gtype_tree_edges$source, gtype_tree_edges$target))
      sc_annot_gtypes <- unique(sc_annot$genotype)
      gtypes_missing_from_gtype_tree <- setdiff(sc_annot_gtypes, gtype_tree_gtypes)
      if (length(gtypes_missing_from_gtype_tree) > 0) {
        stop("The following clone ID(s) are present in the single cell annotations data but ",
          "are missing from the genotype tree edges data: ",
          paste(gtypes_missing_from_gtype_tree, collapse=", "), ".")
      }
    }

    # get root of tree

    sources <- unique(gtype_tree_edges$source)
    targets <- unique(gtype_tree_edges$target)
    sources_for_iteration <- sources # because we will be changing the sources array over time
    for (i in 1:length(sources_for_iteration)) {
      cur_source <- sources_for_iteration[i]

      # if the source is a target, remove it from the sources list
      if (cur_source %in% targets) {
        sources <- sources[sources != cur_source]
      }
    }
    cur_root <- sources[1]

    # GET GENOTYPE TREE DFS

    dfs_gtype_tree <- dfs_tree(gtype_tree_edges, cur_root, c())
  }
  else {
    dfs_gtype_tree <- NULL
  }

  # VALUE TITLE (title for heatmap value legend)

  # not specified by user
  if (is.null(value_type)) {
    if (missing(mut_data)) {
      value_type <- "CNV"
    }
    else {
      value_type <- "VAF"
    }
  }
  # specified by user
  else {
    value_type <- as.character(value_type)
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
        !("copy_number" %in% colnames(cnv_data))) {
      stop("CNV data frame (parameter cnv_data) must have the following column names: ", 
          "\"single_cell_id\", \"chr\", \"start\", \"end\", \"copy_number\"")
    }

    # ensure data is of the correct type
    cnv_data$single_cell_id <- as.character(cnv_data$single_cell_id)
    cnv_data$chr <- as.character(cnv_data$chr)
    cnv_data$start <- as.numeric(as.character(cnv_data$start))
    cnv_data$end <- as.numeric(as.character(cnv_data$end))
    cnv_data$copy_number <- as.numeric(as.character(cnv_data$copy_number))

    # change "23" to "X", "24" to "Y"
    cnv_data$chr[which(cnv_data$chr == "23")] <- "X"
    cnv_data$chr[which(cnv_data$chr == "24")] <- "Y"

    # determine whether the data is discrete or continuous
    cnvs_without_nas <- na.omit(cnv_data$copy_number)
    continuous_cnv <- !all(cnvs_without_nas == floor(cnvs_without_nas))

    # check that the number of single cells does not exceed the height of the plot
    n_scs <- length(unique(cnv_data$single_cell_id))
    if ((height - 45) < n_scs) { # - 45 for top bar height (30) and space between top bar and main view (15)
      stop("The number of single cells (",n_scs,") cannot exceed the plot height minus 45px (",
        (height - 45),"). Either reduce the number of cells, or increase the plot height.")
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
      stop("Targeted mutations data frame must have the following column names: ", 
          "\"single_cell_id\", \"chr\", \"coord\", \"VAF\"")
    }

    # ensure data is of the correct type
    mut_data$single_cell_id <- as.character(mut_data$single_cell_id)
    mut_data$chr <- as.character(mut_data$chr)
    mut_data$coord <- as.numeric(as.character(mut_data$coord))
    mut_data$VAF <- as.numeric(as.character(mut_data$VAF))

    # change "23" to "X", "24" to "Y"
    mut_data$chr[which(mut_data$chr == "23")] <- "X"
    mut_data$chr[which(mut_data$chr == "24")] <- "Y"

    # get site name for each mutation
    mut_data$site <- paste(trimws(mut_data$chr), trimws(mut_data$coord), sep=":")

    # ensure VAF is between 0 and 1
    if (length(which(mut_data$VAF < 0)) > 0) {
      stop("You have entered mutation data with VAF < 0. Only enter data between 0 and 1 (NA is ok).")
    }
    if (length(which(mut_data$VAF > 1)) > 0) {
      stop("You have entered mutation data with VAF > 1. Only enter data between 0 and 1 (NA is ok).")
    }

    # set continuous cnv to false (we're now using VAF data that is always continuous)
    continuous_cnv <- FALSE

    # get chromosomes
    chroms <- gtools::mixedsort(unique(mut_data$chr))

    # set chromosome bounds, genome length and chromosome box info to NULL (not needed for mutation data)
    chrom_bounds <- NULL
    genome_length <- NULL
    chrom_boxes <- NULL

    # if the user has provided the mutation order, check it includes all existing mutations
    if (!is.null(mut_order)) {
      sites <- unique(mut_data$site)
      sites_missing_from_mut_order <- setdiff(sites, mut_order)
      if (length(sites_missing_from_mut_order) > 0) {
        stop("The following mutation(s) are present in the targeted mutation data but ",
            "are missing from the mutation order data: ",
            paste(sites_missing_from_mut_order, collapse=", "), 
            ". All mutation sites must be present in the mutation order data.")
      }
      sites_extra_in_mut_order <- setdiff(mut_order, sites)
      if (length(sites_extra_in_mut_order) > 0) {
        if (show_warnings) {
          print(paste("WARNING: The following mutation(s) are present in the mutation order data but ",
              "are missing from the targeted mutation data: ",
              paste(sites_extra_in_mut_order, collapse=", "), ". They will have no effect on the visualization.", sep=""))
        }

        # remove these excess sites from the mut_order data
        mut_order <- setdiff(sites, sites_extra_in_mut_order)
      }
    }
    # if user has NOT provided mutation order BUT
    # if there is genotype tree data and genotype annotations for the cells,
    # calculate mutation order using this information
    else if (!is.null(gtype_tree_edges) && 
          !is.null(sc_annot) && 
          ("genotype" %in% colnames(sc_annot))) {

      # GET MUTATION GENOTYPES IN PLOTTING ORDER (e.g. ABCD, ABC, AB, A, BCD, BC, B, CD, C, D)
      # ie. each mutation will be plotted according to which genotypes have the mutation, and the mutations
      # in genotypes A, B, C and D will be plotted first, followed by those only in A, B and C, followed by....

      mut_gtypes <- c()
      for (i in 1:length(dfs_gtype_tree)) {
        for (j in length(dfs_gtype_tree):1) {
          mut_gtypes <- append(mut_gtypes, paste(dfs_gtype_tree[i:j], collapse=""))
          if (i == j) {
            break
          }
          else { 
            if ((j-i) > 2) { # if there is more than one letter between i and j
              # add internal letters in all other non-linear combinations (but still in order)
              for (count in (j-i-2):1) { # for each length of internal letters to add
                combos <- combn(dfs_gtype_tree[(i+1):(j-1)], count)
                for (combo_i in 1:ncol(combos)) {
                  combo_i_pasted <- paste(combos[,combo_i], collapse="")
                  mut_gtypes <- append(mut_gtypes, paste(dfs_gtype_tree[i], combo_i_pasted, dfs_gtype_tree[j], sep=""))
                }
              }
            }
            # concatenate first and last genotype together
            if ((j-i) >= 2) {
              mut_gtypes <- append(mut_gtypes, paste(dfs_gtype_tree[i], dfs_gtype_tree[j], sep=""))
            }
          }
        }
      }


      # GET GENOTYPES FOR EACH TARGETED MUTATION 

      cur_mut_data <- mut_data

      # take care of NA and Inf VAF values
      cur_mut_data$VAF[which(is.na(cur_mut_data$VAF))] <- NA
      cur_mut_data$VAF[which(is.infinite(cur_mut_data$VAF))] <- NA

      # add genotypes to mutation data
      mut_data_w_gtypes <- merge(cur_mut_data, sc_annot, by="single_cell_id")

      # get average VAF for each [site X genotype] combination
      mut_data_grouped <- dplyr::group_by(mut_data_w_gtypes, site, genotype)
      mut_data_grouped_avg_VAF <- dplyr::summarise(mut_data_grouped, 
        avg_VAF=sum(VAF, na.rm=TRUE)/length(VAF),
        n = n(),
        n_gt = sum(VAF > vaf_threshold, na.rm=TRUE),
        p_gt = n_gt / n)
      mut_data_grouped_avg_VAF <- as.data.frame(mut_data_grouped_avg_VAF)
      # print("mut_data_grouped_avg_VAF")
      # print(mut_data_grouped_avg_VAF)

      # keep only those [site X genotype] combinations where the average vaf is greater than the threshold
      # and present in more than a certain percentage of cells with that genotype
      mut_data_grouped_avg_VAF <- mut_data_grouped_avg_VAF[which(mut_data_grouped_avg_VAF$avg_VAF > vaf_threshold), ]
      mut_data_grouped_avg_VAF <- mut_data_grouped_avg_VAF[which(mut_data_grouped_avg_VAF$p_gt > prop_of_clone_threshold), ]

      # for each mutation, paste the genotypes together
      site_gtype_split_by_site <- split(mut_data_grouped_avg_VAF , f = mut_data_grouped_avg_VAF$site)
      site_gtype_list <- lapply(site_gtype_split_by_site, function(site) { 
        cur_gtypes <- as.character(site$genotype)
        cur_sorted_gtypes <- cur_gtypes[order(match(cur_gtypes,dfs_gtype_tree))]
        collapsed_gtypes <- paste(cur_sorted_gtypes, collapse="")
        return(collapsed_gtypes)
      })
      site_gtype_df <- do.call(rbind.data.frame, site_gtype_list)
      colnames(site_gtype_df) <- c("gtypes")
      site_gtype_df$site <- rownames(site_gtype_df)

      # order mutation sites by average VAF 
      cur_data_grouped_by_site <- dplyr::group_by(cur_mut_data, site)
      mut_site_avg <- dplyr::summarise(cur_data_grouped_by_site, avg_VAF=sum(VAF, na.rm=TRUE)/length(VAF)) 
      site_gtype_df <- merge(site_gtype_df, mut_site_avg, by="site")
      site_gtype_df <- site_gtype_df[rev(order(site_gtype_df$avg_VAF)),]

      # ORDER MUTATIONS BY WHICH GENOTYPES THEY APPEAR IN

      site_gtype_df <- site_gtype_df[order(match(site_gtype_df$gtypes, mut_gtypes)),]
      mut_order <- site_gtype_df$site

      # print("site_gtype_df")
      # print(site_gtype_df)

      # append any mutations that have all low prevalence data, and thus not accounted for yet
      low_prev_muts <- setdiff(unique(cur_mut_data$site), mut_order)
      mut_order <- append(mut_order, low_prev_muts)
    }

    # no mutation order and no genotype tree info
    else {
      mut_order <- getMutOrder(mut_data)
    }
    
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
    stop("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\"")
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)
  if ("dist" %in% colnames(tree_edges)) {
    tree_edges$dist <- as.numeric(as.character(tree_edges$dist))
    distances_provided <- TRUE

    # if there are negative distances, convert them to 0.01
    negative_dists <- tree_edges$dist[which(tree_edges$dist < 0)]
    if (length(negative_dists) > 0) {
      value_for_neg_dists <- 0.1
      if (show_warnings) {
        print(paste("WARNING: Negative distances found in tree edges data frame. Any negative distance will be ",
          "converted to ", value_for_neg_dists, ".", sep=""))
      }
      tree_edges$dist[which(tree_edges$dist < 0)] <- value_for_neg_dists
    }
  }
  else {
    tree_edges$dist <- NaN
    distances_provided <- FALSE
  }

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
    dist=tree_edges$dist,
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
    stop("Multiple roots detected in tree (",paste(sources,collapse=", "),
      ") - tree must have only one root.")
  }
  # otherwise, set the root
  else {
    root <- sources
  }

  # GET SINGLE CELLS THAT ARE IN THE TREE BUT DON'T HAVE ASSOCIATED HEATMAP DATA
  scs_in_hm <- names(heatmap_info) # single cells in heatmap
  scs_in_tree <- unique(c(tree_edges$source, tree_edges$target))
  scs_missing_from_hm <- setdiff(scs_in_tree, scs_in_hm)

  # ENSURE ALL SINGLE CELLS IN THE CNV DATA ARE IN THE TREE EDGES DATA
  scs_missing_from_tree <- setdiff(scs_in_hm, scs_in_tree)
  if (length(scs_missing_from_tree) > 0) {
    if (is.null(cnv_data)) {
      data_type <- "mutations"
    }
    else {
      data_type <- "cnv"
    }
    if (show_warnings) {
      print(paste("WARNING: The following single cell ID(s) are present in the ", data_type, " data but ",
          "are missing from the tree edges data: ",
          paste(scs_missing_from_tree, collapse=", "), 
          ". They will not be shown in the visualization.", sep=""))
    }
  }

  # SINGLE CELL GROUPS
  if (!is.null(sc_annot)) {
    # ensure column names are correct
    if (!("single_cell_id" %in% colnames(sc_annot)) ||
        !("genotype" %in% colnames(sc_annot))) {
      stop("Single cell group assignment data frame must have the following column names: ", 
          "\"single_cell_id\", \"genotype\"")
    }

    # ensure data is of the correct type
    sc_annot$single_cell_id <- as.character(sc_annot$single_cell_id)
    sc_annot$genotype <- as.character(sc_annot$genotype)
    if ("timepoint" %in% colnames(sc_annot)) {
      sc_annot$timepoint <- as.character(sc_annot$timepoint)
    }

    # ensure that at least one single cell in the tree has annotations
    scs_in_tree <- unique(c(tree_edges$source, tree_edges$target))
    scs_in_annots <- unique(sc_annot$single_cell_id)
    scs_in_tree_and_annots <- intersect(scs_in_tree, scs_in_annots)
    if (length(scs_in_tree_and_annots) == 0) {
      stop("The annotations parameter (sc_annots) has been used, but none of the single cells in the phylogeny have annotations.")
    }

    # remove all single cells that are not in the tree
    scs_in_groups <- unique(sc_annot$single_cell_id)
    scs_missing_from_tree <- setdiff(scs_in_groups,scs_in_tree)
    sc_annot <- sc_annot[which(!(sc_annot$single_cell_id %in% scs_missing_from_tree)),]

    # to JSON
    sc_annot_JSON <- jsonlite::toJSON(sc_annot)

    # note that annotations are provided
    sc_annot_provided <- TRUE
  }
  else {
    sc_annot_JSON <- sc_annot

    # note that annotations are NOT provided
    sc_annot_provided <- FALSE
  }

  # IF ALL NECESSARY PRAMETERS ARE PRESENT FOR TIMESCAPE
  if (!is.null(gtype_tree_edges) && 
      !is.null(sc_annot) && 
      ("timepoint" %in% colnames(sc_annot)) &&
      ("genotype" %in% colnames(sc_annot))) {

    # ensure correct type of genotype tree edge data

    gtype_tree_edges$source <- as.character(gtype_tree_edges$source)
    gtype_tree_edges$target <- as.character(gtype_tree_edges$target)

    # ENSURE THAT ALL GENOTYPES ARE PRESENT IN THE TREE

    gtypes_in_gtype_tree <- unique(c(gtype_tree_edges$source, gtype_tree_edges$target))
    gtypes_in_annots <- unique(sc_annot$genotype)
    gtypes_missing_from_tree <- setdiff(gtypes_in_annots, gtypes_in_gtype_tree)
    if (length(gtypes_missing_from_tree) > 0) {
      stop("The following genotype(s) are present in the single cell annotations data but ",
          "are missing from the genotype tree: ",
          paste(gtypes_missing_from_tree, collapse=", "), 
          ". All genotypes must be present in the genotype tree data.")
    }


    # CALCULATE CLONAL PREVALENCE FOR EACH SAMPLE

    # number of cells with each sample id
    annots_gb_tp <- dplyr::group_by(sc_annot, timepoint)
    samples <- dplyr::summarise(annots_gb_tp, n_in_sample = length(single_cell_id))

    # number of cells with each unique sample id, genotype combination
    annots_gb_tp_gtype <- dplyr::group_by(sc_annot, timepoint, genotype)
    genotypes_and_samples <- dplyr::summarise(annots_gb_tp_gtype, n = length(single_cell_id))

    # get clonal prevalence
    clonal_prev <- merge(samples, genotypes_and_samples, by=c("timepoint"), all.y=TRUE)
    clonal_prev$clonal_prev <- clonal_prev$n/clonal_prev$n_in_sample

    # rename columns
    colnames(clonal_prev)[which(colnames(clonal_prev) == "timepoint")] <- "timepoint"
    colnames(clonal_prev)[which(colnames(clonal_prev) == "genotype")] <- "clone_id"


    # GET INFORMATION FOR TIMESCAPE

    timescape_wanted <- TRUE
    mutations <- "NA"
    alpha <- 50 
    genotype_position <- "stack" 
    perturbations <- "NA" 
    sort <- FALSE 
    show_warnings <- TRUE

    timescape_userParams <- processUserData(clonal_prev, 
                                            gtype_tree_edges, 
                                            mutations,
                                            clone_colours, 
                                            as.character(xaxis_title), 
                                            as.character(yaxis_title), 
                                            as.character(phylogeny_title),
                                            alpha, 
                                            genotype_position, 
                                            perturbations, 
                                            sort, 
                                            show_warnings,
                                            width, 
                                            height)
  }
  else {
    timescape_userParams <- list()
    timescape_wanted <- FALSE
  }

  # forward options using x
  cellscape_userParams <- list(
    clone_cols = jsonlite::toJSON(clone_colours), # clone colours
    sc_annot=sc_annot_JSON, # single cells and their associated group ids
    sc_annot_provided=sc_annot_provided, # whether or not single cell annotations are provided by the user
    sc_tree_edges=jsonlite::toJSON(tree_edges_for_layout), # tree edges for phylogeny
    sc_tree_nodes=jsonlite::toJSON(tree_nodes_for_layout), # tree nodes for phylogeny
    link_ids=link_ids, # ids for all links in the phylogeny
    distances_provided=distances_provided, # whether or not distances are provided for tree edges
    chroms=chroms, # chromosomes
    chrom_boxes=jsonlite::toJSON(chrom_boxes), # chromosome legend boxes
    heatmap_info=jsonlite::toJSON(heatmap_info), # heatmap information 
    heatmap_type=heatmap_type, # type of data in heatmap (cnv or targeted)
    heatmapWidth=heatmapWidth, # width of the heatmap
    value_type=value_type, # type of value in the heatmap
    node_type=node_type, # type of node in single cell phylogeny
    timepoint_title=as.character(timepoint_title), # legend title for timepoints
    clone_title=as.character(clone_title), # legend title for timepoints
    root=root, # name of root
    display_node_ids=display_node_ids, # whether or not to display the node id labels on each node
    scs_missing_from_hm=scs_missing_from_hm, # single cells in tree but not heatmap
    continuous_cnv=continuous_cnv, # whether copy number data should be continuous or discrete
    timescape_wanted=timescape_wanted # type of time/space view provided (NULL, "time", or "space")
  )
  x = append(cellscape_userParams, timescape_userParams)

  # create widget
  htmlwidgets::createWidget(
    name = 'cellscape',
    x,
    width = width,
    height = height,
    package = 'cellscape'
  )
}

#' Get depth first search of a tree
#' @param edges -- edges of tree
#' @param cur_root -- current root of the tree
#' @param dfs_arr -- array of depth first search results to be filled
#' @export
#' @rdname helpers
#' @examples
#' dfs_tree(data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")), "1", c())
dfs_tree <- function(edges, cur_root, dfs_arr) {
  if (!is.null(cur_root)) {
    # add this root to the dfs list of nodes
    dfs_arr <- append(dfs_arr, cur_root)

    # get children of this root
    cur_children <- edges[which(edges$source == cur_root),"target"]
    for (cur_child in cur_children) {
      cur_root <- cur_child
      dfs_arr <- dfs_tree(edges, cur_root, dfs_arr)
    }
  }
  return(dfs_arr)
}

#' Widget output function for use in Shiny
#'
#' @param outputId -- id of output
#' @param width -- width of output
#' @param height -- height of output
#' @examples
#' cellscapeOutput(1, '100%', '300px')
#' cellscapeOutput(1, '80%', '300px')
#' @export
#' @rdname helpers
cellscapeOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'cellscape', width, height, package = 'cellscape')
}

#' Widget render function for use in Shiny
#'
#' @param expr -- expression for Shiny
#' @param env -- environment for Shiny
#' @param quoted -- default is FALSE 
#' @export
#' @rdname helpers
renderCnvTree <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, cellscapeOutput, env, quoted = TRUE)
}

# CNVTREE HELPERS

#' Function to get data frame of pixels
#' @param hm_sc_ids_ordered -- array of single cell ids in order
#' @param ncols -- number of columns in heatmap/grid
#' @rdname helpers
getEmptyGrid <- function(hm_sc_ids_ordered, ncols) {
  sc_ids <- rep(hm_sc_ids_ordered, each=ncols)
  cols <- rep(seq(0:(ncols-1)), length(hm_sc_ids_ordered))

  return(data.frame(col=cols, sc_id=sc_ids, stringsAsFactors=FALSE))
}

#' function to get min and max values for each chromosome
#' @param chroms -- vector of chromosome names
#' @param cnv_data -- copy number data
#' @rdname helpers
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
#' @param chrom_bounds -- data frame of chromosome boundaries
#' @param n_bp_per_pixel -- integer of number of base pairs per pixel
#' @rdname helpers
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
#' @param chrom_bounds -- data frame of chromosome boundaries
#' @rdname helpers
getGenomeLength <- function(chrom_bounds) {

  tmp_chrom_bounds <- chrom_bounds
  tmp_chrom_bounds$n_bps <- tmp_chrom_bounds$bp_end - tmp_chrom_bounds$bp_start + 1
  genome_length <- sum(tmp_chrom_bounds$n_bps)

  return(genome_length)
}

#' function to get the number of base pairs per pixel
#' @param ncols --  integer of number of columns (pixels) to fill
#' @param chrom_bounds --  data frame of chromosome boundaries
#' @param genome_length --  integer of length of the genome
#' @rdname helpers
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
#' @param cnv_data -- data frame of copy number variant segments data
#' @param chrom_bounds -- data frame of chromosome boundaries
#' @param n_bp_per_pixel -- integer of number of base pairs per pixel
#' @rdname helpers
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
  middles <- segs_gt_2[,c("single_cell_id", "start_px", "px_width", "copy_number", "chr", "chrom_index")]
  colnames(middles)[which(colnames(middles) == "start_px")] <- "px"
  colnames(middles)[which(colnames(middles) == "copy_number")] <- "mode_cnv"
  middles$px <- middles$px + 1 # first pixel will be a start pixel, so we shift 1

  # note any segments that occupy one pixel only
  singles <- heatmap_info[which(heatmap_info$start_px == heatmap_info$end_px),]
  colnames(singles)[which(colnames(singles) == "end_px")] <- "px"
  singles <- singles[ , !(names(singles) %in% c("start_px"))] # drop start_px column

  # bind starts, ends, and singles
  starts_ends_singles <- rbind(starts, ends, singles)

  # find the mode cnv of all starts, ends, and singles
  starts_ends_singles_grouped <- dplyr::group_by(starts_ends_singles, single_cell_id, px, px_width, chr, chrom_index)
  starts_ends_singles_w_mode <- dplyr::summarise(starts_ends_singles_grouped, mode_cnv=findMode(copy_number)[["mode"]])
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

#' function to get mutation order for targeted data
#' @param mut_data -- data frame of mutations data
#' @rdname helpers
getMutOrder <- function(mut_data) {
  separator <- ":"

  cur_data <- mut_data

  # group data by mutation site
  cur_data$VAF_rounded <- cur_data$VAF
  cur_data$VAF_rounded[which(cur_data$VAF_rounded < 0.05)] <- -10
  cur_data$VAF_rounded[which(cur_data$VAF_rounded >= 0.95)] <- 1
  cur_data$VAF_rounded[which(cur_data$VAF_rounded >= 0.05 & cur_data$VAF_rounded < 0.95)] <- 0.5
  cur_data$VAF_rounded[which(is.na(cur_data$VAF_rounded))] <- 0
  cur_data$VAF_rounded[which(is.infinite(cur_data$VAF_rounded))] <- 0

  # group data by mutation site -- get only site, rounded VAF and single cell id
  cur_data_for_mat <- cur_data[,c("site", "single_cell_id", "VAF_rounded")]

  # get a data frame of sites X single cell ID, containing rounded VAF
  mat <- reshape2::dcast(cur_data_for_mat, site ~ single_cell_id, value.var="VAF_rounded")
  rownames(mat) <- mat$site # set rownames to site names
  mat <- mat[, -which(colnames(mat) == "site")] # remove site column

  # hierarchically cluster mutations
  mut_dists <- dist(mat, method="euclidean")
  mut_clust <- hclust(mut_dists, method='complete')

  # get the order of hierarchically clustered mutations
  mut_order <- rownames(mat)[mut_clust$order]

  # get average VAF for each site
  cur_data_grouped_by_site <- dplyr::group_by(cur_data, site)
  mut_site_avg <- dplyr::summarise(cur_data_grouped_by_site, avg_VAF=sum(VAF, na.rm=TRUE)/length(VAF))

  # order average mutation VAFs by the order of mutations calculated by hierarchical clustering
  mut_site_avg_ordered <- mut_site_avg[match(mut_order, mut_site_avg$site),]

  # find slope of the ordered sites' VAFs
  model <- lm(formula = seq(1, nrow(mut_site_avg_ordered)) ~ mut_site_avg_ordered$avg_VAF, x=TRUE, y=TRUE, na.action=na.omit)
  slope <- coef(model)["mut_site_avg_ordered$avg_VAF"]

  # if the mutation VAFs are generally increasing, reverse order
  if (slope > 0) {
    return(rev(mut_order))
  }
  else {
    return(mut_order)
  }
}

#' function to get targeted heatmap information 
#' @param mut_data -- data frame of mutations data
#' @param mut_order -- array of order of mutations for heatmap (chromosome:coordinate)
#' @param heatmapWidth -- number for width of the heatmap (in pixels)
#' @rdname helpers
getTargetedHeatmapForEachSC <- function(mut_data, mut_order, heatmapWidth) {

  # sort mutations by single cell, genomic position
  heatmap_info <- mut_data
  heatmap_info$chr <- as.character(heatmap_info$chr)
  heatmap_info <- dplyr::arrange(heatmap_info, single_cell_id, chr, coord)

  # get mutation site as one string
  heatmap_info$site <- paste(trimws(heatmap_info$chr), trimws(heatmap_info$coord), sep=":")

  # get the number of sites
  n_sites <- length(unique(mut_order))

  # check that the number of mutation sites does not exceed 1 pixel per mutation site
  if (heatmapWidth < n_sites) {
    stop("The number of mutation sites (",n_sites,") cannot exceed the width of the plot (",
      heatmapWidth,"). Either reduce the number of mutation sites, or increase the plot width.")
  }

  # heatmap cell width
  mut_width <- heatmapWidth/n_sites

  # attach heatmap cell x information and width information to each mutation
  heatmap_info$x <- sapply(heatmap_info$site, function(site) {
      # index of this site in the list of mutation sites
      index_of_site <- which(mut_order == site) - 1
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

#' function to find the mode of a vector
#' @param x -- vector of numbers
#' @examples
#' findMode(c(1,1,19,1))
#' @export
#' @rdname helpers
findMode <- function(x) {
  ux <- unique(x) # each unique value
  n_appearances <- tabulate(match(x, ux)) # number of appearances for each unique value
  return(list(mode=ux[which.max(n_appearances)], n_with_max=max(n_appearances)))
}


# TIMESCAPE HELPERS

#' Function to process the user data
#' @param clonal_prev -- data frame of Clonal prevalence. Note: timepoints will be alphanumerically sorted in the view.
#'   Format: columns are (1) character() "timepoint" - time point
#'                       (2) character() "clone_id" - clone id
#'                       (3) numeric() "clonal_prev" - clonal prevalence.
#' @param tree_edges -- data frame of Tree edges of a rooted tree.
#'   Format: columns are (1) character() "source" - source node id
#'                       (2) character() "target" - target node id.
#' @param mutations -- data frame (Optional) of Mutations occurring at each clone. Any additional field will be shown in the mutation table.
#'   Format: columns are (1) character() "chrom" - chromosome number
#'                       (2) numeric() "coord" - coordinate of mutation on chromosome
#'                       (3) character() "clone_id" - clone id
#'                       (4) character() "timepoint" - time point
#'                       (5) numeric() "VAF" - variant allele frequency of the mutation in the corresponding timepoint. 
#' @param clone_colours -- data frame (Optional) of Clone ids and their corresponding colours 
#'   Format: columns are (1) character() "clone_id" - the clone ids
#'                       (2) character() "colour" - the corresponding Hex colour for each clone id.
#' @param xaxis_title -- String (Optional) of x-axis title. Default is "Time Point".
#' @param yaxis_title -- String (Optional) of y-axis title. Default is "Clonal Prevalence".
#' @param phylogeny_title -- String (Optional) of Legend phylogeny title. Default is "Clonal Phylogeny".
#' @param alpha -- Number (Optional) of Alpha value for sweeps, range [0, 100].
#' @param genotype_position -- String (Optional) of How to position the genotypes from ["centre", "stack", "space"] 
#'   "centre" -- genotypes are centred with respect to their ancestors
#'   "stack" -- genotypes are stacked such that no genotype is split at any time point
#'   "space" -- genotypes are stacked but with a bit of spacing at the bottom
#' @param perturbations -- data frame (Optional) of any perturbations that occurred between two time points, 
#'   and the fraction of total tumour content remaining.
#'   Format: columns are (1) character() "pert_name" - the perturbation name
#'                       (2) character() "prev_tp" - the time point (as labelled in clonal prevalence data) 
#'                                                BEFORE perturbation
#'                       (3) numeric() "frac" - the fraction of total tumour content remaining at the 
#'                                             time of perturbation, range [0, 1].
#' @param sort -- Boolean (Optional) of whether (TRUE) or not (FALSE) to vertically sort the genotypes by their emergence values (descending). 
#'                       Default is FALSE. 
#'                       Note that genotype sorting will always retain the phylogenetic hierarchy, and this parameter will only affect the ordering of siblings.
#' @param show_warnings -- Boolean (Optional) of  Whether or not to show any warnings. Default is TRUE.
#' @param width -- Number (Optional) of width of the plot. Minimum width is 450.
#' @param height -- Number (Optional) of height of the plot. Minimum height with and without mutations is 500 and 260, respectively. 
#' @rdname helpers
processUserData <- function(clonal_prev, 
                      tree_edges, 
                      mutations,
                      clone_colours, 
                      xaxis_title, 
                      yaxis_title, 
                      phylogeny_title,
                      alpha, 
                      genotype_position, 
                      perturbations, 
                      sort, 
                      show_warnings,
                      width, 
                      height) {

  # ENSURE MINIMUM DIMENSIONS SATISFIED
  checkMinDims(mutations, height, width)

  # CHECK REQUIRED INPUTS ARE PRESENT
  checkRequiredInputs(clonal_prev, tree_edges)

  # ALPHA VALUE
  checkAlpha(alpha)

  # SORTED GENOTYPES
  if (!is.logical(sort)) {
    stop("Sort parameter must be a boolean.")
  }

  # CLONAL PREVALENCE DATA
  clonal_prev <- checkClonalPrev(clonal_prev)

  # TREE EDGES DATA
  tree_edges <- checkTreeEdges(tree_edges)

  # GENOTYPE POSITIONING
  checkGtypePositioning(genotype_position)

  # CHECK CLONE COLOURS
  checkCloneColours(clone_colours) 

  # CHECK PERTURBATIONS
  perturbations <- checkPerts(perturbations)

  # MUTATIONS DATA
  mut_data <- getMutationsData(mutations, tree_edges, clonal_prev)
  mutation_info <- mut_data$mutation_info
  mutation_prevalences <- mut_data$mutation_prevalences
  if (is.data.frame(mutations)) {
    mutations_provided <- TRUE
  }
  else {
    mutations_provided <- FALSE
  }

  # REPLACE SPACES WITH UNDERSCORES
  spaces_replaced <- replaceSpaces(clonal_prev, tree_edges, clone_colours, mutation_info, mutations, mutation_prevalences)
  timepoint_map <- spaces_replaced$timepoint_map 
  clone_id_map <- spaces_replaced$clone_id_map 
  clonal_prev <- spaces_replaced$clonal_prev 
  tree_edges <- spaces_replaced$tree_edges
  mutation_info <- spaces_replaced$mutation_info
  clone_colours <- spaces_replaced$clone_colours
  mutation_prevalences <- spaces_replaced$mutation_prevalences

  # forward options using x
  return(list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    gtype_tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutation_info),
    mutation_prevalences = jsonlite::toJSON(mutation_prevalences),
    mutations_provided=mutations_provided, # whether or not mutations are provided
    xaxis_title = as.character(xaxis_title),
    yaxis_title = as.character(yaxis_title),
    phylogeny_title = as.character(phylogeny_title),
    alpha = alpha,
    genotype_position = genotype_position,
    perturbations = jsonlite::toJSON(perturbations),
    sort_gtypes = sort,
    timepoint_map = jsonlite::toJSON(timepoint_map),
    clone_id_map = jsonlite::toJSON(clone_id_map)
  ))
}

#' Function to check minimum dimensions
#' 
#' @param mutations -- mutations provided by user
#' @param height -- height provided by user
#' @param width -- width provided by user
#' @examples
#' checkMinDims(data.frame(chr = c("11"), coord = c(104043), VAF = c(0.1)), "700px", "700px")
#' @export
#' @rdname helpers
checkMinDims <- function(mutations, height, width) {

  # set height if not set by user
  if (is.null(height)) {
    if (!is.data.frame(mutations)) { # no mutations
      height = 260
    }
    else { # mutations
      height = 500
    }
  }

  # check height is big enough 
  min_width = 450
  if (!is.data.frame(mutations)) { # no mutations
    min_height = 260
  }
  else { # mutations
    min_height = 500
  }

  if (height < min_height) {
    stop("Height must be greater than or equal to ", min_height, "px.")
  }
  if (width < min_width) {
    stop("Width must be greater than or equal to ", min_width, "px.")
  }
}


#' Function to check required inputs are present
#' 
#' @param clonal_prev -- clonal_prev provided by user
#' @param tree_edges -- tree_edges provided by user
#' @examples
#' checkRequiredInputs(data.frame(timepoint = c(rep("Diagnosis", 6), rep("Relapse", 1)), clone_id = c("1","2","3","4","5","6","7"), clonal_prev = c("0.1","0.22","0.08","0.53","0.009","0.061","1")), 
#' data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")))
#' checkRequiredInputs(data.frame(timepoint = c(rep("Diagnosis", 6), rep("Relapse", 1)), clone_id = c("1","2","3","4","5","6","7"), clonal_prev = c("0.12","0.12","0.18","0.13","0.009","0.061","1")), 
#' data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")))
#' @export
#' @rdname helpers
checkRequiredInputs <- function(clonal_prev, tree_edges) {

  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
  }
}

#' check alpha value input is correct
#' 
#' @param alpha -- alpha provided by user
#' @examples
#' checkAlpha(4)
#' checkAlpha(100)
#' @export
#' @rdname helpers
checkAlpha <- function(alpha) {
  if (!is.numeric(alpha)) {
    stop("Alpha value must be numeric.")
  }

  if (alpha < 0 || alpha > 100) {
    stop("Alpha value must be between 0 and 100.")
  }
}

#' check clonal_prev parameter data
#'
#' @param clonal_prev -- clonal prevalence provided by user
#' @examples
#' checkClonalPrev(data.frame(timepoint=c(1), clone_id=c(2), clonal_prev=c(0.1)))
#' @export
#' @rdname helpers
checkClonalPrev <- function(clonal_prev) {

  # ensure column names are correct
  if (!("timepoint" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop("Clonal prevalence data frame must have the following column names: ", 
        "\"timepoint\", \"clone_id\", \"clonal_prev\"")
  }

  # ensure data is of the correct type
  clonal_prev$timepoint <- as.character(clonal_prev$timepoint)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  return(clonal_prev)
}

#' check tree_edges parameter data
#'
#' @param tree_edges -- tree edges provided by user
#' @examples
#' checkTreeEdges(data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")))
#' @export
#' @rdname helpers
checkTreeEdges <- function(tree_edges) {

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\"")
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

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
    stop("Multiple roots detected in tree (",paste(sources,collapse=", "),
      ") - tree must have only one root.")
  }

  # if an edge is found whose source and target are equal, throw an error
  if (length(which(as.character(tree_edges$source) == as.character(tree_edges$target))) > 0) {
    stop("One of the tree edges has a source as its own target. Remove this edge.")
  }

  return(tree_edges)
}


#' check genotype_position parameter
#'
#' @param genotype_position -- genotype_position provided by user
#' @examples
#' checkGtypePositioning("centre")
#' @export
#' @rdname helpers
checkGtypePositioning <- function(genotype_position) {
  if (!(genotype_position %in% c("stack", "centre", "space"))) {
    stop("Genotype position must be one of c(\"stack\", \"centre\", \"space\")")
  }
}

#' check clone_colours parameter
#'
#' @param clone_colours -- clone_colours provided by user
#' @examples
#' checkCloneColours(data.frame(clone_id = c("1","2","3", "4"), colour = c("#beaed4", "#fdc086", "#beaed4", "#beaed4")))
#' @export
#' @rdname helpers
checkCloneColours <- function(clone_colours) {
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\"")
    }
  }
}

#' check perturbations parameter
#'
#' @param perturbations -- perturbations provided by user
#' @examples
#' checkPerts(data.frame(pert_name = c("New Drug"), prev_tp = c("Diagnosis"), frac = c(0.1)))
#' @export
#' @rdname helpers
checkPerts <- function(perturbations) {

  if (is.data.frame(perturbations)) {

    # ensure column names are correct
    if (!("pert_name" %in% colnames(perturbations)) ||
        !("prev_tp" %in% colnames(perturbations)) ||
        !("frac" %in% colnames(perturbations))) {
      stop("Perturbations data frame must have the following column names: ", 
          "\"pert_name\", \"prev_tp\", \"frac\"")
    }

    # check that columns are of the correct type
    perturbations$pert_name <- as.character(perturbations$pert_name)
    perturbations$prev_tp <- as.character(perturbations$prev_tp)
    perturbations$frac <- as.character(perturbations$frac)
  }

  return(perturbations)
}

#' get mutation data
#'
#' @param mutations -- mutations data from user
#' @param tree_edges -- tree edges data from user
#' @param clonal_prev -- clonal prevalence data from user
#' @examples
#' getMutationsData(data.frame(chrom = c("11"), coord = c(104043), VAF = c(0.1), clone_id=c(1), timepoint=c("Relapse")), 
#' data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")), 
#' data.frame(timepoint = c(rep("Diagnosis", 6), rep("Relapse", 1)), clone_id = c("1","2","3","4","5","6","7"), clonal_prev = c("0.12","0.12","0.18","0.13","0.009","0.061","1")))
#' @export
#' @rdname helpers
getMutationsData <- function(mutations, tree_edges, clonal_prev) {

  if (is.data.frame(mutations)) {

    # ensure column names are correct
    if (!("chrom" %in% colnames(mutations)) ||
        !("coord" %in% colnames(mutations)) ||
        !("clone_id" %in% colnames(mutations)) ||
        !("timepoint" %in% colnames(mutations)) ||
        !("VAF" %in% colnames(mutations))) {
      stop("Mutations data frame must have the following column names: ", 
          "\"chrom\", \"coord\", \"clone_id\", \"timepoint\", \"VAF\".")
    }

    # ensure data is of the correct type
    mutations$chrom <- toupper(as.character(mutations$chrom)) # upper case X & Y
    mutations$coord <- as.character(mutations$coord)
    mutations$timepoint <- as.character(mutations$timepoint)
    mutations$clone_id <- as.character(mutations$clone_id)
    mutations$VAF <- as.numeric(as.character(mutations$VAF))

    # check for optional info, and ensure data of correct type
    extra_columns <- colnames(mutations)[which(!(colnames(mutations) %in% c("chrom", "coord", "clone_id", "timepoint", "VAF")))]
    mutations <- data.frame(lapply(mutations, as.character), stringsAsFactors=FALSE)

    # check that all CLONE IDS in the mutations data are present in the tree data
    mutations_clone_ids <- unique(mutations$clone_id)
    tree_edges_clone_ids <- c(unique(tree_edges$source), unique(tree_edges$target))
    clone_ids_missing_from_tree_edges_data <- setdiff(mutations_clone_ids, tree_edges_clone_ids)
    if (length(clone_ids_missing_from_tree_edges_data) > 0) {
      stop("The following clone ID(s) are present in the mutations data but ",
        "are missing from the tree edges data: ",
        paste(clone_ids_missing_from_tree_edges_data, collapse=", "), ".")
    }

    # check that all TIMEPOINTS in the mutations data are present in the clonal prev data
    mutations_tps <- unique(mutations$timepoint)
    clonal_prev_tps <- unique(clonal_prev$timepoint)
    tps_missing_from_clonal_prev_data <- setdiff(mutations_tps, clonal_prev_tps)
    if (length(tps_missing_from_clonal_prev_data) > 0) {
      stop("The following timepoint(s) are present in the mutations data but ",
        "are missing from the clonal prevalence data: ",
        paste(tps_missing_from_clonal_prev_data, collapse=", "), ".")
    }

    # create a location column, combining the chromosome and the coordinate
    mutations$location <- apply(mutations[, c("chrom","coord")], 1 , paste, collapse = ":")

    # coordinate is now a number
    mutations$coord <- as.numeric(as.character(mutations$coord))

    # check X & Y chromosomes are labelled "X" and "Y", not "23", "24"
    num_23 <- mutations[which(mutations$chrom == "23"),]
    if (nrow(num_23) > 0) {
      stop("Chromosome numbered \"23\" was detected in mutations data frame - X and Y chromosomes ",
        "must be labelled \"X\" and \"Y\".")
    }


    # get list of clones in the phylogeny
    clones_in_phylo <- unique(c(tree_edges$source, tree_edges$target))

    # keep only those mutations whose clone ids are present in the phylogeny
    mutations <- mutations[which(mutations$clone_id %in% clones_in_phylo),]

    # MUTATION PREVALENCES DATA

    mutation_prevalences <- mutations

    # keep only those mutations whose clone ids are present in the phylogeny
    mutation_prevalences <- mutation_prevalences[which(mutation_prevalences$clone_id %in% clones_in_phylo),]

    # warn if more than 10,000 rows in data that the visualization may be slow
    if (nrow(mutation_prevalences) > 10000 && show_warnings) {
      print(paste("[WARNING] Number of rows in mutations data exceeds 10,000. ",
        "Resultantly, visualization may be slow. ",
        "It is recommended to filter the data to a smaller set of mutations.", sep=""))
    }

    # compress results
    prevs_split <- split(mutation_prevalences, f = mutation_prevalences$location)

    # reduce the size of the data frame in each list
    prevs_split_small <- lapply(prevs_split, function(prevs) {
      return(prevs[,c("timepoint", "VAF")])
    })


    # MUTATION INFO 
    mutation_info <- unique(mutations[,c("chrom","coord","clone_id",extra_columns)])
  }
  else {
    prevs_split_small <- "NA"
    mutation_info <- "NA"
  }

  return(list("mutation_info"=mutation_info, "mutation_prevalences"=prevs_split_small))
}

#' function to replace spaces with underscores in all data frames & keep maps of original names to space-replaced names
#' @param clonal_prev -- clonal_prev data from user
#' @param tree_edges -- tree edges data from user
#' @param clone_colours -- clone_colours data from user
#' @param mutation_info -- processed mutation_info 
#' @param mutations -- mutations data from user
#' @param mutation_prevalences -- mutation_prevalences data from user
#' @export
#' @rdname helpers
#' @examples
#' replaceSpaces(mutations = data.frame(chrom = c("11"), coord = c(104043), VAF = c(0.1), clone_id=c(1), timepoint=c("Relapse")), 
#' tree_edges = data.frame(source = c("1","1","2","2","5","6"), target=c("2","5","3","4","6","7")), 
#' clonal_prev = data.frame(timepoint = c(rep("Diagnosis", 6), rep("Relapse", 1)), clone_id = c("1","2","3","4","5","6","7"), clonal_prev = c("0.12","0.12","0.18","0.13","0.009","0.061","1")),
#' mutation_prevalences = list("X:6154028" = data.frame(timepoint = c("Diagnosis"), VAF = c(0.5557))), mutation_info=data.frame(clone_id=c(1)),
#' clone_colours = data.frame(clone_id = c("1","2","3", "4"), colour = c("#beaed4", "#fdc086", "#beaed4", "#beaed4")))
replaceSpaces <- function(clonal_prev, tree_edges, clone_colours, mutation_info, mutations, mutation_prevalences) {

  # create map of original sample ids to space-replaced sample ids
  timepoint_map <- data.frame(original_timepoint = unique(clonal_prev$timepoint), stringsAsFactors=FALSE)
  timepoint_map$space_replaced_timepoint <- stringr::str_replace_all(timepoint_map$original_timepoint,"\\s+","_")

  # create map of original clone ids to space-replaced clone ids
  clone_id_map <- data.frame(original_clone_id = unique(c(tree_edges$source, tree_edges$target)), stringsAsFactors=FALSE)
  clone_id_map$space_replaced_clone_id <- stringr::str_replace_all(clone_id_map$original_clone_id,"\\s+","_")

  # replace spaces with underscores
  # --> timepoints
  clonal_prev$timepoint <- stringr::str_replace_all(clonal_prev$timepoint,"\\s+","_")
  if (is.data.frame(mutations)) {
    mutation_prevalences <- lapply(mutation_prevalences, function(prevs) {
      prevs$timepoint <- stringr::str_replace_all(prevs$timepoint,"\\s+","_")
      return(prevs)
    })
  }
  # --> clone ids
  clonal_prev$clone_id <- stringr::str_replace_all(clonal_prev$clone_id,"\\s+","_")
  tree_edges$source <- stringr::str_replace_all(tree_edges$source,"\\s+","_")
  tree_edges$target <- stringr::str_replace_all(tree_edges$target,"\\s+","_")
  if (is.data.frame(clone_colours)) {
    clone_colours$clone_id <- stringr::str_replace_all(clone_colours$clone_id,"\\s+","_")
  }
  if (is.data.frame(mutations)) {
    mutation_info$clone_id <- stringr::str_replace_all(mutation_info$clone_id,"\\s+","_")
  }

  return(list("timepoint_map"=timepoint_map, 
              "clone_id_map"=clone_id_map, 
              "clonal_prev"=clonal_prev, 
              "tree_edges"=tree_edges,
              "mutation_info"=mutation_info,
              "clone_colours"=clone_colours,
              "mutation_prevalences"=mutation_prevalences))
}
