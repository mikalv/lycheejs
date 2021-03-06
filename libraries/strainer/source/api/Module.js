
lychee.define('strainer.api.Module').requires([
	'strainer.api.PARSER'
]).exports(function(lychee, global, attachments) {

	const _PARSER = lychee.import('strainer.api.PARSER');



	/*
	 * CACHES
	 */

	const _SERIALIZE = {
		body:       'function() { return {}; }',
		chunk:      'function() {',
		hash:       _PARSER.hash('function() { return {}; }'),
		parameters: [],
		values:     [{
			type: 'SerializationBlob',
			value: {
				'constructor': null,
				'arguments':   [],
				'blob':        null
			}
		}]
	};

	const _DESERIALIZE = {
		body:       'function(blob) {}',
		chunk:      'function(blob) {',
		hash:       _PARSER.hash('function(blob) {}'),
		parameters: [{
			name:  'blob',
			type:  'SerializationBlob',
			value: {}
		}],
		values: [{
			type:  'undefined',
			value: undefined
		}]
	};



	/*
	 * HELPERS
	 */

	const _validate_asset = function(asset) {

		if (asset instanceof Object && typeof asset.serialize === 'function') {
			return true;
		}

		return false;

	};

	const _find_reference = function(chunk, stream) {

		let ref = {
			chunk:  '',
			line:   0,
			column: 0
		};

		let lines = stream.split('\n');
		let line  = lines.findIndex(function(other) {
			return other.trim() === chunk.trim();
		});

		if (line !== -1) {

			ref.chunk = lines[line];
			ref.line  = line + 1;

			let column = lines[line].indexOf(chunk);
			if (column !== -1) {
				ref.column = column + 1;
			}

		}

		return ref;

	};

	const _find_memory = function(key, stream) {

		let str1 = 'const ' + key + ' = ';
		let str2 = '\n\t};';

		let i1 = stream.indexOf(str1);
		let i2 = stream.indexOf(str2, i1);

		if (i1 !== -1 && i2 !== -1) {
			return stream.substr(i1 + str1.length, i2 - i1 - str1.length + str2.length).trim();
		}

		return 'undefined';

	};

	const _find_method = function(key, stream) {

		let str1 = '\n\t\t' + key + ': function';
		let str2 = '\n\t\t}';

		let i0 = stream.indexOf('\n\tconst Module = {');
		let i1 = stream.indexOf(str1, i0);
		let i2 = stream.indexOf(str2, i1);

		if (i1 !== -1 && i2 !== -1) {
			return 'function' + stream.substr(i1 + str1.length, i2 - i1 - str1.length + str2.length).trim();
		}

		return 'undefined';

	};

	const _find_property = function(key, stream) {

		let str1 = '\n\t\t' + key + ': {';
		let str2 = '\n\t\t}';

		let i0 = stream.indexOf('\n\tconst Module = {');
		let i1 = stream.indexOf(str1, i0);
		let i2 = stream.indexOf(str2, i1);

		if (i1 !== -1 && i2 !== -1) {
			return stream.substr(i1 + str1.length - 1, i2 - i1 - str1.length + str2.length + 1).trim();
		}

		return 'undefined';

	};

	const _parse_memory = function(memory, stream, errors) {

		let i1 = stream.indexOf('.exports(function(lychee, global, attachments) {');
		let i2 = stream.indexOf('\n\tconst Module =');

		if (i1 !== -1 && i2 !== -1) {

			let body = stream.substr(i1 + 48, i2 - i1 - 48).trim();
			if (body.length > 0) {

				body.split('\n')
					.map(function(line) {
						return line.trim();
					}).filter(function(line) {
						return line.startsWith('const ');
					}).forEach(function(line) {

						let tmp = line.substr(6).trim();
						let i1  = tmp.indexOf('=');
						if (i1 !== -1) {

							let key   = tmp.substr(0, i1).trim();
							let chunk = tmp.substr(i1 + 1).trim();

							if (key !== '' && chunk !== '') {

								if (chunk.startsWith('function(')) {

									chunk = _find_memory(key, stream);

									if (chunk.endsWith(';')) {
										chunk = chunk.substr(0, chunk.length - 1);
									}

									memory[key] = {
										body:       chunk,
										hash:       _PARSER.hash(chunk),
										parameters: _PARSER.parameters(chunk),
										values:     _PARSER.values(chunk)
									};

								} else {

									memory[key] = _PARSER.detect(chunk);

								}

							}

						}

					});

			}

		}

	};

	const _parse_methods = function(methods, stream, errors) {

		let i1 = stream.indexOf('\n\tconst Module = {');
		let i2 = stream.indexOf('\n\t};', i1);

		if (i1 !== -1 && i2 !== -1) {

			stream.substr(i1 + 18, i2 - i1 - 18).split('\n')
				.filter(function(line) {

					if (line.startsWith('\t\t')) {

						let tmp = line.substr(2);
						if (/^([A-Za-z0-9]+):\sfunction/g.test(tmp)) {
							return true;
						} else if (tmp.startsWith('// deserialize: function(blob) {}')) {
							methods['deserialize'] = Object.assign({}, _DESERIALIZE);
						} else if (tmp.startsWith('// serialize: function() {}')) {
							methods['serialize'] = Object.assign({}, _SERIALIZE);
						}

					}


					return false;

				}).forEach(function(chunk) {

					let name = chunk.split(':')[0].trim();
					let body = _find_method(name, stream);

					if (body !== 'undefined') {

						methods[name] = {
							body:       body,
							chunk:      chunk,
							hash:       _PARSER.hash(body),
							parameters: _PARSER.parameters(body),
							values:     _PARSER.values(body)
						};

					}

				});


			let deserialize = methods['deserialize'];
			if (deserialize !== undefined) {
				if (deserialize.parameters.length === 0) deserialize.parameters = lychee.assignunlink([], _DESERIALIZE.parameters);
				if (deserialize.values.length === 0)     deserialize.values     = lychee.assignunlink([], _DESERIALIZE.values);
			}

			let serialize = methods['serialize'];
			if (serialize !== undefined) {
				if (serialize.parameters.length === 0) serialize.parameters = lychee.assignunlink([], _SERIALIZE.parameters);
				if (serialize.values.length === 0)     serialize.values     = lychee.assignunlink([], _SERIALIZE.values);
			}


			for (let mid in methods) {

				let method = methods[mid];
				let params = method.parameters;
				let ref    = _find_reference(method.chunk, stream);
				let values = method.values;


				if (params.length > 0) {

					let found = params.filter(function(other) {
						return other.type === 'undefined' && other.value === undefined;
					}).map(function(other) {
						return other.name;
					});

					if (found.length > 0) {

						if (/^(control|render|update|deserialize|serialize)$/g.test(mid) === false) {

							let key = found[0];
							let col = ref.chunk.indexOf(key);
							if (col !== -1) {
								col = col + 1;
							} else {
								col = ref.column;
							}

							errors.push({
								url:       null,
								rule:      'no-parameter-value',
								reference: mid,
								message:   'Invalid parameter values for "' + found.join('", "') + '" for method "' + mid + '()".',
								line:      ref.line,
								column:    col
							});

						}

					}

				}

				if (values.length === 0) {

					errors.push({
						url:       null,
						rule:      'no-return-value',
						reference: mid,
						message:   'Invalid return value for method "' + mid + '()".',
						line:      ref.line,
						column:    ref.column
					});


					method.values.push({
						type:  'undefined',
						value: undefined
					});

				} else if (values.length > 0) {

					if (/^(serialize|deserialize)$/g.test(mid) === false) {

						values.forEach(function(val) {

							if (val.type === 'undefined' && val.value === undefined) {

								let message = 'Unguessable return value for method "' + mid + '()".';
								let chunk   = (val.chunk || '').trim();

								if (chunk !== '') {
									message = 'Unguessable return value "' + chunk + '" for method "' + mid + '()".';
								}

								errors.push({
									url:       null,
									rule:      'unguessable-return-value',
									reference: mid,
									message:   message,
									line:      ref.line,
									column:    ref.column
								});

							}

						});

					}

				}

			}

		}

	};

	const _parse_properties = function(properties, stream, errors) {

		let i1 = stream.indexOf('\n\tconst Module = {');
		let i2 = stream.indexOf('\n\t};', i1);

		if (i1 !== -1 && i2 !== -1) {

			stream.substr(i1 + 18, i2 - i1 - 18).split('\n')
				.filter(function(line) {

					if (line.startsWith('\t\t')) {

						let tmp = line.substr(2);
						if (/^([A-Za-z0-9]+):\sfunction/g.test(tmp)) {
							return false;
						} else if (/^([A-Za-z0-9]+):\s/g.test(tmp)) {
							return true;
						}

					}


					return false;

				}).forEach(function(chunk) {

					if (chunk.endsWith(',')) {

						chunk = chunk.substr(0, chunk.length - 1);


						let tmp = chunk.split(':');
						if (tmp.length === 2) {

							let name = tmp[0].trim();
							let prop = _PARSER.detect(tmp[1].trim());

							if (
								properties[name] === undefined
								|| (
									properties[name].value.type === 'undefined'
									&& prop.type !== 'undefined'
								)
							) {

								properties[name] = {
									chunk: chunk,
									value: prop
								};

							}

						}

					} else if (chunk.endsWith('{')) {

						let tmp = chunk.split(':');
						if (tmp.length === 2) {

							let name = tmp[0].trim();
							let body = _find_property(name, stream);
							let prop = _PARSER.detect(body);

							if (
								properties[name] === undefined
								|| (
									properties[name].value.type === 'undefined'
									&& prop.type !== 'undefined'
								)
							) {

								properties[name] = {
									chunk: body,
									value: prop
								};

							}

						}

					}

				});

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	const Module = {

		// deserialize: function(blob) {},

		serialize: function() {

			return {
				'reference': 'strainer.api.Module',
				'arguments': []
			};

		},

		check: function(asset) {

			asset = _validate_asset(asset) === true ? asset : null;


			let errors = [];
			let memory = {};
			let result = {
				constructor: {},
				settings:    {},
				properties:  {},
				enums:       {},
				events:      {},
				methods:     {}
			};

			if (asset !== null) {

				let stream = asset.buffer.toString('utf8');

				_parse_memory(memory, stream, errors);
				_parse_methods(result.methods, stream, errors);
				_parse_properties(result.properties, stream, errors);


				if (
					result.methods['serialize'] === undefined
					|| result.methods['deserialize'] === undefined
				) {

					let ref = _find_reference('\n\tconst Module = {', stream);

					if (result.methods['serialize'] === undefined) {

						errors.push({
							url:       null,
							rule:      'no-serialize',
							reference: 'serialize',
							message:   'No "serialize()" method.',
							line:      ref.line,
							column:    ref.column
						});

					}

					if (result.methods['deserialize'] === undefined) {

						errors.push({
							url:       null,
							rule:      'no-deserialize',
							reference: 'deserialize',
							message:   'No "deserialize()" method.',
							line:      ref.line,
							column:    ref.column
						});

					}

				}

			}


			return {
				errors: errors,
				memory: memory,
				result: result
			};

		}

	};


	return Module;

});

