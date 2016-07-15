
CellScape is a visualization tool for integrating single cell phylogeny with genomic content to clearly display evolutionary progression and tumour heterogeneity.

To run CellScape:

install.packages("devtools") # if not already installed  
library(devtools)  
install_bitbucket("MO_BCCRC/cellscape")  
library(cellscape)  
example(cellscape)  

And two visualizations will appear in your browser.

The first shows single cell targeted mutation data with a time-series component:
![](cellscape_screenshot1.png)

The second shows copy number data of a triple negative breast cancer patient published in Wang et al. (2014):
![](cellscape_screenshot2.png)


References:  
Wang, Yong, et al. "Clonal evolution in breast cancer revealed by single nucleus genome sequencing." Nature 512.7513 (2014): 155-160.
