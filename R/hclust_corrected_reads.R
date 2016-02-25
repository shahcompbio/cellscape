# script to hierarchically cluster single cells by their correct reads integer copy number values
# @return hierarchically clustered order of single cell ids

library(reshape2)

# load single cell corrected reads data into an R data frame

# parameters
path <- "/Users/msmith/data/external/SA501_xenograft_data/hmmcopy_all/"
fileRX <- "SA501.*corrected_reads.csv"
singleCellIdRX <- "SA501X3F-([0-9]+).corrected_reads.csv"

# get corrected_reads files only
files <- list.files(path=path,pattern=fileRX) 
files_to_remove <- c(
	"SA501X3F-00287.corrected_reads.csv",
	"SA501X3F-00327.corrected_reads.csv",
	"SA501X3F-00369.corrected_reads.csv",
	"SA501X3F-00174.corrected_reads.csv",
	"SA501X3F-00192.corrected_reads.csv",
	"SA501X3F-00225.corrected_reads.csv",
	"SA501X3F-00096.corrected_reads.csv",
	"SA501X3F-00279.corrected_reads.csv",
	"SA501X3F-00288.corrected_reads.csv",
	"SA501X3F-00330.corrected_reads.csv",
	"SA501X3F-00364.corrected_reads.csv",
	"SA501X3F-00384.corrected_reads.csv",
	"SA501X3F-00278.corrected_reads.csv")

# get all corrected_reads data into one data frame
data <- data.frame(
	single_cell_id=character(),
	pos=character(), # position in the genome (<chr>_<start>)
	integer_copy_number=integer(),
	stringsAsFactors=FALSE)
for (i in 1:length(files)) {
	if (!(files[i] %in% files_to_remove)) { # not working


		# extract single cell id from file name
		single_cell_id <- sub(singleCellIdRX, "\\1", files[i],perl=TRUE)

		# read in data from file
		readError <- tryCatch({
			raw_data <- cbind(single_cell_id=single_cell_id, read.csv(paste(path, files[i], sep="")))
			
		}, error=function(e) { 
			print(paste("Warning: Reading ", files[i], " produces error: ", e, sep=""))
		})

		# if there's no data read error, parse the raw data
		if(!inherits(readError, "error")){

			# convert columns to strings
			raw_data$chr <- as.character(raw_data$chr)
			raw_data$start <- as.character(raw_data$start)

			# get position column name
			raw_data$pos <- apply(raw_data[ , c("chr", "start") ] , 1 , paste , collapse = "_" )

			# append data to data frame
			data <- rbind(data, raw_data[ , c("single_cell_id", "pos", "integer_copy_number")])

		}
	}
}
corrected_reads <- data
save(corrected_reads, file = "/Users/msmith/data/internal/cnvTree/corrected_reads.RData")

# unmelt data
wide_data <- reshape2::dcast(data = data,formula = single_cell_id~pos, value.var = "integer_copy_number")

# replace Inf & NA values with -1
wide_data <- do.call(data.frame,lapply(wide_data, function(x) replace(x, is.infinite(x), -1)))
wide_data <- do.call(data.frame,lapply(wide_data, function(x) replace(x, is.na(x), -1)))
wide_data$single_cell_id <- as.character(wide_data$single_cell_id)

# hierarchically cluster single cells
dists <- dist(wide_data, method="euclidean")
clusts <- hclust(dists, method='complete')

# order of sc_ids (indices)
sc_ids_ordered_idx <- clusts$order
sc_ids_ordered <- rep("",length(sc_ids_ordered_idx))
for (i in 1:length(sc_ids_ordered_idx)) {
	sc_ids_ordered[i] <- wide_data$single_cell_id[sc_ids_ordered_idx[i]]
}

save(sc_ids_ordered, file = "/Users/msmith/data/internal/cnvTree/sc_ids_ordered.RData")
