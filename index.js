//    ___ _               _     ___                        
//   | _ \ |__ _ _ _  ___| |_  | __|_ ___ __ _ _ ___ ______
//   |  _/ / _` | ' \/ -_)  _| | _|\ \ / '_ \ '_/ -_|_-<_-<
//   |_| |_\__,_|_||_\___|\__| |___/_\_\ .__/_| \___/__/__/
//                                     |_|                 
//   ------------------------------------------------------
//   The super dope routing helper from the stars
//   http://github.com/mrpossoms/planet-express
//
//   author: Kirk Roerig 2016
//   email:  mr.possoms@gmail.com
//

var fs = require('fs');

module.exports = function(expressApp){

	function isHttpVerb(str){
		return ['get', 'put', 'post', 'delete'].indexOf(str) >= 0;
	}

	function authWrap(action){
		return function(req, res){
			expressApp.authenticate(req, res, action);
		}
	}

	var baseDir = null;
	var importRoutes = function(directory, depth){
		baseDir = !baseDir ? directory : baseDir;

		fs.readdir(directory, function(err, files){
			if(err){
				console.log(err);
				return;
			}

			var pad = '';
			for(var i = depth; i--;) pad += '\t';

			for(var i = files.length; i--;){
				var filename = files[i];

				console.log(pad + 'found - ' + directory + '/' + filename);

				if(filename.getExtension() === '.js'){
					var route = require('./../' + directory + '/' + filename)(expressApp);

					// each route file is an object that has handlers keyed on each viable verb
					// itterate over each verb, and assign the handeler to each
					for(var verb in route){
						if(!isHttpVerb(verb)) continue;

						if(process.env.DEBUG){
							console.log(pad + 'importing.. {0} /{1} '.format([verb, filename]));
						}

						// remove the base directory from the path, and remove any index.js
						// occurances. We only want / instead of /index.js
						var path = directory.replace(baseDir, '');
						var endpoint = filename.replace('index.js', '').replace('.js', '');

						if(path.indexOf('/TOKEN_AUTH') > -1 && typeof(expressApp.authenticate) == 'function'){
							path = path.replace('/TOKEN_AUTH', '');
							expressApp[verb](path + '/' + endpoint, authWrap(route[verb]));
						}
						else{
							expressApp[verb](path + '/' + endpoint, route[verb]);
						}

						if(process.env.DEBUG){
							console.log(pad + 'Imported {0} as [{1}] {2}/{3}'.format([filename, verb, path, endpoint]));
						}
					}
				}
				else{

					// check to see if a given file is a directory. If it is, then
					// recurse into the direcory, and continue importing routes
					var folderPath = directory + '/' + filename;
					var stat = fs.statSync(folderPath);

					if(!stat && process.env.DEBUG){
						console.log(pad + err);
						return;
					}

					if(stat.isDirectory()){
						if(process.env.DEBUG){
							console.log(pad + 'Searching: ' + folderPath);
							console.log('Recursing into ' + folderPath);
						}

						importRoutes(directory + '/' + filename, depth + 1);
					}
				}
			}
		});
	};

	importRoutes('./routes', 0);
}

