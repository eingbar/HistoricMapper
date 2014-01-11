clam_path = GLOBAL.VirusScanProgram || 'clamdscan';

var clam = require('./clamscan_Mod')({
    max_forks: 2, // Num of files to scan at once (should be no more than # of CPU cores)
    clam_path: clam_path, // Path to clamscan binary on your server
    remove_infected: true, // If true, removes infected files
    quarantine_infected: false, // False: Don't quarantine, Path: Moves files to this place.
    scan_archives: false, //ClamScan does this by default// If true, scan archives (ex. zip, rar, tar, dmg, iso, etc...)
    scan_recursively: false, //ClamScan does this by default// If true, deep scan folders recursively
    scan_log: null, // Path to a writeable log file to write scan results into
    db: null, // Path to a custom virus definition database
    debug_mode: false // Whether or not to log info/debug/error msgs to the console
});

var enableScan = GLOBAL.VirusScan || false;

exports.is_infected = function (file, callback) {
	if (enableScan) {
		clam.is_infected(file, callback);
	} else {
		callback(null, file, false);
	};
}