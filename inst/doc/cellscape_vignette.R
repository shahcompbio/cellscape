## ---- eval=FALSE---------------------------------------------------------
#  install.packages("devtools") # if not already installed
#  library(devtools)
#  install_bitbucket("MO_BCCRC/cellscape")
#  library(cellscape)
#  example(cellscape) # to run examples

## ---- echo=FALSE---------------------------------------------------------
library(devtools)  
install_bitbucket("MO_BCCRC/cellscape")  
library(cellscape) 
# EXAMPLE 2 - COPY NUMBER DATA
# single cell tree edges
tree_edges <- read.csv(system.file("extdata", "cnv_tree_edges.csv", package = "cellscape"))
# cnv segments data
cnv_data <- read.csv(system.file("extdata", "cnv_data.csv", package = "cellscape"))
# annotations
sc_annot <- read.csv(system.file("extdata", "cnv_annots.tsv", package = "cellscape"), sep="\t")
# custom clone colours
clone_colours <- data.frame( clone_id = c("1","2","3"), colour = c("7fc97f", "beaed4", "fdc086"))
# run cellscape
cellscape(cnv_data=cnv_data, tree_edges=tree_edges, sc_annot=sc_annot, width=800, height=475, show_warnings=FALSE, clone_colours=clone_colours)

## ---- eval=FALSE---------------------------------------------------------
#  ?cellscape

