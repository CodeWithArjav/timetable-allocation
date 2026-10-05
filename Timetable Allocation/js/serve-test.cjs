const http = require("http"),
  fs = require("fs"),
  path = require("path");
const ROOT = path.join(__dirname, "HTML");
http
  .createServer((q, s) => {
    let p = decodeURIComponent(q.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) {
      s.writeHead(403);
      s.end();
      return;
    }
    fs.readFile(f, (e, d) => {
      if (e) {
        s.writeHead(404);
        s.end("nf");
        return;
      }
      const t =
        { ".js": "text/javascript", ".css": "text/css", ".html": "text/html" }[
          path.extname(f)
        ] || "text/plain";
      s.writeHead(200, { "Content-Type": t });
      s.end(d);
    });
  })
  .listen(8791, () => console.log("serving on 8791"));
