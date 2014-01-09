// var isWin = !!process.platform.match(/^win/);
// if (isWin){
// 	clam_path = '"C:\\Program Files (x86)\\Sourcefire Inc\\ClamAV\\clamscan"';
// } else {
// 	clam_path = '/usr/bin/clamscan';
// };
// var clam = require('clamscan')({
//     max_forks: 2, // Num of files to scan at once (should be no more than # of CPU cores)
//     clam_path: clam_path, // Path to clamscan binary on your server
//     remove_infected: false, // If true, removes infected files
//     quarantine_infected: false, // False: Don't quarantine, Path: Moves files to this place.
//     scan_archives: true, // If true, scan archives (ex. zip, rar, tar, dmg, iso, etc...)
//     scan_recursively: true, // If true, deep scan folders recursively
//     scan_log: null, // Path to a writeable log file to write scan results into
//     db: null, // Path to a custom virus definition database
//     debug_mode: false // Whether or not to log info/debug/error msgs to the console
// });

// var enableScan = false;

// exports.is_infected = function (file_path, callback) {
// 	if (enableScan) {
// 		clam.is_infected(file_path, callback);
// 	} else {
// 		callback(null, file_path, false);
// 	};
// }