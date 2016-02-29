# script for loading all single cell cnv segments data into an R data frame
# Run like so:
# Rscript --vanilla segments_data_load.R "<input_directory>" "<output_file>"

# user inputs
args = commandArgs(trailingOnly=TRUE)

if (length(args)!=2) {
	n_provided_args = length(args)
  	stop(paste("Two arguments must be provided - the path to input files and the output file path. ",
  		"You provided ", n_provided_args, " arguments.", sep=""))
}

# parameters
path <- args[1] # e.g. "/Users/msmith/data/external/SA501_xenograft_data/hmmcopy_all/"
fileRX <- "SA501.*segments.csv"
singleCellIdRX <- "SA501X3F-([0-9]+).segments.csv"

# get segments files only
files <- list.files(path=path,pattern=fileRX) 
files_to_remove <- c(
	"SA501X3F-00287.segments.csv",
	"SA501X3F-00327.segments.csv",
	"SA501X3F-00369.segments.csv",
	"SA501X3F-00174.segments.csv",
	"SA501X3F-00192.segments.csv",
	"SA501X3F-00225.segments.csv",
	"SA501X3F-00096.segments.csv",
	"SA501X3F-00279.segments.csv",
	"SA501X3F-00288.segments.csv",
	"SA501X3F-00330.segments.csv",
	"SA501X3F-00364.segments.csv",
	"SA501X3F-00384.segments.csv",
	"SA501X3F-00278.segments.csv")

# get all segments data into one data frame
data <- data.frame(
	single_cell_id=character(),
	chr=integer(),
	start=integer(),
	end=integer(),
	state=integer(),
	median=double(),
	integer_median=double(),
	integer_copy_number=integer(),
	stringsAsFactors=FALSE)
for (i in 1:length(files)) {
	if (!(files[i] %in% files_to_remove)) { # not working


		# extract single cell id from file name
		single_cell_id <- sub(singleCellIdRX, "\\1", files[i],perl=TRUE)

		# read in data from file
		readError <- tryCatch({
			cur_data <- cbind(single_cell_id=single_cell_id, read.csv(paste(path, files[i], sep="")))
		}, error=function(e) { 
			print(paste("Warning: Reading ", files[i], " produces error: ", e, sep=""))
		})

		# if there's no data read error
		if(!inherits(readError, "error")){

			# append data to data frame
			data <- rbind(data, cur_data)
		}
	}
}

# convert factors to strings
data$single_cell_id <- as.character(data$single_cell_id)
data$chr <- as.character(data$chr)

# drop unnecessary columns
drops <- c("state", "median", "integer_median")
data <- data[,!(colnames(data) %in% drops)]

cnv_data <- data
save(cnv_data, file = args[2]) # e.g. "/Users/msmith/data/internal/cnvTree/cnv_data.RData"