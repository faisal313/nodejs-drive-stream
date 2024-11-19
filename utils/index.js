
// Function to calculate approximate byte range for the desired duration
export function calculateByteRangeForDuration(file, durationInSeconds) {
  const estimatedTotalBitrate = file.length / durationInSeconds; // bytes per second
  return {
    start: 0,
    end: Math.min(file.length - 1, Math.floor(estimatedTotalBitrate * durationInSeconds)),
  };
}

export function determineMimeType(filename) {
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