import express from "express";
const app = express();
import serveIndex from "./index.js";
const port = process.env.PORT || 3001;
app.use(
  express.static("./"),
  serveIndex("./", {
    icons: false,
    view: "details",
    stylesheet: "mocha"
  }),
);
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
