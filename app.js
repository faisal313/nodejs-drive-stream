import express from 'express';
import mongoose from 'mongoose';
import WebTorrent from 'webtorrent';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 9001;

// Configure WebTorrent client
const client = new WebTorrent({
  dht: true,
  tracker: true,
  maxConns: 100 // Increase max connections for better peer management
});

const torrentsMap = new Map();

const defaultTorrentId = 'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent';

// MongoDB setup (make sure to set up `Movies` schema accordingly)
// ...

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
        prioritizePeers(newTorrent);
        handleStreaming(newTorrent, req, res);
      });
    } else {
      console.log('Using existing torrent...');
      prioritizePeers(torrent);
      handleStreaming(torrent, req, res);
    }
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send(err.message);
  }
});

// Function to prioritize peers and manage connections
function prioritizePeers(torrent) {
  torrent.on('wire', (wire) => {
    console.log(`Connected to peer ${wire.remoteAddress}`);
    // Prioritize rare pieces to ensure smooth playback
    wire.use(PrioritizeRarePieces());
  });
}

// WebTorrent extension to prioritize rare pieces
function PrioritizeRarePieces() {
  return function (wire) {
    wire.on('download', function (index) {
      console.log(`Piece ${index} downloaded`);
      wire.priority(index); // Increase priority for the downloaded piece
    });
  }
}

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
    start = 0;
    end = Math.min(file.length - 1, 10 * 1024 * 1024); // First 10MB as default buffer
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

  // Pre-fetch logic for buffering ahead
  stream.on('end', () => {
    if (end < file.length - 1) {
      const prefetchStart = end + 1;
      const prefetchEnd = Math.min(file.length - 1, end + 10 * 1024 * 1024); // Next 10MB chunk
      file.createReadStream({ start: prefetchStart, end: prefetchEnd }).on('data', () => {
        // Pre-fetch buffer
      }).on('error', (err) => {
        console.error('Pre-fetch error:', err.message);
      });
    }
  });

  stream.on('error', (err) => {
    res.end(err);
  });

  stream.pipe(res);
}

function determineMimeType(filename) {
  const ext = filename.split('.').pop();
  const mimeTypes = {
    mp4: 'video/mp4',
    m4v: 'video/x-m4v',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
