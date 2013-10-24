Reggie 
======

[![Build Status](https://travis-ci.org/mbrevoort/node-reggie.png?branch=master)](https://travis-ci.org/mbrevoort/node-reggie)
[![NPM version](https://badge.fury.io/js/reggie.png)](http://badge.fury.io/js/reggie)

## Overview

Reggie is an experimental light weight alternative to a full blown npm registry. 

# Why?

NPM is amazing, but managing your own NPM registry should be easier. Wouldn't it be great if all you had to do
to set up your own private NPM registry was to install an NPM module and start it? In other words, you didn't have to
install and manage CouchDB, replicate from the public NPM repo, etc.? 

Reggie is currently an experiment. It currently supports:

* registering/uploading packages generated by `npm pack`
* installing packages through a tarbal NPM dependency convention 
* supports basic semver wildcards (1.1.x) and ranges
* a few basic routes to see what's registered
* flat file storage that's simple to back-up and restore
* [NEW] subset of NPM registry protocol (allowing `npm` to talk to node-reggie)

Here's what it doesn't do yet:

* authentication on publish
* searching for packages
* publish time metadata

Here's what it will never do

* authentication on package installs (GET /package/:name/:range)
* be fully API compatible with a proper NPM registry

Also, there aren't any tests yet. I know, I know, but this is an experiment... bear with me.


# Using Reggie

## Installation

Into a local directory:

    npm install reggie
    ./node_modules/.bin/reggie-server

Or globally (with data at ~/reggie):

    npm install -g reggie
    reggie-server -d ~/.reggie

## Publishing

If installed globally, from within the root directory of an NPM module:

	reggie -u http://<host:port> publish 
	reggie -u http://127.0.0.1:8080 publish 

The Reggie client just `npm packs` your module and `PUT`s it to `http://<host:post>/package/:name/:version`.

## Resolving Packages from Reggie

Whether you do `npm install` from the shell or resolve the package within the `dependencies` of 
a `package.json`, you specify the dependency as a tarball URL.

### A specific version

	npm install http://<host:port>/package/<name>/<version>
	npm install http://<host:port>/package/foo/1.0.0

In a `package.json`:

	dependencies: {
		"foo": "http://<host:port>/package/foo/1.0.0"
	}


### Wildcard version

	http://<host:port>/package/foo/1.0.x
	http://<host:port>/package/foo/1.0
	http://<host:port>/package/foo/1
	http://<host:port>/package/foo/x
	http://<host:port>/package/foo/latest


### Ranges

By convention, Reggie understands URLs with `gt` (>), `gte` (>=), `lt' (<), and `lte` (<=), for example:

	http://<host:port>/package/foo/lt/2.0              # less than 2.0
	http://<host:port>/package/foo/lte/1.9             # less than or equal 1.9
	http://<host:port>/package/foo/lt/2/gt/1           # less than 2 (2.0, 2.0.0) and greater than 1 (1.0,1.0.0)
	http://<host:port>/package/foo/lt/2.0.0/gte/1.0.0  # less than 2.0.0 and greater than 1.0.0
	http://<host:port>/package/foo/gte/1.5.0           # greater than 1.5.0
	http://<host:port>/package/foo/gt/1.5.0/lte/4.0    # less than 4.0


## Start-up options

You can see the available options with `reggie-server -h`

	-d, --data  Directory to store Reggie's data  [default: <cwd>/data]
	-p, --port  Reggie's a good listener. What port should I listen on?  [default: 8080]
	-h, --host  Which host should Reggie listen on? [default: '0.0.0.0']
	-u, --url   URL where `npm` can access registry (usually http://{hostname}:{port}/)


When Reggie starts up, it will reparse all of the packages in it's data directory and reload it's metadata. So this means you can seed Reggie with a bunch of NPM module tarballs if you want by copying them to `<--data>/packages`. With many modules, Reggie will be slow to start-up. I expect this to be optimized in the future. Also in the future may be auto detection of new modules if they are simply copied into the packages directory.


## Other routes

Returns a JSON array of all known packages and versions:

	GET http://<host:port>/index

Returns JSON array of known versions for a particular module name:

	GET http://<host:port>/versions/:name

Delete a package:

	DELETE http://<host:port>/package/:name/:version

## Using Reggie with `npm` client

Reggie implements a subset of npm registry API to support basic operations
like publish, search, show and download.

### Publishing

There are two ways how to publish a module to a different registry.

* The safest way is to edit your package.json file and add a following line:

		"publishConfig": { "registry": "http://reggie-url/" }

  This way the package will be always published to our private repository.

* The alternative option is to specify the registry URL on command-line:

		npm --registry=http://reggie-url/ publish

### Installing

	# in application
	npm --registry=http://reggie-url/ search my-private-pkg
	npm --registry=http://reggie-url/ install my-private-pkg

Unfortunately `npm` client does not really support multiple registries
(e.g. private and public), therefore you can't mix public and private
packages in package.json dependencies.

There are plans to add multi-registry support to `npm`. Until then you
have to use a different method for maintaining your dependencies
(e.g. as described previous sections).

# What's Next?

I would love your feedback! Like I said in the beginning, this is somewhat of an experiment at this point but I'm optimistic that Reggie could materialize into a useful lightweight alternative to servicing up private packages to NPM. Create issues in this repo or hit me up on Twitter @mbrevoort.

# License

Copyright (c) 2012 Mike Brevoort

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

