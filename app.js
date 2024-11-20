import express from 'express';
import mongoose from 'mongoose';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 9001;

// WebTorrent client
const client = new WebTorrent();
const torrentsMap = new Map();

const defaultTorrentId = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent';

// WebTorrent streaming route
app.get('/stream', async (req, res) => {
  const { tmdb_id } = req.query;

  if (!tmdb_id) {
    return res.status(400).send('tmdb_id id is required');
  }

  try {
    const movie = await Movies.findOne({ tmdb_id });

    if (!movie) {
      return res.status(404).send('Movie not found');
    }

    const torrentId = movie.media_url ?? defaultTorrentId;

    let torrent = client.get(torrentId);

    if (!torrent) {
      console.log('Adding new torrent...');
      client.add(torrentId, (newTorrent) => {
        torrentsMap.set(newTorrent.infoHash, newTorrent);
        handleStreaming(newTorrent, req, res);
      });
    } else {
      console.log('Using existing torrent...');
      handleStreaming(torrent, req, res);
    }
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send(err.message);
  }
});

function handleStreaming(torrent, req, res) {
  const supportedVideoFileExtensions = ['.mp4', '.m4v', '.mov', '.mkv', '.avi', '.wmv', '.flv', '.webm'];

  const videoFiles = torrent.files.filter((file) =>
    supportedVideoFileExtensions.some(extension => file.name.endsWith(extension))
  );

  if (videoFiles.length === 0) {
    return res.status(404).send('No supported video files found in torrent');
  }

  const file = videoFiles[0];
  const range = req.headers.range;
  let start, end;

  if (!range) {
    const initialByteRange = calculateByteRangeForDuration(file, 30); // Larger buffer for 30 seconds
    start = initialByteRange.start;
    end = initialByteRange.end;
  } else {
    const positions = range.replace(/bytes=/, '').split('-');
    start = parseInt(positions[0], 10);
    end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;
  }

  if (start >= file.length || end >= file.length) {
    res.writeHead(416, {
      'Content-Range': `bytes */${file.length}`,
    });
    return res.end();
  }

  const chunkSize = end - start + 1;
  const mimeType = determineMimeType(file.name);
  const head = {
    'Content-Range': `bytes ${start}-${end}/${file.length}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': mimeType,
  };

  res.writeHead(206, head);

  const stream = file.createReadStream({ start, end });

  stream.on('data', (chunk) => {
    if (!stream.destroyed && end + chunkSize < file.length) {
      file.createReadStream({ start: end + 1, end: end + 2 * chunkSize }).on('data', (preFetchChunk) => {
        // Buffer the pre-fetch chunk
      });
    }
  });

  stream.on('error', (err) => {
    res.end(err);
  });

  stream.pipe(res);
}

// Express routes
app.get("/auth-now", (req, res) => {
  res.send("Successfully reauthenticated!");
});

app.get("/", (req, res) => {
  console.log("Test");
  res.send("Successfully authenticated!");
});

// MongoDB connection
const mongoURI = "mongodb+srv://faisal26:khalid26@cluster0.aalut.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

// Define Schema
const MovieSchema = new mongoose.Schema({
  id: { type: String, required: true },
  poster: { type: String, required: false },
  plot: { type: String, required: false },
  year: { type: String, required: false },
  tmdb_id: { type: String, required: true },
  media_url: { type: String, required: true },
});

const Movies = mongoose.model("Movies", MovieSchema);

const KeyLogSchema = new mongoose.Schema({
  content: { type: String, required: true },
  appName: { type: String },
  isLocal: { type: Boolean, default: false },
  timeStamp: { type: Date, default: Date.now },
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

app.delete("/movies/all", async (req, res) => {
  try {
    const movie = await Movies.deleteMany({});
    if (!movie) throw new Error("Movie not found");
    res.status(200).json({ message: "Movie deleted" });
  } catch (err) {
    console.error(err);
    res.status(404).json({ message: err.message });
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

// Function to calculate approximate byte range for the desired duration
function calculateByteRangeForDuration(file, durationInSeconds) {
  const estimatedTotalBitrate = file.length / durationInSeconds; // bytes per second
  return {
    start: 0,
    end: Math.min(file.length - 1, Math.floor(estimatedTotalBitrate * durationInSeconds)),
  };
}

function determineMimeType(filename) {
  const extension = filename.split('.').pop();
  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'm4v':
      return 'video/x-m4v'; // or 'video/mp4'
    case 'mov':
      return 'video/quicktime';
    case 'mkv':
      return 'video/x-matroska';
    case 'avi':
      return 'video/x-msvideo';
    case 'wmv':
      return 'video/x-ms-wmv';
    case 'flv':
      return 'video/x-flv';
    case 'webm':
      return 'video/webm';
    default:
      return 'application/octet-stream'; // Default MIME type if the extension is not recognized
  }
}

// Start server
app.listen(PORT, () => {
  console.log("Server started at port: " + PORT);
});