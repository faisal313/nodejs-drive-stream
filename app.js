import WebTorrent from 'webtorrent';
import http  from 'http';

const client = new WebTorrent();

const torrentId =  'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent';

const PORT = 9001;


// Function to calculate approximate byte range for the desired duration
// Assume constant bitrate for simplicity
function calculateByteRangeForDuration(file, durationInSeconds) {
  const estimatedTotalBitrate = file.length / durationInSeconds; // bytes per second
  return {
    start: 0,
    end: Math.min(file.length - 1, Math.floor(estimatedTotalBitrate * durationInSeconds))
  };
}

client.add(torrentId, (torrent) => {
  // Filter for MP4 files only
  const mp4Files = torrent.files.filter(file => file.name.endsWith('.mp4'));

  if (mp4Files.length === 0) {
    console.log('No MP4 files found in torrent');
    process.exit(1);
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

    stream.on('end', () => {
      // Close the server after streaming the file once
      server.close(() => {
        console.log('Server closed after streaming the file once');
      });
    });
  });

  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
});