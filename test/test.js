
process.env.NODE_ENV = 'test';

var connect = require('connect');
var request = require('supertest');
var serveIndex = require('..');

describe('directory()', function(){
  describe('when given Accept: header', function () {
    var server;
    before(function () {
      server = createServer();
    });
    after(function (done) {
      server.close(done);
    });

    describe('when Accept: application/json is given', function () {
      it('should respond with json', function (done) {
        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(function (err, res) {
          if (err) throw err;
          res.body.should.include('g# %3 o %2525 %37 dir');
          res.body.should.include('users');
          res.body.should.include('file #1.txt');
          res.body.should.include('nums');
          res.body.should.include('todo.txt');
          done();
        });
      });

      it('should support custom handler', function (done) {
        var orig = serveIndex.json;

        serveIndex.json = function (req, res, files) {
          var text = files
            .filter(function (f) { return /\.txt$/.test(f); })
            .sort();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ text: text }));
          serveIndex.json = orig;
        };

        request(server)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, '{"text":["file #1.txt","todo.txt"]}', done);
      });
    });

    describe('when Accept: text/html is given', function () {
      it('should respond with html', function (done) {
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
          ]);
          done();
        });
      });

      it('should support custom handler', function (done) {
        var orig = serveIndex.html;

        serveIndex.html = function (req, res, files) {
          var text = files
            .filter(function (f) { return /\.txt$/.test(f); })
            .sort();
          res.setHeader('Content-Type', 'text/html');
          res.end('<b>' + text.length + ' text files</b>');
          serveIndex.html = orig;
        };

        request(server)
        .get('/')
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(200, '<b>2 text files</b>', done);
      });
    });

    describe('when Accept: text/plain is given', function () {
      it('should respond with text', function (done) {
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

      it('should support custom handler', function (done) {
        var orig = serveIndex.plain;

        serveIndex.plain = function (req, res, files) {
          var text = files
            .filter(function (f) { return /\.txt$/.test(f); })
            .sort();
          res.setHeader('Content-Type', 'text/plain');
          res.end(text.join('\n'));
          serveIndex.plain = orig;
        };

        request(server)
        .get('/')
        .set('Accept', 'text/plain')
        .expect('Content-Type', /plain/)
        .expect(200, 'file #1.txt\ntodo.txt', done);
      });
    });
  });

  describe('when navigating to other directory', function () {
    var server;
    before(function () {
      server = createServer();
    });
    after(function (done) {
      server.close(done);
    });

    it('should respond with correct listing', function (done) {
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
    after(function (done) {
      server.close(done);
    });

    it('should respond with file list and testing template sentence', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'text/html')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/<a href="\/g%23%20%253%20o%20%252525%20%2537%20dir"/)
      .expect(/<a href="\/users"/)
      .expect(/<a href="\/file%20%231.txt"/)
      .expect(/<a href="\/todo.txt"/)
      .expect(/This is the test template/)
      .end(done);
    });
  });

  describe('when setting a custom stylesheet and a custom template', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures', {
        'stylesheet': __dirname + '/shared/styles.css',
        'template': __dirname + '/shared/template.html'
      });
    });
    after(function (done) {
      server.close(done);
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

  describe('when setting a custom stylesheet', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures', {
        'stylesheet': __dirname + '/shared/styles.css'
      });
    });
    after(function (done) {
      server.close(done);
    });
    it('should respond with appropriate style sheet', function (done) {
      request(server)
      .get('/?get=text%2Fcss')
      .set('Accept', 'text/html')
      .expect(200)
      .expect(/color: #00ff00;/)
      .end(done);
    });
  });

  describe('when set with trailing slash', function () {
    var server;
    before(function () {
      server = createServer('test/fixtures/');
    });
    after(function (done) {
      server.close(done);
    });

    it('should respond with file list', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) throw err;
        res.body.should.include('users');
        res.body.should.include('file #1.txt');
        res.body.should.include('nums');
        res.body.should.include('todo.txt');
        done();
      });
    });
  });

  describe('when set to \'.\'', function () {
    var server;
    before(function () {
      server = createServer('.');
    });
    after(function (done) {
      server.close(done);
    });

    it('should respond with file list', function (done) {
      request(server)
      .get('/')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function (err, res) {
        if (err) throw err;
        res.body.should.include('LICENSE');
        res.body.should.include('public');
        res.body.should.include('test');
        done();
      });
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
  var app = connect();
  dir = dir || 'test/fixtures';
  app.use(serveIndex(dir, opts));
  return app.listen();
}
