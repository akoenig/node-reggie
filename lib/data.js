var path = require('path')
  , fs = require('fs')
  , tar = require('tar')
  , zlib = require('zlib')
  , crypto = require('crypto')
  , mkdirp = require('mkdirp')
  , rimraf = require('rimraf')
  , async = require('async')
  , readJson = require('read-package-json');

module.exports = Data;


function Data (opts) {
  opts = opts || {};

  // directories
  this._rootDir = opts.dataDirectory || path.join(process.cwd(), 'data');
  this._packagesDir = path.join(this._rootDir, 'packages');
  this._jsonDir = path.join(this._rootDir, 'json');
  this._tempDir = path.join(this._rootDir, 'temp');

  this._packageMap = {}
};

Data.prototype.init = function (callback) {
  var self = this;
  async.series([
    function (cb) { mkdirp(self._packagesDir, cb) },
    function (cb) { mkdirp(self._jsonDir, cb) },
    function (cb) { mkdirp(self._tempDir, cb) },
  ], callback);
}


//
// Load all package from the _packagesDir
//
Data.prototype.reloadPackages = function (callback) {
  var self = this;
  var concurrency = 25;

  var q = async.queue(function (file, cb) {
    self.loadPackage (file, cb);
  }, concurrency);

  fs.readdir(this._packagesDir, function (err, files) {
    files = (!files) ? [] : files.map(function(file) { return path.join(self._packagesDir, file) });
    if (files.length > 0)
      q.push(files);
    else
      callback.call();
  });

  if (callback) { q.drain = callback }
}

//
// Load a package from a path
// expectec=d name and version optional
//
Data.prototype.loadPackage = function (pathToPackage, expectedName, expectedVersion, callback) {
  var self = this;

  if (typeof expectedName === 'function') {
    callback = expectedName;
    expectedName = expectedVersion = undefined;
  }

  // make a temp directory to extract each package
  self._makeTempDir(function (err, dir) {
    if (err) {
      console.error("Data.loadPackage: Failed to make directory " + dir);
      throw err;
    }

    // unzip and extract
    fs.createReadStream(pathToPackage)
      .pipe(zlib.createGunzip())
      .on('error', function (err) {
        console.error("Data.loadPackage: Error unzipping package " + pathToPackage)
        return callback && callback.call(undefined, err);
      })
      .pipe(tar.Extract({ path: dir }))
      .on('error', function (err) {
        console.error("Data.loadPackage: Error untarring package " + pathToPackage)
        return callback && callback.call(undefined, err);
      })
      .on('end', function () { 
        var pJsonPath = path.join(dir, 'package/package.json');
        readJson(pJsonPath, function (err, pjsonData) {
          if (err) {
            console.error("Data.loadPackage: Error loading package.json " + pJsonPath + ' for ' + pathToPackage);
            return callback && callback.call(undefined, err);
          }

          // we don't need it anymore, destroy our temp directory out of band
          self._destroyDir(dir);

          // TODO do something with the package.json data
          var name = pjsonData.name;
          var version = pjsonData.version;
          var expectedPackagePath = path.join(self._packagesDir, name + '-' + version + '.tgz');

          // check that the packaged we received is what we expect
          if (expectedName && expectedVersion && (expectedName !== name || expectedVersion !== version)) {
            return callback(new Error("Package rejected, expected " + expectedName + "@" + expectedVersion 
                                      + ", received " + name + "@" + version));
          }

          // TODO: do this after writes confirmed
          self._registerPackage(pjsonData, expectedPackagePath);

          // is package under our _packagesDir?
          if (path.dirname(pathToPackage) === self._packagesDir) {
            // is it named as expected?
            if (expectedPackagePath === pathToPackage) {
              return callback && callback.call();
            }
            else {
              // move it
              return self._mv(pathToPackage, expectedPackagePath, callback);
            }
          }
          else {
            // copy it
            return self._cp(pathToPackage, expectedPackagePath, callback);
          }
        });
      })
  });
}

Data.prototype.openPackageStream = function (name, version, callback) {
  var pkg = this._packageMap[name];
  if (!pkg) return callback.call(undefined, new Error(name + " package not found"));
  var pkgVersion = pkg[version];
  if (!pkgVersion) return callback.call(undefined, new Error(name + "@" + version + " package not found"));
  var pathToPackage = pkgVersion.pathToPackage;
  if (!pathToPackage) return callback.call(undefined, new Error(name + "@" + version + " package missing"));
  callback.call(undefined, null, fs.createReadStream(pkgVersion.pathToPackage));
}


Data.prototype.whichVersions = function (name) {
  var pkg = this._packageMap[name];
  return (pkg) ? Object.keys(pkg) : [];
}

Data.prototype.index = function () {
  var self = this;
  var list = [];
  var pkgNames = Object.keys(self._packageMap);
  pkgNames.forEach(function (name) {
    var pkgVersions = Object.keys(self._packageMap[name]);
    pkgVersions.forEach(function(version) {
      var pkg = self._packageMap[name][version];
      list.push({
        name: pkg.data.name,
        version: pkg.data.version,
        description: pkg.data.description
      });      
    });
  });
  return list;
}

Data.prototype._registerPackage = function (pjsonData, pathToPackage) {
  var self = this;
  var name = pjsonData.name;
  var version = pjsonData.version;
  var pkg = self._packageMap[name] = self._packageMap[name] || {};
  pkg[version] = {
    data: pjsonData,
    pathToPackage: pathToPackage
  };
  console.log("Registered package " + name + "@" + version);
}

Data.prototype._makeTempDir = function (callback) {
  var size = 16;
  var self = this;
  crypto.randomBytes(size, function(ex, buf) {
    var dir = path.join(self._tempDir, buf.toString('hex'));
    mkdirp(this._packagesDir , function (err) { 
      callback (err, dir);
    });
  });
}

Data.prototype._destroyDir = function (dir, callback) {
  callback = callback || function (){}; 
  rimraf(dir, callback);
}

Data.prototype._cp = function (from, to, callback) {
  fs.createReadStream(from)
    .on('end', function () {
      return callback && callback.call();
    })
    .pipe(fs.createWriteStream(to))
    .on('error', callback);
}

Data.prototype._mv = function (from, to, callback) {
  fs.rename(from, to, callback);
}
