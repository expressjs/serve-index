
var http = require('http');
var fs = require('fs');
var request = require('supertest');
var should = require('should');
var serveIndex = require('..');

describe('serveIndex(root)', function () {
  it('should require root', function () {
    serveIndex.should.throw(/root path required/)
  })

  it('should serve text/html without Accept header', function (done) {
    var server = createServer()

    request(server)
    .get('/')
    .expect('Content-Type', 'text/html')
    .expect(200, done)
  })

  it('should serve a directory index', function (done) {
    var server = createServer()

    request(server)
    .get('/')
    .expect(200, /todo\.txt/, done)
  })

  it('should work with HEAD requests', function (done) {
    var server = createServer()

    request(server)
    .head('/')
    .expect(200, '', done)
  })

  it('should work with OPTIONS requests', function (done) {
    var server = createServer()

    request(server)
    .options('/')
    .expect('Allow', 'GET, HEAD, OPTIONS')
    .expect(200, done)
  })

  it('should deny POST requests', function (done) {
    var server = createServer()

    request(server)
    .post('/')
    .expect(405, done)
  })

  it('should deny path will NULL byte', function (done) {
    var server = createServer()

    request(server)
    .get('/%00')
    .expect(400, done)
  })

  it('should deny path outside root', function (done) {
    var server = createServer()

    request(server)
    .get('/../')
    .expect(403, done)
  })

  it('should skip non-existent paths', function (done) {
    var server = createServer()

    request(server)
    .get('/bogus')
    .expect(404, 'Not Found', done)
  })

  it('should treat an ENAMETOOLONG as a 414', function (done) {
    var path = Array(11000).join('foobar')
    var server = createServer()

    request(server)
    .get('/' + path)
    .expect(414, done)
  })

  it('should skip non-directories', function (done) {
    var server = createServer()

    request(server)
    .get('/nums')
    .expect(404, 'Not Found', done)
  })

  describe('when given Accept: header', function () {
    describe('when Accept: application/json is given', function () {
      it('should respond with json', function (done) {
        var server = createServer()

        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(/g# %3 o %2525 %37 dir/)
        .expect(/users/)
        .expect(/file #1\.txt/)
        .expect(/nums/)
        .expect(/todo\.txt/)
        .expect(200, done)
      });
    });

    describe('when Accept: text/html is given', function () {
      it('should respond with html', function (done) {
        var server = createServer()

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect(/<a href="\/g%23%20%253%20o%20%252525%20%2537%20dir"/)
        .expect(/<a href="\/users"/)
        .expect(/<a href="\/file%20%231.txt"/)
        .expect(/<a href="\/todo.txt"/)
        .end(done);
      });

      it('should sort folders first', function (done) {
        var server = createServer()

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200)
        .expect('Content-Type', /html/)
        .end(function (err, res) {
          if (err) throw err;
          var urls = res.text.split(/<a href="([^"]*)"/).filter(function(s, i){ return i%2; });
          urls.should.eql([
            '/%23directory',
            '/g%23%20%253%20o%20%252525%20%2537%20dir',
            '/users',
            '/file%20%231.txt',
            '/foo%20bar',
            '/nums',
            '/todo.txt',
            '/%E3%81%95%E3%81%8F%E3%82%89.txt'
          ]);
          done();
        });
      });
    });

    describe('when Accept: text/plain is given', function () {
      it('should respond with text', function (done) {
        var server = createServer()

        request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect(200)
        .expect('Content-Type', /plain/)
        .expect(/users/)
        .expect(/g# %3 o %2525 %37 dir/)
        .expect(/file #1.txt/)
        .expect(/todo.txt/)
        .end(done);
      });
    });

    describe('when Accept: application/x-bogus is given', function () {
      it('should respond with 406', function (done) {
        var server = createServer()

        request(server)
        .get('/')
        .set('Accept', 'application/x-bogus')
        .expect(406, done)
      });
    });
  });

  describe('with "hidden" option', function () {
    it('should filter hidden files by default', function (done) {
      var server = createServer()

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)
        res.text.should.not.containEql('.hidden')
        done()
      });
    });

    it('should filter hidden files', function (done) {
      var server = createServer('test/fixtures', {'hidden': false})

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)
        res.text.should.not.containEql('.hidden')
        done()
      });
    });

    it('should not filter hidden files', function (done) {
      var server = createServer('test/fixtures', {'hidden': true})

      request(server)
      .get('/')
      .expect(200, /\.hidden/, done)
    });
  });

  describe('with "filter" option', function () {
    it('should custom filter files', function (done) {
      var seen = false
      var server = createServer('test/fixtures', {'filter': filter})

      function filter(name) {
        if (name.indexOf('foo') === -1) return true
        seen = true
        return false
      }

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)
        seen.should.be.true
        res.text.should.not.containEql('foo')
        done()
      });
    });

    it('should filter after hidden filter', function (done) {
      var seen = false
      var server = createServer('test/fixtures', {'filter': filter, 'hidden': false})

      function filter(name) {
        seen = seen || name.indexOf('.') === 0
        return true
      }

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)
        seen.should.be.false
        done()
      });
    });
  });

  describe('with "icons" option', function () {
    it('should include icons for html', function (done) {
      var server = createServer('test/fixtures', {'icons': true})

      request(server)
      .get('/')
      .expect(/data:image\/png/)
      .expect(/icon-default/)
      .expect(/icon-directory/)
      .expect(/icon-txt/)
      .expect(200, done)
    });
  });

  describe('when using custom handler', function () {
    describe('exports.html', function () {
      var orig = serveIndex.html
      after(function () {
        serveIndex.html = orig
      })

      it('should get called with Accept: text/html', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files) {
          res.setHeader('Content-Type', 'text/html');
          res.end('called');
        }

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, 'called', done)
      });

      it('should get file list', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files) {
          var text = files
            .filter(function (f) { return /\.txt$/.test(f) })
            .sort()
          res.setHeader('Content-Type', 'text/html')
          res.end('<b>' + text.length + ' text files</b>')
        }

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect(200, '<b>3 text files</b>', done)
      });

      it('should get dir name', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files, next, dir) {
          res.setHeader('Content-Type', 'text/html')
          res.end('<b>' + dir + '</b>')
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, '<b>/users/</b>', done)
      });

      it('should get template path', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files, next, dir, showUp, icons, path, view, template) {
          res.setHeader('Content-Type', 'text/html')
          res.end(String(fs.existsSync(template)))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, 'true', done)
      });

      it('should get template with tokens', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files, next, dir, showUp, icons, path, view, template) {
          res.setHeader('Content-Type', 'text/html')
          res.end(fs.readFileSync(template, 'utf8'))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(/{directory}/)
        .expect(/{files}/)
        .expect(/{linked-path}/)
        .expect(/{style}/)
        .expect(200, done)
      });

      it('should get stylesheet path', function (done) {
        var server = createServer()

        serveIndex.html = function (req, res, files, next, dir, showUp, icons, path, view, template, stylesheet) {
          res.setHeader('Content-Type', 'text/html')
          res.end(String(fs.existsSync(stylesheet)))
        }

        request(server)
        .get('/users/')
        .set('Accept', 'text/html')
        .expect(200, 'true', done)
      });
    });

    describe('exports.plain', function () {
      var orig = serveIndex.plain
      after(function () {
        serveIndex.plain = orig
      })

      it('should get called with Accept: text/plain', function (done) {
        var server = createServer()

        serveIndex.plain = function (req, res, files) {
          res.setHeader('Content-Type', 'text/plain');
          res.end('called');
        }

        request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect(200, 'called', done)
      });
    });

    describe('exports.json', function () {
      var orig = serveIndex.json
      after(function () {
        serveIndex.json = orig
      })

      it('should get called with Accept: application/json', function (done) {
        var server = createServer()

        serveIndex.json = function (req, res, files) {
          res.setHeader('Content-Type', 'application/json');
          res.end('"called"');
        }

        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect(200, '"called"', done)
      });
    });
  });

  describe('when navigating to other directory', function () {
    it('should respond with correct listing', function (done) {
      var server = createServer()

      request(server)
      .get('/users/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/<a href="\/users\/index.html"/)
      .expect(/<a href="\/users\/tobi.txt"/)
      .end(done);
    });

    it('should work for directory with #', function (done) {
      var server = createServer()

      request(server)
      .get('/%23directory/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/<a href="\/%23directory"/)
      .expect(/<a href="\/%23directory\/index.html"/)
      .end(done);
    });

    it('should work for directory with special chars', function (done) {
      var server = createServer()

      request(server)
      .get('/g%23%20%253%20o%20%252525%20%2537%20dir/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/<a href="\/g%23%20%253%20o%20%252525%20%2537%20dir"/)
      .expect(/<a href="\/g%23%20%253%20o%20%252525%20%2537%20dir\/empty.txt"/)
      .end(done);
    });

    it('should not work for outside root', function (done) {
      var server = createServer()

      request(server)
      .get('/../support/')
      .set('Accept', 'text/html')
      .expect(403, done);
    });
  });

  describe('when setting a custom template', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures', {'template': __dirname + '/shared/template.html'});
    });

    it('should respond with file list', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(/<a href="\/g%23%20%253%20o%20%252525%20%2537%20dir"/)
      .expect(/<a href="\/users"/)
      .expect(/<a href="\/file%20%231.txt"/)
      .expect(/<a href="\/todo.txt"/)
      .expect(200, done)
    });

    it('should respond with testing template sentence', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200, /This is the test template/, done)
    });

    it('should have default styles', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200, /ul#files/, done)
    });
  });

  describe('when setting a custom stylesheet', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures', {'stylesheet': __dirname + '/shared/styles.css'});
    });

    it('should respond with appropriate embedded styles', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/color: #00ff00;/)
      .end(done);
    });
  });

  describe('when set with trailing slash', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures/');
    });

    it('should respond with file list', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(/users/)
      .expect(/file #1\.txt/)
      .expect(/nums/)
      .expect(/todo\.txt/)
      .expect(200, done)
    });
  });

  describe('when set to \'.\'', function () {
    var server;
    before(function () {
      server = createServer('.');
    });

    it('should respond with file list', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(/LICENSE/)
      .expect(/public/)
      .expect(/test/)
      .expect(200, done)
    });

    it('should not allow serving outside root', function (done) {
      request(server)
      .get('/../')
      .set('Accept', 'text/html')
      .expect(403, done);
    });
  });
});

function createServer(dir, opts) {
  dir = dir || 'test/fixtures'

  var _serveIndex = serveIndex(dir, opts)

  return http.createServer(function (req, res) {
    _serveIndex(req, res, function (err) {
      res.statusCode = err ? (err.status || 500) : 404
      res.end(err ? err.message : 'Not Found')
    })
  })
}
