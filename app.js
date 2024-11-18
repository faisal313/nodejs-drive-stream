import WebTorrent from 'webtorrent';
import http  from 'http';

const client = new WebTorrent();

const torrentId =  'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent';

const PORT = 9001;

client.add(torrentId, (torrent) => {
  // Get the first file from the torrent
  const file = torrent.files[0];

  console.log(`Streaming file: ${file.name}`);

  // Start an HTTP server to serve the file
  const server = http.createServer((req, res) => {
    const range = req.headers.range;

    if (!range) {
      res.statusCode = 416;
      return res.end('Range header is required');
    }

    // Parse the range
    const positions = range.replace(/bytes=/, "").split("-");
    const start = parseInt(positions[0], 10);
    const end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;

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
  });

  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
})
