#!/usr/local/bin/lycheejs-helper env:node


const _fs   = require('fs');
const _path = require('path');
const _CWD  = process.cwd();
const _ROOT = process.env.LYCHEEJS_ROOT || '/opt/lycheejs';



/*
 * USAGE
 */

const _print_help = function() {

	console.log('                                                                 ');
	console.info('lychee.js ' + lychee.VERSION + ' Strainer (Fixer)');
	console.log('                                                                 ');
	console.log('Usage: lycheejs-strainer-fixer [File]                            ');
	console.log('                                                                 ');
	console.log('Examples:                                                        ');
	console.log('                                                                 ');
	console.log('    # cwd has to be /opt/lycheejs                                ');
	console.log('    lycheejs-strainer-fixer projects/boilerplate/source/Main.js; ');
	console.log('                                                                 ');

};

const _bootup = function(settings) {

	// XXX: Quickfix Mode doesn't allow
	// console log/info/warn or pretty
	// color codes, so strip them out.

	console.log   = function() {};
	console.info  = function() {};
	console.warn  = function() {};
	console.error = function() {

		let al   = arguments.length;
		let args = [];
		for (let a = 0; a < al; a++) {
			args.push(arguments[a]);
		}

		process.stdout.write(args.join(' ') + '\n');

	};


	let environment = new lychee.Environment({
		id:       'strainer',
		debug:    false,
		sandbox:  true,
		build:    'strainer.Fixer',
		timeout:  5000,
		packages: [
			new lychee.Package('lychee',   '/libraries/lychee/lychee.pkg'),
			new lychee.Package('strainer', '/libraries/strainer/lychee.pkg')
		],
		tags:     {
			platform: [ 'node' ]
		}
	});


	lychee.setEnvironment(environment);


	environment.init(function(sandbox) {

		if (sandbox !== null) {

			let lychee   = sandbox.lychee;
			let strainer = sandbox.strainer;


			// This allows using #MAIN in JSON files
			sandbox.MAIN = new strainer.Fixer(settings);

			sandbox.MAIN.bind('destroy', function(code) {
				process.exit(code);
			});

			sandbox.MAIN.init();


			const _on_process_error = function() {
				sandbox.MAIN.destroy();
				process.exit(1);
			};

			process.on('SIGHUP',  _on_process_error);
			process.on('SIGINT',  _on_process_error);
			process.on('SIGQUIT', _on_process_error);
			process.on('SIGABRT', _on_process_error);
			process.on('SIGTERM', _on_process_error);
			process.on('error',   _on_process_error);
			process.on('exit',    function() {});


			new lychee.Input({
				key:         true,
				keymodifier: true
			}).bind('escape', function() {

				sandbox.MAIN.destroy();

			}, this);

		} else {

			process.exit(1);

		}

	});

};



/*
 * XXX: Quickfix Mode doesn't need console.info() calls.
 * This strips out all bootstrap info
 */

const lychee = (function() {

	let _old_write = process.stdout.write;
	process.stdout.write = function() {};

	if (_fs.existsSync(_ROOT + '/libraries/lychee/build/node/core.js') === false) {
		require(_ROOT + '/bin/configure.js');
	}

	let lychee = require(_ROOT + '/libraries/lychee/build/node/core.js')(_ROOT);
	process.stdout.write = _old_write;


	return lychee;

})();



const _SETTINGS = (function() {

	let args     = process.argv.slice(2).filter(val => val !== '');
	let settings = {
		cwd:     _CWD,
		file:    null,
		project: null
	};

	let file = args[0];
	if (file !== undefined) {

		if (file.startsWith('./')) {
			file = _CWD + '/' + file.substr(2);
		} else if (file.startsWith('/') === false) {
			file = _CWD + '/' + file;
		}

		try {

			let stat = _fs.lstatSync(file);
			if (stat.isFile()) {
				settings.file = file;
			}

		} catch (err) {

			settings.file = null;

		}


		if (settings.file !== null) {

			let path  = settings.file.split('/');
			let index = path.findIndex(val => /^(projects|libraries)$/g.test(val));
			if (index !== -1) {

				let project = '/' + path.slice(3, 5).join('/');

				try {

					let stat1 = _fs.lstatSync(_ROOT + project);
					let stat2 = _fs.lstatSync(_ROOT + project + '/lychee.pkg');
					if (stat1.isDirectory() && stat2.isFile()) {
						settings.project = project;
					}

				} catch (err) {

					settings.project = null;

				}


				if (settings.project !== null) {

					let index = settings.file.indexOf(settings.project);
					if (index !== -1) {
						settings.file = settings.file.substr(index + settings.project.length + 1);
					}

				}

			}

		}

	}


	return settings;

})();



(function(settings) {

	/*
	 * IMPLEMENTATION
	 */

	let has_file    = settings.file !== null;
	let has_project = settings.project !== null;


	if (has_file && has_project) {

		_bootup({
			cwd:     settings.cwd,
			file:    settings.file,
			project: settings.project
		});

	} else {

		console.error('PARAMETERS FAILURE');

		_print_help();

		process.exit(1);

	}

})(_SETTINGS);

